-- 1. UUID 확장 설치
create extension if not exists "uuid-ossp";

-- 2. PROFILES 테이블 생성
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table profiles enable row level security;

-- PROFILES 정책 (이미 존재할 경우를 대비해 DO 블록 사용)
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own profile') then
    create policy "Users can view their own profile" on profiles for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update their own profile') then
    create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own profile') then
    create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
  end if;
end $$;

-- 3. 회원가입 시 프로필 자동 생성 함수 (덮어쓰기 가능)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

-- 4. 트리거 설정 (삭제 후 재생성으로 충돌 방지)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. AUTHORS 테이블
create table if not exists authors (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table authors enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can crud their own authors') then
    create policy "Users can crud their own authors" on authors for all using (auth.uid() = user_id);
  end if;
end $$;

-- 6. BOOKS 테이블
create table if not exists books (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  author_id uuid references authors(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table books enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can crud their own books') then
    create policy "Users can crud their own books" on books for all using (auth.uid() = user_id);
  end if;
end $$;

-- 7. CITATIONS 테이블
create table if not exists citations (
  id uuid default uuid_generate_v4() primary key,
  text text not null,
  book_id uuid references books(id) on delete cascade, 
  page text,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
  -- constraint fk_book foreign key (book_id) references books(id)
);

alter table citations enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can crud their own citations') then
    create policy "Users can crud their own citations" on citations for all using (auth.uid() = user_id);
  end if;
end $$;

-- 8. PROJECTS 테이블
create table if not exists projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table projects enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can crud their own projects') then
    create policy "Users can crud their own projects" on projects for all using (auth.uid() = user_id);
  end if;
end $$;

-- 9. PROJECT_CITATIONS (Many-to-Many 연결 테이블)
create table if not exists project_citations (
  project_id uuid references projects(id) on delete cascade,
  citation_id uuid references citations(id) on delete cascade,
  primary key (project_id, citation_id)
);

alter table project_citations enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can crud project_citations if they own the project') then
    create policy "Users can crud project_citations if they own the project" on project_citations
      for all using (
        exists (
          select 1 from projects 
          where id = project_citations.project_id 
          and user_id = auth.uid()
        )
      );
  end if;
end $$;

-- 10. NOTES 테이블
create table if not exists notes (
  id uuid default uuid_generate_v4() primary key,
  citation_id uuid references citations(id) on delete cascade not null,
  content text not null,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table notes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can crud their own notes') then
    create policy "Users can crud their own notes" on notes for all using (auth.uid() = user_id);
  end if;
end $$;