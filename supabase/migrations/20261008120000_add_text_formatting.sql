-- Selection formatting stores plain text and UTF-16 ranges separately.
-- Apply this migration before deploying the selection toolbar client.
begin;

create or replace function public.text_utf16_length(value text)
returns integer language sql immutable strict set search_path = pg_catalog as $$
  select coalesce(sum(case when ascii(character) > 65535 then 2 else 1 end), 0)::integer
  from regexp_split_to_table(value, '') as character where character <> '';
$$;

create or replace function public.text_formats_are_valid(value text, formats jsonb)
returns boolean language plpgsql immutable set search_path = pg_catalog, public as $$
declare item jsonb; start_at integer; end_at integer; previous_end integer := 0;
  text_length integer := public.text_utf16_length(value); offset_value integer;
begin
  if value is null or formats is null or jsonb_typeof(formats) <> 'array' then return false; end if;
  for item in select * from jsonb_array_elements(formats) loop
    if jsonb_typeof(item) <> 'object' or not item ?& array['start', 'end']
      or (item - array['start', 'end', 'bold', 'italic', 'underline', 'highlight', 'fontSizeOffset']) <> '{}'::jsonb
      or jsonb_typeof(item->'start') <> 'number' or jsonb_typeof(item->'end') <> 'number'
      or (item->>'start') !~ '^[0-9]+$' or (item->>'end') !~ '^[0-9]+$' then return false; end if;
    start_at := (item->>'start')::integer; end_at := (item->>'end')::integer;
    if start_at < previous_end or end_at <= start_at or end_at > text_length then return false; end if;
    previous_end := end_at;
    if exists (select 1 from jsonb_each(item) entry where entry.key in ('bold', 'italic', 'underline', 'highlight') and entry.value <> 'true'::jsonb) then return false; end if;
    if item ? 'fontSizeOffset' then
      if jsonb_typeof(item->'fontSizeOffset') <> 'number' or (item->>'fontSizeOffset') !~ '^-?[0-9]+$' then return false; end if;
      offset_value := (item->>'fontSizeOffset')::integer;
      if offset_value = 0 or offset_value < -4 or offset_value > 8 then return false; end if;
    end if;
    if (item - array['start', 'end']) = '{}'::jsonb then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

alter table public.citations add column if not exists text_formats jsonb not null default '[]'::jsonb;
alter table public.notes add column if not exists text_formats jsonb not null default '[]'::jsonb;
alter table public.books add column if not exists memo_formats jsonb not null default '[]'::jsonb;
alter table public.citations add constraint citations_text_formats_valid check (public.text_formats_are_valid(text, text_formats));
alter table public.notes add constraint notes_text_formats_valid check (public.text_formats_are_valid(content, text_formats));
alter table public.books add constraint books_memo_formats_valid check (public.text_formats_are_valid(memo, memo_formats));

create or replace function public.save_text_formatting(
  target_kind text, target_id uuid, expected_text text, requested_text text, requested_formats jsonb
) returns void language plpgsql security invoker set search_path = pg_catalog, public as $$
declare current_text text; owner_id uuid := auth.uid(); mirrored_highlights jsonb;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.text_formats_are_valid(requested_text, requested_formats) then
    raise exception 'Invalid text formatting ranges' using errcode = '22023';
  end if;
  case target_kind
    when 'citation' then select text into current_text from public.citations where id = target_id and user_id = owner_id for update;
    when 'note' then select content into current_text from public.notes where id = target_id and user_id = owner_id for update;
    when 'memo' then select memo into current_text from public.books where id = target_id and user_id = owner_id for update;
    else raise exception 'Invalid formatting target' using errcode = '22023';
  end case;
  if not found then raise exception 'Text is unavailable' using errcode = '42501'; end if;
  if current_text is distinct from expected_text then
    raise exception 'Text changed in another session; reload before formatting' using errcode = '40001';
  end if;
  case target_kind
    when 'citation' then
      if requested_text is distinct from current_text then raise exception 'Citation formatting cannot replace text' using errcode = '22023'; end if;
      select coalesce(jsonb_agg(jsonb_build_object('id', 'format-' || (item->>'start') || '-' || (item->>'end'),
        'start', item->'start', 'end', item->'end', 'color', 'yellow') order by (item->>'start')::integer), '[]'::jsonb)
        into mirrored_highlights from jsonb_array_elements(requested_formats) item where item->'highlight' = 'true'::jsonb;
      update public.citations set text_formats = requested_formats, highlights = mirrored_highlights where id = target_id and user_id = owner_id;
    when 'note' then update public.notes set content = requested_text, text_formats = requested_formats where id = target_id and user_id = owner_id;
    when 'memo' then update public.books set memo = requested_text, memo_formats = requested_formats where id = target_id and user_id = owner_id;
  end case;
end;
$$;
revoke all on function public.save_text_formatting(text, uuid, text, text, jsonb) from public, anon;
grant execute on function public.save_text_formatting(text, uuid, text, text, jsonb) to authenticated;
-- Validation functions are used by CHECK constraints under the caller's role.
revoke all on function public.text_utf16_length(text), public.text_formats_are_valid(text, jsonb) from public, anon;
grant execute on function public.text_utf16_length(text), public.text_formats_are_valid(text, jsonb) to authenticated;
do $maintenance_grants$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.text_utf16_length(text), public.text_formats_are_valid(text, jsonb) to service_role;
  end if;
end;
$maintenance_grants$;

create or replace function public.merge_book_memo_formats(target_text text, source_text text, target_formats jsonb, source_formats jsonb)
returns jsonb language sql immutable set search_path = pg_catalog, public as $$
  select case
    when btrim(target_text) = '' then source_formats
    when btrim(source_text) = '' or btrim(target_text) = btrim(source_text) then target_formats
    else target_formats || coalesce((select jsonb_agg(item || jsonb_build_object(
      'start', (item->>'start')::integer + public.text_utf16_length(target_text) + 7,
      'end', (item->>'end')::integer + public.text_utf16_length(target_text) + 7))
      from jsonb_array_elements(source_formats) item), '[]'::jsonb)
  end;
$$;
revoke all on function public.merge_book_memo_formats(text, text, jsonb, jsonb) from public, anon;
grant execute on function public.merge_book_memo_formats(text, text, jsonb, jsonb) to authenticated;

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
  merged_formats jsonb;
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
      'bookMemo', source_book.memo,
      'bookMemoFormats', source_book.memo_formats
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
      'bookMemo', source_book.memo,
      'bookMemoFormats', source_book.memo_formats
    );
  end if;

  merged_memo := case
    when btrim(target_book.memo) = '' then source_book.memo
    when btrim(source_book.memo) = '' then target_book.memo
    when btrim(target_book.memo) = btrim(source_book.memo) then target_book.memo
    else target_book.memo || E'\n\n---\n\n' || source_book.memo
  end;

  merged_formats := public.merge_book_memo_formats(target_book.memo, source_book.memo, target_book.memo_formats, source_book.memo_formats);
  update public.books
  set memo = merged_memo, memo_formats = merged_formats
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
    'bookMemoFormats', merged_formats,
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
  merged_formats jsonb;
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

      merged_formats := public.merge_book_memo_formats(target_book.memo, source_book.memo, target_book.memo_formats, source_book.memo_formats);
      update public.books
      set memo = merged_memo, memo_formats = merged_formats
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
        'toBookMemoFormats', merged_formats,
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

commit;
