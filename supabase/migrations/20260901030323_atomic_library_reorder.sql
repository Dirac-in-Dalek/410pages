with ranked_authors as (
  select
    author.id,
    row_number() over (
      partition by author.user_id
      order by greatest(
        author.created_at,
        coalesce(max(citation.created_at), author.created_at)
      ) desc, author.id
    ) - 1 as sort_index
  from public.authors as author
  left join public.citations as citation
    on citation.author_id = author.id
    and citation.user_id = author.user_id
    and citation.kind = 'sentence'
  where not author.is_self
  group by author.id, author.user_id, author.created_at
)
update public.authors as author
set sort_index = ranked.sort_index::integer
from ranked_authors as ranked
where author.id = ranked.id;

create or replace function public.reorder_authors(
  ordered_author_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  requested_count integer := coalesce(cardinality(ordered_author_ids), 0);
  owned_count integer;
  total_count integer;
  updated_count integer;
begin
  if current_user_id is null or requested_count = 0 then
    raise exception 'Invalid author reorder' using errcode = '22023';
  end if;

  if requested_count <> (
    select count(distinct author_id)
    from unnest(ordered_author_ids) as author_id
  ) then
    raise exception 'Duplicate author reorder ids' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('410pages:author-reorder:' || current_user_id::text, 0)
  );

  perform id
  from public.authors
  where user_id = current_user_id and not is_self
  order by id
  for update;

  select count(*) into owned_count
  from public.authors
  where user_id = current_user_id and not is_self and id = any(ordered_author_ids);

  select count(*) into total_count
  from public.authors
  where user_id = current_user_id and not is_self;

  if owned_count <> requested_count or requested_count <> total_count then
    raise exception 'Author reorder ownership mismatch' using errcode = '42501';
  end if;

  update public.authors as author
  set sort_index = requested.position::integer - 1
  from unnest(ordered_author_ids) with ordinality as requested(id, position)
  where author.id = requested.id and author.user_id = current_user_id;

  get diagnostics updated_count = row_count;
  if updated_count <> requested_count then
    raise exception 'Author reorder changed during save' using errcode = '40001';
  end if;
end;
$$;

create or replace function public.reorder_books(
  source_author_id uuid,
  ordered_book_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  requested_count integer := coalesce(cardinality(ordered_book_ids), 0);
  owned_count integer;
  total_count integer;
  updated_count integer;
begin
  if current_user_id is null or source_author_id is null or requested_count = 0 then
    raise exception 'Invalid book reorder' using errcode = '22023';
  end if;

  if requested_count <> (
    select count(distinct book_id)
    from unnest(ordered_book_ids) as book_id
  ) then
    raise exception 'Duplicate book reorder ids' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('410pages:book-reorder:' || current_user_id::text, 0)
  );

  perform id
  from public.books
  where user_id = current_user_id and author_id = source_author_id
  order by id
  for update;

  select count(*) into owned_count
  from public.books
  where user_id = current_user_id
    and author_id = source_author_id
    and id = any(ordered_book_ids);

  select count(*) into total_count
  from public.books
  where user_id = current_user_id and author_id = source_author_id;

  if owned_count <> requested_count or requested_count <> total_count then
    raise exception 'Book reorder ownership mismatch' using errcode = '42501';
  end if;

  update public.books as book
  set sort_index = requested.position::integer - 1
  from unnest(ordered_book_ids) with ordinality as requested(id, position)
  where book.id = requested.id
    and book.user_id = current_user_id
    and book.author_id = source_author_id;

  get diagnostics updated_count = row_count;
  if updated_count <> requested_count then
    raise exception 'Book reorder changed during save' using errcode = '40001';
  end if;
end;
$$;

revoke all on function public.reorder_authors(uuid[]) from public, anon;
revoke all on function public.reorder_books(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_authors(uuid[]) to authenticated;
grant execute on function public.reorder_books(uuid, uuid[]) to authenticated;
