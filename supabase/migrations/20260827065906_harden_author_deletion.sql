create or replace function public.protect_self_author()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_self then
    raise exception 'Self author cannot be deleted' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and old.is_self and not new.is_self then
    raise exception 'Self author identity cannot be removed' using errcode = '22023';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists protect_self_author_trigger on public.authors;
create trigger protect_self_author_trigger
before update or delete on public.authors
for each row execute function public.protect_self_author();

revoke all on function public.protect_self_author() from public, anon, authenticated;

create or replace function public.preview_author_deletion(
  expected_user_id uuid,
  source_author_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  source_author public.authors%rowtype;
  source_book_ids uuid[] := array[]::uuid[];
  source_citation_count integer := 0;
begin
  if current_user_id is null or current_user_id is distinct from expected_user_id then
    raise exception 'Invalid author deletion preview' using errcode = '22023';
  end if;
  select * into strict source_author
  from public.authors
  where id = source_author_id and user_id = current_user_id;
  if source_author.is_self then
    raise exception 'Self author cannot be deleted' using errcode = '22023';
  end if;
  select coalesce(array_agg(id order by created_at, id), array[]::uuid[])
  into source_book_ids
  from public.books
  where author_id = source_author.id and user_id = current_user_id;
  select count(distinct id) into source_citation_count
  from public.citations
  where user_id = current_user_id
    and (author_id = source_author.id or book_id = any(source_book_ids));
  return jsonb_build_object(
    'authorId', source_author.id,
    'bookIds', to_jsonb(source_book_ids),
    'bookCount', cardinality(source_book_ids),
    'citationCount', source_citation_count
  );
end;
$$;

create or replace function public.delete_author_cascade(
  expected_user_id uuid,
  source_author_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  source_author public.authors%rowtype;
  deleted_book_ids uuid[] := array[]::uuid[];
  deleted_citation_count integer := 0;
begin
  if current_user_id is null or current_user_id is distinct from expected_user_id then
    raise exception 'Invalid author deletion' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('410pages:author-delete:' || current_user_id::text, 0)
  );
  select * into strict source_author
  from public.authors
  where id = source_author_id and user_id = current_user_id
  for update;
  if source_author.is_self then
    raise exception 'Self author cannot be deleted' using errcode = '22023';
  end if;
  select coalesce(array_agg(id order by created_at, id), array[]::uuid[])
  into deleted_book_ids
  from public.books
  where author_id = source_author.id and user_id = current_user_id;
  select count(distinct id) into deleted_citation_count
  from public.citations
  where user_id = current_user_id
    and (author_id = source_author.id or book_id = any(deleted_book_ids));
  delete from public.authors
  where id = source_author.id and user_id = current_user_id;
  return jsonb_build_object(
    'authorId', source_author.id,
    'deletedBookIds', to_jsonb(deleted_book_ids),
    'deletedBookCount', cardinality(deleted_book_ids),
    'deletedCitationCount', deleted_citation_count
  );
end;
$$;

revoke all on function public.preview_author_deletion(uuid, uuid) from public, anon;
revoke all on function public.delete_author_cascade(uuid, uuid) from public, anon;
grant execute on function public.preview_author_deletion(uuid, uuid) to authenticated;
grant execute on function public.delete_author_cascade(uuid, uuid) to authenticated;
