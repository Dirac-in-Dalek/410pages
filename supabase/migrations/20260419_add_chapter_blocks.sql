-- Keep this migration idempotent so it can be applied safely to existing projects.
create extension if not exists "uuid-ossp";

alter table profiles add column if not exists avatar_path text;
alter table profiles add column if not exists avatar_url text;

create table if not exists chapter_blocks (
  id uuid default uuid_generate_v4() primary key,
  book_id uuid references books(id) on delete cascade not null,
  label text not null,
  page_sort double precision,
  created_at_sort double precision not null,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table chapter_blocks enable row level security;

drop policy if exists "Users can crud their own chapter_blocks" on chapter_blocks;
create policy "Users can crud their own chapter_blocks" on chapter_blocks
  for all using (auth.uid() = user_id);

alter table citations add column if not exists highlights jsonb default '[]';
