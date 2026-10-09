-- Additive RPCs: old clients keep working while the new client is deployed.
create or replace function public.create_project_with_citations(
  expected_user_id uuid,
  requested_project_id uuid,
  requested_name text,
  citation_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  project public.projects;
  requested_count integer := coalesce(cardinality(citation_ids), 0);
  owned_count integer;
  next_index integer;
begin
  if owner_id is null or owner_id is distinct from expected_user_id then
    raise exception 'Active project owner changed' using errcode = '42501';
  end if;
  if requested_project_id is null or requested_name is null or btrim(requested_name) = ''
    or citation_ids is null or requested_count <> (select count(distinct id) from unnest(citation_ids) id) then
    raise exception 'Invalid project creation' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('410pages:project-mutations:' || owner_id::text, 0));
  select * into project from public.projects
    where id = requested_project_id and user_id = owner_id for update;
  if found then
    if project.name <> btrim(requested_name) then
      raise exception 'Project retry conflicts with current name' using errcode = '40001';
    end if;
    if requested_count <> (select count(*) from public.project_citations where project_id = project.id)
      or exists (select id from unnest(citation_ids) id except
        select citation_id from public.project_citations where project_id = project.id) then
      raise exception 'Project retry conflicts with current citations' using errcode = '40001';
    end if;
    return jsonb_build_object('id', project.id, 'name', project.name, 'sortIndex', project.sort_index,
      'citationIds', (select coalesce(jsonb_agg(citation_id order by citation_id), '[]'::jsonb)
        from public.project_citations where project_id = project.id));
  end if;
  -- Hold references until commit so a concurrent deletion cannot leave a partial creation.
  perform id from public.citations where user_id = owner_id and id = any(citation_ids) order by id for key share;
  select count(*) into owned_count from public.citations where user_id = owner_id and id = any(citation_ids);
  if owned_count <> requested_count then
    raise exception 'Project citation ownership mismatch' using errcode = '42501';
  end if;
  select coalesce(max(sort_index), -1) + 1 into next_index from public.projects where user_id = owner_id;
  insert into public.projects(id, user_id, name, sort_index)
    values(requested_project_id, owner_id, btrim(requested_name), next_index) returning * into project;
  insert into public.project_citations(project_id, citation_id)
    select project.id, id from unnest(citation_ids) id;
  return jsonb_build_object('id', project.id, 'name', project.name, 'sortIndex', project.sort_index,
    'citationIds', to_jsonb(citation_ids));
end;
$$;

create or replace function public.reorder_projects(expected_user_id uuid, ordered_project_ids uuid[])
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  requested_count integer := coalesce(cardinality(ordered_project_ids), 0);
  owned_count integer;
  result jsonb;
begin
  if owner_id is null or owner_id is distinct from expected_user_id then
    raise exception 'Active project owner changed' using errcode = '42501';
  end if;
  if requested_count = 0 or requested_count <> (select count(distinct id) from unnest(ordered_project_ids) id) then
    raise exception 'Invalid project order' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('410pages:project-mutations:' || owner_id::text, 0));
  perform id from public.projects where user_id = owner_id order by id for update;
  select count(*) into owned_count from public.projects where user_id = owner_id and id = any(ordered_project_ids);
  if owned_count <> requested_count then
    raise exception 'Project order changed or ownership mismatch' using errcode = '40001';
  end if;
  -- Preserve folders created since the client captured its order by appending them.
  with positions as (
    select p.id, row_number() over(order by array_position(ordered_project_ids, p.id) nulls last,
      p.sort_index, p.created_at, p.id) - 1 as position
    from public.projects p where p.user_id = owner_id
  )
  update public.projects p set sort_index = positions.position::integer
    from positions where p.id = positions.id and p.user_id = owner_id;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'sortIndex', sort_index) order by sort_index), '[]'::jsonb)
    into result from public.projects where user_id = owner_id;
  return result;
end;
$$;

revoke all on function public.create_project_with_citations(uuid, uuid, text, uuid[]) from public, anon;
revoke all on function public.reorder_projects(uuid, uuid[]) from public, anon;
grant execute on function public.create_project_with_citations(uuid, uuid, text, uuid[]) to authenticated;
grant execute on function public.reorder_projects(uuid, uuid[]) to authenticated;
