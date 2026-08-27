-- PostgREST relationship embeds address these constraints by name. Keep the
-- existing API names while retaining the composite owner columns.

alter table public.books
  rename constraint books_author_owner_fkey to books_author_id_fkey;

alter table public.citations
  rename constraint citations_author_owner_fkey to citations_author_id_fkey;
alter table public.citations
  rename constraint citations_book_owner_fkey to citations_book_id_fkey;

alter table public.chapter_blocks
  rename constraint chapter_blocks_book_owner_fkey to chapter_blocks_book_id_fkey;

alter table public.notes
  rename constraint notes_citation_owner_fkey to notes_citation_id_fkey;

alter table public.author_folder_memberships
  rename constraint author_folder_memberships_author_owner_fkey
  to author_folder_memberships_author_id_fkey;
alter table public.author_folder_memberships
  rename constraint author_folder_memberships_folder_owner_fkey
  to author_folder_memberships_folder_id_fkey;
