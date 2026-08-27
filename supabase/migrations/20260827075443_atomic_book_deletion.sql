create or replace function public.preview_book_deletion(
  expected_user_id uuid,
  source_book_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  source_book public.books%rowtype;
  source_citation_count integer := 0;
begin
  if current_user_id is null or current_user_id is distinct from expected_user_id then
    raise exception 'Invalid book deletion preview' using errcode = '22023';
  end if;

  select * into strict source_book
  from public.books
  where id = source_book_id and user_id = current_user_id;

  select count(*) into source_citation_count
  from public.citations
  where book_id = source_book.id and user_id = current_user_id;

  return jsonb_build_object(
    'bookId', source_book.id,
    'citationCount', source_citation_count
  );
end;
$$;

create or replace function public.delete_book_cascade(
  expected_user_id uuid,
  source_book_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  source_book public.books%rowtype;
  deleted_citation_count integer := 0;
begin
  if current_user_id is null or current_user_id is distinct from expected_user_id then
    raise exception 'Invalid book deletion' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('410pages:book-delete:' || current_user_id::text, 0)
  );

  select * into strict source_book
  from public.books
  where id = source_book_id and user_id = current_user_id
  for update;

  select count(*) into deleted_citation_count
  from public.citations
  where book_id = source_book.id and user_id = current_user_id;

  delete from public.books
  where id = source_book.id and user_id = current_user_id;

  return jsonb_build_object(
    'bookId', source_book.id,
    'deletedCitationCount', deleted_citation_count
  );
end;
$$;

revoke all on function public.preview_book_deletion(uuid, uuid) from public, anon;
revoke all on function public.delete_book_cascade(uuid, uuid) from public, anon;
grant execute on function public.preview_book_deletion(uuid, uuid) to authenticated;
grant execute on function public.delete_book_cascade(uuid, uuid) to authenticated;
