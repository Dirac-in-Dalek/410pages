-- Preserve the existing order, titles, and citation positions. Existing chapters start at level 0.
alter table public.chapter_blocks
  add column if not exists depth integer not null default 0
  constraint chapter_blocks_depth_nonnegative check (depth >= 0);
