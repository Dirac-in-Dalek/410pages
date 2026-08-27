create table public.author_folders (
  id uuid default extensions.uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null check (btrim(name) <> ''),
  sort_index integer default 0 not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create unique index author_folders_user_trimmed_name_key
on public.author_folders (user_id, btrim(name));

create table public.author_folder_memberships (
  author_id uuid primary key references public.authors(id) on delete cascade,
  folder_id uuid not null references public.author_folders(id) on delete cascade,
  user_id uuid references auth.users not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index author_folder_memberships_folder_id_idx
on public.author_folder_memberships (folder_id);

alter table public.author_folders enable row level security;
alter table public.author_folder_memberships enable row level security;

create policy "own author folders"
on public.author_folders
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "own author folder memberships"
on public.author_folder_memberships
for all
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.authors
    where authors.id = author_folder_memberships.author_id
      and authors.user_id = (select auth.uid())
      and authors.is_self = false
  )
  and exists (
    select 1 from public.author_folders
    where author_folders.id = author_folder_memberships.folder_id
      and author_folders.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.authors
    where authors.id = author_folder_memberships.author_id
      and authors.user_id = (select auth.uid())
      and authors.is_self = false
  )
  and exists (
    select 1 from public.author_folders
    where author_folders.id = author_folder_memberships.folder_id
      and author_folders.user_id = (select auth.uid())
  )
);

grant select, insert, update, delete on table public.author_folders to authenticated;
grant select, insert, update, delete on table public.author_folder_memberships to authenticated;
revoke all on table public.author_folders from anon;
revoke all on table public.author_folder_memberships from anon;

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

  select count(*) into deleted_citation_count
  from public.citations
  where author_id = source_author.id and user_id = current_user_id;

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
        'toBookSortIndex', target_book.sort_index
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

revoke all on function public.delete_author_cascade(uuid, uuid) from public, anon;
grant execute on function public.delete_author_cascade(uuid, uuid) to authenticated;
