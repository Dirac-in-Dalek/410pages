-- Additive migration: preserve the old numeric positions and every content field.
-- Apply before the new app; old clients attempting numeric-only placement must reload.
alter table public.citations add column if not exists order_key text collate "C";
alter table public.chapter_blocks add column if not exists order_key text collate "C";

create or replace function public.book_legacy_order_key(value double precision)
returns text language plpgsql immutable strict set search_path = '' as $$
declare bytes bytea; i integer; negative boolean;
begin
  if not (value > '-Infinity'::double precision and value < 'Infinity'::double precision) then
    raise exception 'Invalid legacy book position';
  end if;
  if value = 0 then value := 0; end if;
  bytes := pg_catalog.float8send(value);
  negative := get_byte(bytes, 0) >= 128;
  if negative then
    for i in 0..7 loop bytes := set_byte(bytes, i, 255 - get_byte(bytes, i)); end loop;
  else
    bytes := set_byte(bytes, 0, get_byte(bytes, 0) # 128);
  end if;
  return 'a0' || encode(bytes, 'hex') || 'V';
end $$;

-- Do not guess a new order for legacy ties. Resolve any preflight ties explicitly.
do $$
begin
  if exists (
    select 1 from (
      select user_id, book_id, coalesce(created_at_sort, floor(extract(epoch from created_at) * 1000)::double precision) as pos
        from public.citations where book_id is not null and order_key is null
      union all
      select user_id, book_id, created_at_sort from public.chapter_blocks where order_key is null
    ) legacy group by user_id, book_id, pos having count(*) > 1
  ) then raise exception 'Legacy book position ties require review before migration'; end if;
end $$;

update public.citations set order_key = public.book_legacy_order_key(
  coalesce(created_at_sort, floor(extract(epoch from created_at) * 1000)::double precision))
where book_id is not null and order_key is null;
update public.chapter_blocks set order_key = public.book_legacy_order_key(created_at_sort)
where order_key is null;

create or replace function public.book_order_key_is_valid(value text)
returns boolean language plpgsql immutable strict set search_path = '' as $$
declare integer_length integer; head integer;
begin
  if value !~ '^[A-Za-z][0-9A-Za-z]+$' then return false; end if;
  head := ascii(left(value, 1));
  integer_length := case when head >= 97 then head - 95 else 92 - head end;
  if length(value) < integer_length then return false; end if;
  if value = 'A' || repeat('0', 26) then return false; end if;
  return length(value) = integer_length or right(value, 1) <> '0';
end $$;

-- Hash indexes keep long variable-length keys out of PostgreSQL's B-tree tuple limit.
-- A hash collision fails safely; it never substitutes a different ordering value.
create unique index if not exists citations_book_order_unique
  on public.citations (book_id, md5(order_key)) where book_id is not null;
create unique index if not exists chapters_book_order_unique
  on public.chapter_blocks (book_id, md5(order_key));

create or replace function public.guard_book_order_key()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.book_id is null then
    new.order_key := null;
    return new;
  end if;
  if auth.uid() is null or new.user_id <> auth.uid() or not exists (
    select 1 from public.books where id = new.book_id and user_id = auth.uid()
  ) then raise exception 'Book access denied' using errcode = '42501'; end if;
  if new.order_key is null or not public.book_order_key_is_valid(new.order_key) then
    raise exception 'Book order format changed; reload before saving' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' then
    if new.created_at_sort is distinct from old.created_at_sort and new.order_key is not distinct from old.order_key then
      raise exception 'Book order format changed; reload before moving' using errcode = '22023';
    end if;
    if new.book_id = old.book_id and new.order_key = old.order_key then return new; end if;
  end if;
  -- Supabase Data API uses READ COMMITTED. Serialize cross-table key checks per book.
  perform pg_advisory_xact_lock(hashtextextended(new.book_id::text, 0));
  if exists (select 1 from public.citations
    where book_id = new.book_id and md5(order_key) = md5(new.order_key) and order_key = new.order_key
      and (tg_table_name <> 'citations' or id <> new.id))
    or exists (select 1 from public.chapter_blocks
    where book_id = new.book_id and md5(order_key) = md5(new.order_key) and order_key = new.order_key
      and (tg_table_name <> 'chapter_blocks' or id <> new.id)) then
    raise exception 'Duplicate book order key' using errcode = '23505', constraint = 'book_order_key_unique';
  end if;
  return new;
end $$;

drop trigger if exists guard_book_order_key on public.citations;
create trigger guard_book_order_key before insert or update on public.citations
for each row execute function public.guard_book_order_key();
drop trigger if exists guard_book_order_key on public.chapter_blocks;
create trigger guard_book_order_key before insert or update on public.chapter_blocks
for each row execute function public.guard_book_order_key();

revoke all on function public.guard_book_order_key() from public;
revoke all on function public.book_order_key_is_valid(text) from public;
grant execute on function public.book_order_key_is_valid(text) to authenticated;
revoke all on function public.book_legacy_order_key(double precision) from public;
-- Migration-only mapping helper is not a client mutation endpoint.

-- The entire bulk source change remains one transaction, with per-item destination keys.
create or replace function public.bulk_update_citation_source(
  expected_user_id uuid,
  citation_ids uuid[],
  destination_author_id uuid,
  destination_book_id uuid,
  destination_order_keys jsonb,
  expected_positions jsonb
) returns table(id uuid, order_key text)
language plpgsql security invoker set search_path = '' as $$
declare expected_count integer;
begin
  if auth.uid() is null or expected_user_id is distinct from auth.uid() then
    raise exception 'Source update access denied' using errcode = '42501';
  end if;
  expected_count := cardinality(citation_ids);
  if expected_count is null or expected_count = 0
     or expected_count <> (select count(distinct value) from unnest(citation_ids) value)
     or jsonb_typeof(destination_order_keys) is distinct from 'object'
     or expected_count <> (select count(*) from jsonb_object_keys(destination_order_keys))
     or not (destination_order_keys ?& array(select value::text from unnest(citation_ids) value)) then
    raise exception 'Invalid source update positions' using errcode = '22023';
  end if;
  if not exists (select 1 from public.authors where authors.id=destination_author_id and user_id=auth.uid())
    or (destination_book_id is not null and not exists (
      select 1 from public.books where books.id=destination_book_id and user_id=auth.uid() and author_id=destination_author_id
    )) then raise exception 'Source update destination denied' using errcode = '42501'; end if;
  perform 1 from public.citations c where c.id=any(citation_ids) and c.user_id=auth.uid() order by c.id for update;
  if expected_count <> (select count(*) from public.citations c where c.id=any(citation_ids) and c.user_id=auth.uid()) then
    raise exception 'Source update items changed' using errcode = '42501';
  end if;
  if expected_positions is null or exists (
    select 1 from public.citations c where c.id=any(citation_ids) and c.user_id=auth.uid()
      and jsonb_build_object('book_id',c.book_id,'order_key',c.order_key) is distinct from (expected_positions -> c.id::text)
  ) then raise exception 'Citation positions changed; reload' using errcode='40001'; end if;
  if exists(select 1 from jsonb_each(destination_order_keys) kv where
    (destination_book_id is null and kv.value <> 'null'::jsonb)
    or (destination_book_id is not null and (jsonb_typeof(kv.value) <> 'string' or not public.book_order_key_is_valid(kv.value #>> '{}')))
  ) then raise exception 'Invalid source update key' using errcode='22023'; end if;
  return query update public.citations c
    set author_id=destination_author_id, book_id=destination_book_id,
        order_key=destination_order_keys ->> c.id::text
    where c.id=any(citation_ids) and c.user_id=auth.uid()
    returning c.id,c.order_key;
end $$;
revoke all on function public.bulk_update_citation_source(uuid,uuid[],uuid,uuid,jsonb,jsonb) from public;
grant execute on function public.bulk_update_citation_source(uuid,uuid[],uuid,uuid,jsonb,jsonb) to authenticated;
