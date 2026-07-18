alter table public.citations
  add column if not exists kind text not null default 'sentence';

alter table public.citations
  drop constraint if exists citations_kind_check;

alter table public.citations
  add constraint citations_kind_check
  check (kind in ('sentence', 'word'));
