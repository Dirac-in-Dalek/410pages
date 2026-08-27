create index books_author_owner_idx
on public.books (author_id, user_id);

create index citations_author_owner_idx
on public.citations (author_id, user_id);

create index citations_book_owner_idx
on public.citations (book_id, user_id);

create index chapter_blocks_book_owner_idx
on public.chapter_blocks (book_id, user_id);

create index notes_citation_owner_idx
on public.notes (citation_id, user_id);

create index author_folder_memberships_author_owner_idx
on public.author_folder_memberships (author_id, user_id);

create index author_folder_memberships_folder_owner_idx
on public.author_folder_memberships (folder_id, user_id);

drop policy if exists own_project_citations on public.project_citations;
