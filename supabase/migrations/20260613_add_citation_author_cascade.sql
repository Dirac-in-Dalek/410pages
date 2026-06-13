-- Keep citation author ownership aligned with the application query contract.
alter table citations add column if not exists author_id uuid;

update citations
set author_id = null
where author_id is not null
  and not exists (
    select 1
    from authors
    where authors.id = citations.author_id
  );

alter table citations drop constraint if exists citations_author_id_fkey;

alter table citations
  add constraint citations_author_id_fkey
  foreign key (author_id)
  references authors(id)
  on delete cascade;

create index if not exists citations_author_id_idx on citations(author_id);
