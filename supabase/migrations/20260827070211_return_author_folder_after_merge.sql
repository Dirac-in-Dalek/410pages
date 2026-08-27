create or replace function public.rename_or_merge_author_with_folder(
  source_author_id uuid,
  requested_name text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  merge_result jsonb;
  final_author_id uuid;
  final_folder_id uuid;
begin
  merge_result := public.rename_or_merge_author(source_author_id, requested_name);
  final_author_id := (merge_result->>'authorId')::uuid;
  select folder_id into final_folder_id
  from public.author_folder_memberships
  where author_id = final_author_id and user_id = auth.uid();
  return merge_result || jsonb_build_object('folderId', final_folder_id);
end;
$$;

revoke all on function public.rename_or_merge_author_with_folder(uuid, text) from public, anon;
grant execute on function public.rename_or_merge_author_with_folder(uuid, text) to authenticated;
