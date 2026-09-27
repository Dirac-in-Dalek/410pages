-- 1. UUID 확장 설치
create extension if not exists "uuid-ossp";

-- 2. PROFILES 테이블 생성
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_path text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table profiles add column if not exists avatar_path text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists preferences jsonb;

alter table profiles enable row level security;

-- PROFILES 정책 (이미 존재할 경우를 대비해 DO 블록 사용)
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own profile') then
    create policy "Users can view their own profile" on profiles for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update their own profile') then
    create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own profile') then
    create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
  end if;
end $$;

-- 3. 회원가입 시 프로필 자동 생성 함수 (덮어쓰기 가능)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');

  insert into public.authors (name, user_id, is_self)
  values (new.raw_user_meta_data->>'username', new.id, true);

  return new;
end;
$$ language plpgsql security definer
set search_path = '';

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 4. 트리거 설정 (삭제 후 재생성으로 충돌 방지)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. AUTHORS 테이블
create table if not exists authors (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  is_self boolean default false not null,
  sort_index integer default 0 not null,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table authors enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can crud their own authors') then
    create policy "Users can crud their own authors" on authors for all using (auth.uid() = user_id);
  end if;
end $$;

-- 6. BOOKS 테이블
create table if not exists books (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  author_id uuid references authors(id) on delete cascade not null,
  sort_index integer default 0 not null,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table books enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can crud their own books') then
    create policy "Users can crud their own books" on books for all using (auth.uid() = user_id);
  end if;
end $$;

-- 7. CITATIONS 테이블
create table if not exists citations (
  id uuid default uuid_generate_v4() primary key,
  kind text not null default 'sentence',
  text text not null,
  book_id uuid references books(id) on delete cascade, 
  page text,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
  -- constraint fk_book foreign key (book_id) references books(id)
);

alter table citations enable row level security;

alter table citations add column if not exists created_at_sort double precision
  constraint citations_created_at_sort_finite
  check (created_at_sort > '-Infinity'::double precision and created_at_sort < 'Infinity'::double precision);

alter table citations add column if not exists kind text not null default 'sentence';
alter table citations drop constraint if exists citations_kind_check;
alter table citations add constraint citations_kind_check check (kind in ('sentence', 'word'));

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can crud their own citations') then
    create policy "Users can crud their own citations" on citations for all using (auth.uid() = user_id);
  end if;
end $$;

-- 7.1 CHAPTER BLOCKS 테이블
create table if not exists chapter_blocks (
  id uuid default uuid_generate_v4() primary key,
  book_id uuid references books(id) on delete cascade not null,
  label text not null,
  depth integer not null default 0 constraint chapter_blocks_depth_nonnegative check (depth >= 0),
  page_sort double precision,
  created_at_sort double precision not null,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table chapter_blocks enable row level security;

drop policy if exists "Users can crud their own chapter_blocks" on chapter_blocks;
create policy "Users can crud their own chapter_blocks" on chapter_blocks for all using (auth.uid() = user_id);

-- CITATIONS highlights 컬럼 추가
ALTER TABLE citations ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]';

-- 8. PROJECTS 테이블
create table if not exists projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  sort_index integer default 0 not null,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 기존 스키마 호환용 컬럼 보정
alter table authors add column if not exists is_self boolean default false not null;
alter table authors add column if not exists sort_index integer default 0 not null;
alter table books add column if not exists sort_index integer default 0 not null;
alter table projects add column if not exists sort_index integer default 0 not null;

alter table projects enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can crud their own projects') then
    create policy "Users can crud their own projects" on projects for all using (auth.uid() = user_id);
  end if;
end $$;

-- 9. PROJECT_CITATIONS (Many-to-Many 연결 테이블)
create table if not exists project_citations (
  project_id uuid references projects(id) on delete cascade,
  citation_id uuid references citations(id) on delete cascade,
  primary key (project_id, citation_id)
);

alter table project_citations enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can crud project_citations if they own the project') then
    create policy "Users can crud project_citations if they own the project" on project_citations
      for all using (
        exists (
          select 1 from projects 
          where id = project_citations.project_id 
          and user_id = auth.uid()
        )
      );
  end if;
end $$;

-- 10. NOTES 테이블
create table if not exists notes (
  id uuid default uuid_generate_v4() primary key,
  citation_id uuid references citations(id) on delete cascade not null,
  content text not null,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table notes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can crud their own notes') then
    create policy "Users can crud their own notes" on notes for all using (auth.uid() = user_id);
  end if;
end $$;

-- 11. 이메일 중복 확인 함수
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = email_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.check_email_exists(text) FROM PUBLIC, anon, authenticated;

-- 12. PROFILE AVATAR STORAGE
insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Public can view profile avatars') then
    create policy "Public can view profile avatars" on storage.objects
      for select using (bucket_id = 'profile-avatars');
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can upload their own profile avatars') then
    create policy "Users can upload their own profile avatars" on storage.objects
      for insert with check (
        bucket_id = 'profile-avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can update their own profile avatars') then
    create policy "Users can update their own profile avatars" on storage.objects
      for update using (
        bucket_id = 'profile-avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own profile avatars') then
    create policy "Users can delete their own profile avatars" on storage.objects
      for delete using (
        bucket_id = 'profile-avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

-- String book positions: canonical migration definitions.
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

-- Preserve existing atomic book/author merges when two books contain equal keys.
-- Only colliding transferred rows receive a new key; all legacy/content fields stay intact.
create or replace function public.book_order_key_after(lower_key text, upper_key text default null)
returns text language plpgsql immutable security invoker set search_path = '' as $$
declare
  digits constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  suffix text;
  zero_count integer := 0;
  digit_index integer;
begin
  if lower_key is null or not public.book_order_key_is_valid(lower_key)
    or (upper_key is not null and (not public.book_order_key_is_valid(upper_key)
      or lower_key collate "C" >= upper_key collate "C")) then
    raise exception 'Invalid book order interval' using errcode = '22023';
  end if;
  if upper_key is null or left(upper_key, length(lower_key)) <> lower_key then
    return lower_key || 'V';
  end if;
  suffix := substr(upper_key, length(lower_key) + 1);
  while substr(suffix, zero_count + 1, 1) = '0' loop
    zero_count := zero_count + 1;
  end loop;
  digit_index := strpos(digits, substr(suffix, zero_count + 1, 1)) - 1;
  return lower_key || repeat('0', zero_count) || case
    when digit_index = 1 then '0V'
    else substr(digits, digit_index / 2 + 1, 1)
  end;
end $$;

create or replace function public.adjust_transferred_book_order_key()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare next_key text; locked_book uuid;
begin
  if old.book_id is null or new.book_id is null or new.book_id = old.book_id
    or new.order_key is distinct from old.order_key then return new; end if;
  if auth.uid() is null or new.user_id <> auth.uid() or not exists (
    select 1 from public.books where id = new.book_id and user_id = auth.uid()
  ) then raise exception 'Book access denied' using errcode = '42501'; end if;
  -- Use the same lock namespace as the canonical key guard, in deterministic order.
  for locked_book in select unnest(array[old.book_id, new.book_id]) order by 1 loop
    perform pg_advisory_xact_lock(hashtextextended(locked_book::text, 0));
  end loop;
  if exists (select 1 from public.citations where book_id = new.book_id and order_key = new.order_key)
    or exists (select 1 from public.chapter_blocks where book_id = new.book_id and order_key = new.order_key) then
    select min(order_key collate "C") into next_key from (
      select order_key from public.citations where book_id in (old.book_id, new.book_id)
      union all
      select order_key from public.chapter_blocks where book_id in (old.book_id, new.book_id)
    ) items where order_key collate "C" > new.order_key collate "C";
    new.order_key := public.book_order_key_after(new.order_key, next_key);
  end if;
  return new;
end $$;

-- PostgreSQL runs same-kind triggers alphabetically: adjust before guard_book_order_key.
drop trigger if exists adjust_transferred_book_order_key on public.citations;
create trigger adjust_transferred_book_order_key before update on public.citations
for each row execute function public.adjust_transferred_book_order_key();
drop trigger if exists adjust_transferred_book_order_key on public.chapter_blocks;
create trigger adjust_transferred_book_order_key before update on public.chapter_blocks
for each row execute function public.adjust_transferred_book_order_key();

revoke all on function public.book_order_key_after(text, text) from public, anon;
grant execute on function public.book_order_key_after(text, text) to authenticated;
revoke all on function public.adjust_transferred_book_order_key() from public, anon;

create or replace function public.rename_or_merge_book(
  source_book_id uuid,
  requested_title text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_title text := btrim(requested_title);
  source_book public.books%rowtype;
  target_book public.books%rowtype;
  merged_memo text;
begin
  if current_user_id is null or normalized_title = '' then
    raise exception 'Invalid book rename' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('410pages:book-rename:' || current_user_id::text, 0)
  );

  select * into strict source_book
  from public.books
  where id = source_book_id and user_id = current_user_id
  for update;

  if btrim(source_book.title) = normalized_title then
    update public.books
    set title = normalized_title
    where id = source_book.id and user_id = current_user_id;

    return jsonb_build_object(
      'merged', false,
      'fromBookId', source_book.id,
      'bookId', source_book.id,
      'bookTitle', normalized_title,
      'bookSortIndex', source_book.sort_index,
      'bookMemo', source_book.memo
    );
  end if;

  select * into target_book
  from public.books
  where user_id = current_user_id
    and author_id = source_book.author_id
    and id <> source_book.id
    and btrim(title) = normalized_title
  order by created_at, id
  limit 1
  for update;

  if not found then
    update public.books
    set title = normalized_title
    where id = source_book.id and user_id = current_user_id;

    return jsonb_build_object(
      'merged', false,
      'fromBookId', source_book.id,
      'bookId', source_book.id,
      'bookTitle', normalized_title,
      'bookSortIndex', source_book.sort_index,
      'bookMemo', source_book.memo
    );
  end if;

  merged_memo := case
    when btrim(target_book.memo) = '' then source_book.memo
    when btrim(source_book.memo) = '' then target_book.memo
    when btrim(target_book.memo) = btrim(source_book.memo) then target_book.memo
    else target_book.memo || E'\n\n---\n\n' || source_book.memo
  end;

  update public.books
  set memo = merged_memo
  where id = target_book.id and user_id = current_user_id;

  update public.citations
  set book_id = target_book.id
  where user_id = current_user_id and book_id = source_book.id;

  update public.chapter_blocks
  set book_id = target_book.id
  where user_id = current_user_id and book_id = source_book.id;

  delete from public.books
  where id = source_book.id and user_id = current_user_id;

  return jsonb_build_object(
    'merged', true,
    'fromBookId', source_book.id,
    'bookId', target_book.id,
    'bookTitle', target_book.title,
    'bookSortIndex', target_book.sort_index,
    'bookMemo', merged_memo,
    'citationOrderKeys', (select coalesce(jsonb_object_agg(id::text, order_key), '{}'::jsonb)
      from public.citations where book_id = target_book.id and user_id = current_user_id),
    'chapterOrderKeys', (select coalesce(jsonb_object_agg(id::text, order_key), '{}'::jsonb)
      from public.chapter_blocks where book_id = target_book.id and user_id = current_user_id)
  );
end;
$$;

create or replace function public.rename_or_merge_author(
  source_author_id uuid,
  requested_name text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := btrim(requested_name);
  source_author public.authors%rowtype;
  target_author public.authors%rowtype;
  source_book public.books%rowtype;
  target_book public.books%rowtype;
  merged_memo text;
  book_merges jsonb := '[]'::jsonb;
begin
  if current_user_id is null or normalized_name = '' then
    raise exception 'Invalid author rename' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('410pages:author-rename:' || current_user_id::text, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('410pages:book-rename:' || current_user_id::text, 0)
  );

  select * into strict source_author
  from public.authors
  where id = source_author_id and user_id = current_user_id
  for update;

  if btrim(source_author.name) = normalized_name then
    update public.authors
    set name = normalized_name
    where id = source_author.id and user_id = current_user_id;

    return jsonb_build_object(
      'merged', false,
      'fromAuthorId', source_author.id,
      'authorId', source_author.id,
      'authorName', normalized_name,
      'authorSortIndex', source_author.sort_index,
      'isSelf', source_author.is_self,
      'bookMerges', book_merges
    );
  end if;

  select * into target_author
  from public.authors
  where user_id = current_user_id
    and id <> source_author.id
    and btrim(name) = normalized_name
  order by created_at, id
  limit 1
  for update;

  if not found then
    update public.authors
    set name = normalized_name
    where id = source_author.id and user_id = current_user_id;

    return jsonb_build_object(
      'merged', false,
      'fromAuthorId', source_author.id,
      'authorId', source_author.id,
      'authorName', normalized_name,
      'authorSortIndex', source_author.sort_index,
      'isSelf', source_author.is_self,
      'bookMerges', book_merges
    );
  end if;

  if target_author.is_self or exists (
    select 1 from public.author_folder_memberships
    where author_id = target_author.id and user_id = current_user_id
  ) then
    delete from public.author_folder_memberships
    where author_id = source_author.id and user_id = current_user_id;
  else
    update public.author_folder_memberships
    set author_id = target_author.id
    where author_id = source_author.id and user_id = current_user_id;
  end if;

  for source_book in
    select * from public.books
    where user_id = current_user_id and author_id = source_author.id
    order by created_at, id
    for update
  loop
    select * into target_book
    from public.books
    where user_id = current_user_id
      and author_id = target_author.id
      and btrim(title) = btrim(source_book.title)
    order by created_at, id
    limit 1
    for update;

    if found then
      merged_memo := case
        when btrim(target_book.memo) = '' then source_book.memo
        when btrim(source_book.memo) = '' then target_book.memo
        when btrim(target_book.memo) = btrim(source_book.memo) then target_book.memo
        else target_book.memo || E'\n\n---\n\n' || source_book.memo
      end;

      update public.books
      set memo = merged_memo
      where id = target_book.id and user_id = current_user_id;

      update public.citations
      set book_id = target_book.id
      where user_id = current_user_id and book_id = source_book.id;

      update public.chapter_blocks
      set book_id = target_book.id
      where user_id = current_user_id and book_id = source_book.id;

      delete from public.books
      where id = source_book.id and user_id = current_user_id;

      book_merges := book_merges || jsonb_build_array(jsonb_build_object(
        'fromBookId', source_book.id,
        'toBookId', target_book.id,
        'toBookTitle', target_book.title,
        'toBookSortIndex', target_book.sort_index,
        'toBookMemo', merged_memo,
        'citationOrderKeys', (select coalesce(jsonb_object_agg(id::text, order_key), '{}'::jsonb)
      from public.citations where book_id = target_book.id and user_id = current_user_id),
        'chapterOrderKeys', (select coalesce(jsonb_object_agg(id::text, order_key), '{}'::jsonb)
      from public.chapter_blocks where book_id = target_book.id and user_id = current_user_id)
      ));
    else
      update public.books
      set author_id = target_author.id
      where id = source_book.id and user_id = current_user_id;
    end if;
  end loop;

  update public.citations
  set author_id = target_author.id
  where user_id = current_user_id and author_id = source_author.id;

  delete from public.authors
  where id = source_author.id and user_id = current_user_id;

  return jsonb_build_object(
    'merged', true,
    'fromAuthorId', source_author.id,
    'authorId', target_author.id,
    'authorName', target_author.name,
    'authorSortIndex', target_author.sort_index,
    'isSelf', target_author.is_self,
    'bookMerges', book_merges
  );
end;
$$;

revoke all on function public.rename_or_merge_book(uuid, text) from public, anon;
revoke all on function public.rename_or_merge_author(uuid, text) from public, anon;
grant execute on function public.rename_or_merge_book(uuid, text) to authenticated;
grant execute on function public.rename_or_merge_author(uuid, text) to authenticated;
