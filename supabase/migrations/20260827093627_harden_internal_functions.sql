alter function public.handle_new_user() set search_path = '';
alter function public.handle_citation_defaults() set search_path = '';
alter function public.sync_author_name_with_username() set search_path = '';
alter function public.sync_self_author_name() set search_path = '';
alter function public.check_email_exists(text) set search_path = '';

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_citation_defaults() from public, anon, authenticated;
revoke execute on function public.sync_author_name_with_username() from public, anon, authenticated;
revoke execute on function public.sync_self_author_name() from public, anon, authenticated;
revoke execute on function public.check_email_exists(text) from public, anon, authenticated;
