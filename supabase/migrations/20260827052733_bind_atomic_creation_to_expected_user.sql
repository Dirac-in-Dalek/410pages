drop function if exists public.get_or_create_author(text);
drop function if exists public.get_or_create_book(uuid, text);

create function public.get_or_create_author(
  expected_user_id uuid,
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
  selected_author public.authors%rowtype;
  next_sort_index integer;
begin
  if current_user_id is null
    or current_user_id <> expected_user_id
    or normalized_name = '' then
    raise exception 'Invalid author creation' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('410pages:author-rename:' || current_user_id::text, 0)
  );

  select * into selected_author
  from public.authors
  where user_id = current_user_id and btrim(name) = normalized_name
  order by created_at, id
  limit 1
  for update;

  if not found then
    select coalesce(max(sort_index), -1) + 1 into next_sort_index
    from public.authors
    where user_id = current_user_id;

    insert into public.authors (name, user_id, is_self, sort_index)
    values (normalized_name, current_user_id, false, next_sort_index)
    returning * into selected_author;
  end if;

  return jsonb_build_object(
    'authorId', selected_author.id,
    'authorName', selected_author.name,
    'authorSortIndex', selected_author.sort_index,
    'authorCreatedAt', selected_author.created_at,
    'isSelf', selected_author.is_self
  );
end;
$$;

create function public.get_or_create_book(
  expected_user_id uuid,
  source_author_id uuid,
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
  selected_author public.authors%rowtype;
  selected_book public.books%rowtype;
  next_sort_index integer;
begin
  if current_user_id is null
    or current_user_id <> expected_user_id
    or normalized_title = '' then
    raise exception 'Invalid book creation' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('410pages:book-rename:' || current_user_id::text, 0)
  );

  select * into strict selected_author
  from public.authors
  where id = source_author_id and user_id = current_user_id
  for update;

  select * into selected_book
  from public.books
  where user_id = current_user_id
    and author_id = selected_author.id
    and btrim(title) = normalized_title
  order by created_at, id
  limit 1
  for update;

  if not found then
    select coalesce(max(sort_index), -1) + 1 into next_sort_index
    from public.books
    where user_id = current_user_id and author_id = selected_author.id;

    insert into public.books (title, author_id, user_id, sort_index)
    values (normalized_title, selected_author.id, current_user_id, next_sort_index)
    returning * into selected_book;
  end if;

  return jsonb_build_object(
    'authorId', selected_author.id,
    'authorName', selected_author.name,
    'authorSortIndex', selected_author.sort_index,
    'authorCreatedAt', selected_author.created_at,
    'isSelf', selected_author.is_self,
    'bookId', selected_book.id,
    'bookTitle', selected_book.title,
    'bookSortIndex', selected_book.sort_index,
    'bookCreatedAt', selected_book.created_at
  );
end;
$$;

revoke all on function public.get_or_create_author(uuid, text) from public, anon;
revoke all on function public.get_or_create_book(uuid, uuid, text) from public, anon;
grant execute on function public.get_or_create_author(uuid, text) to authenticated;
grant execute on function public.get_or_create_book(uuid, uuid, text) to authenticated;
