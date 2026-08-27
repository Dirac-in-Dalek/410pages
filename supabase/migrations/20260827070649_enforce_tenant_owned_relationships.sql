-- RLS controls who can write rows; these composite keys also guarantee that
-- every cascading relationship belongs to the same account.

alter table public.authors
  add constraint authors_id_user_id_key unique (id, user_id);
alter table public.books
  add constraint books_id_user_id_key unique (id, user_id);
alter table public.citations
  add constraint citations_id_user_id_key unique (id, user_id);
alter table public.author_folders
  add constraint author_folders_id_user_id_key unique (id, user_id);

alter table public.books
  drop constraint books_author_id_fkey,
  add constraint books_author_owner_fkey
    foreign key (author_id, user_id)
    references public.authors (id, user_id)
    on delete cascade;

alter table public.citations
  drop constraint citations_author_id_fkey,
  drop constraint citations_book_id_fkey,
  add constraint citations_author_owner_fkey
    foreign key (author_id, user_id)
    references public.authors (id, user_id)
    on delete cascade,
  add constraint citations_book_owner_fkey
    foreign key (book_id, user_id)
    references public.books (id, user_id)
    on delete cascade;

alter table public.chapter_blocks
  drop constraint chapter_blocks_book_id_fkey,
  add constraint chapter_blocks_book_owner_fkey
    foreign key (book_id, user_id)
    references public.books (id, user_id)
    on delete cascade;

alter table public.notes
  drop constraint notes_citation_id_fkey,
  add constraint notes_citation_owner_fkey
    foreign key (citation_id, user_id)
    references public.citations (id, user_id)
    on delete cascade;

alter table public.author_folder_memberships
  drop constraint author_folder_memberships_author_id_fkey,
  drop constraint author_folder_memberships_folder_id_fkey,
  add constraint author_folder_memberships_author_owner_fkey
    foreign key (author_id, user_id)
    references public.authors (id, user_id)
    on delete cascade,
  add constraint author_folder_memberships_folder_owner_fkey
    foreign key (folder_id, user_id)
    references public.author_folders (id, user_id)
    on delete cascade;

drop policy if exists "Users can crud project_citations if they own the project" on public.project_citations;
create policy "Users can crud project_citations if they own both records"
on public.project_citations
for all
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_citations.project_id
      and projects.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.citations
    where citations.id = project_citations.citation_id
      and citations.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_citations.project_id
      and projects.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.citations
    where citations.id = project_citations.citation_id
      and citations.user_id = (select auth.uid())
  )
);
