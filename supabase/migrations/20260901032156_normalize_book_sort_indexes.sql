with ranked_books as (
  select
    book.id,
    row_number() over (
      partition by book.user_id, book.author_id
      order by book.sort_index nulls last, btrim(book.title), book.created_at, book.id
    ) - 1 as sort_index
  from public.books as book
)
update public.books as book
set sort_index = ranked.sort_index::integer
from ranked_books as ranked
where book.id = ranked.id;
