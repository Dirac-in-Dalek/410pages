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
