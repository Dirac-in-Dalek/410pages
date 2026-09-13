-- Optional book-body position; preserve the original creation time and page.
-- Existing rows keep their current order through the created_at fallback.
alter table public.citations
  add column if not exists created_at_sort double precision
  constraint citations_created_at_sort_finite
  check (created_at_sort > '-Infinity'::double precision and created_at_sort < 'Infinity'::double precision);
