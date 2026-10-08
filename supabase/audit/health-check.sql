-- One SELECT returns one JSON report for Supabase SQL Editor or psql.
-- Execute using an authorized administrative/read-only connection.
-- All operations read metadata or aggregate counts; no individual text, email,
-- username, memo, account identifier or avatar object is returned.
-- Requires current 410pages tables and the book-order migration. A missing
-- relation/function is a signal to compare migration history, not to reapply SQL.
-- Run inside BEGIN TRANSACTION READ ONLY when using a persistent psql session.
-- Backend configuration: use a 15s statement timeout and 2s lock timeout.
-- transaction_read_only in the report describes the caller's transaction mode.
select jsonb_build_object(
  'checked_at', current_timestamp,
  'connection', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select current_database() as database_name, current_user as inspected_role,
           current_setting('server_version') as postgres_version,
           current_setting('transaction_read_only') as read_only
  ) section),
  'required_columns', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    with expected(table_name, column_name) as (values
      ('profiles','preferences'), ('profiles','avatar_path'),
      ('authors','user_id'), ('authors','is_self'),
      ('books','author_id'), ('books','user_id'), ('books','memo'),
      ('citations','author_id'), ('citations','book_id'), ('citations','user_id'),
      ('citations','page_sort'), ('citations','created_at_sort'), ('citations','order_key'),
      ('notes','citation_id'), ('notes','user_id'),
      ('projects','user_id'), ('project_citations','citation_id'),
      ('chapter_blocks','depth'), ('chapter_blocks','order_key'),
      ('author_folders','user_id'), ('author_folder_memberships','user_id')
    )
    select e.table_name, e.column_name, c.column_name is not null as present
    from expected e left join information_schema.columns c
      on c.table_schema='public' and c.table_name=e.table_name and c.column_name=e.column_name
    order by e.table_name, e.column_name
  ) section),
  'table_security_and_maintenance', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select c.relname as table_name, c.relrowsecurity as rls_enabled,
           c.relforcerowsecurity as force_rls, c.reltuples::bigint as estimated_rows,
           pg_table_size(c.oid) as table_bytes, pg_indexes_size(c.oid) as index_bytes,
           s.n_dead_tup as estimated_dead_rows, s.last_autovacuum, s.last_autoanalyze
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    left join pg_stat_user_tables s on s.relid=c.oid
    where n.nspname='public' and c.relkind='r'
    order by c.relname
  ) section),
  'rls_policies', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select schemaname, tablename, policyname, roles, cmd, qual, with_check
    from pg_policies
    where schemaname='public' or (schemaname='storage' and tablename='objects')
    order by schemaname, tablename, policyname
  ) section),
  'table_grants', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select c.relname as table_name, r.role_name,
           has_table_privilege(r.role_name,c.oid,'SELECT') as can_select,
           has_table_privilege(r.role_name,c.oid,'INSERT') as can_insert,
           has_table_privilege(r.role_name,c.oid,'UPDATE') as can_update,
           has_table_privilege(r.role_name,c.oid,'DELETE') as can_delete
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    cross join (values ('anon'),('authenticated')) r(role_name)
    where n.nspname='public' and c.relkind='r'
    order by c.relname, r.role_name
  ) section),
  'function_grants', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select p.proname as function_name, pg_get_function_identity_arguments(p.oid) as arguments,
           p.prosecdef as security_definer, p.provolatile as volatility,
           p.proconfig as function_settings,
           has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
           has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
    order by p.proname, arguments
  ) section),
  'constraints', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select c.relname as table_name, k.conname as constraint_name, k.contype,
           k.convalidated, pg_get_constraintdef(k.oid) as definition
    from pg_constraint k join pg_class c on c.oid=k.conrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
    order by c.relname, k.conname
  ) section),
  'indexes', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select tablename, indexname, indexdef from pg_indexes
    where schemaname='public' order by tablename, indexname
  ) section),
  'relationship_integrity', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select 'books_author_owner_mismatch' as check_name, count(*) as problem_count
    from public.books b join public.authors a on a.id=b.author_id where b.user_id<>a.user_id
    union all
    select 'citations_author_owner_mismatch', count(*)
    from public.citations c join public.authors a on a.id=c.author_id where c.user_id<>a.user_id
    union all
    select 'citations_book_owner_mismatch', count(*)
    from public.citations c join public.books b on b.id=c.book_id where c.user_id<>b.user_id
    union all
    select 'notes_citation_owner_mismatch', count(*)
    from public.notes n join public.citations c on c.id=n.citation_id where n.user_id<>c.user_id
    union all
    select 'chapters_book_owner_mismatch', count(*)
    from public.chapter_blocks c join public.books b on b.id=c.book_id where c.user_id<>b.user_id
    union all
    select 'folder_membership_owner_mismatch', count(*)
    from public.author_folder_memberships m
    join public.authors a on a.id=m.author_id join public.author_folders f on f.id=m.folder_id
    where m.user_id<>a.user_id or m.user_id<>f.user_id
    union all
    select 'self_author_in_folder', count(*)
    from public.author_folder_memberships m join public.authors a on a.id=m.author_id where a.is_self
    union all
    select 'project_citation_owner_mismatch', count(*)
    from public.project_citations pc join public.projects p on p.id=pc.project_id
    join public.citations c on c.id=pc.citation_id where p.user_id<>c.user_id
    union all
    select 'citation_book_author_mismatch', count(*)
    from public.citations c join public.books b on b.id=c.book_id
    where c.author_id is distinct from b.author_id
  ) section),
  'orphaned_relationships', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select 'books_without_author' as check_name,count(*) as problem_count
    from public.books b left join public.authors a on a.id=b.author_id where a.id is null
    union all select 'citations_missing_author',count(*) from public.citations c
    left join public.authors a on a.id=c.author_id where c.author_id is not null and a.id is null
    union all select 'citations_missing_book',count(*) from public.citations c
    left join public.books b on b.id=c.book_id where c.book_id is not null and b.id is null
    union all select 'notes_without_citation',count(*) from public.notes n
    left join public.citations c on c.id=n.citation_id where c.id is null
    union all select 'chapters_without_book',count(*) from public.chapter_blocks c
    left join public.books b on b.id=c.book_id where b.id is null
    union all select 'broken_folder_memberships',count(*) from public.author_folder_memberships m
    left join public.authors a on a.id=m.author_id left join public.author_folders f on f.id=m.folder_id
    where a.id is null or f.id is null
    union all select 'broken_project_citations',count(*) from public.project_citations pc
    left join public.projects p on p.id=pc.project_id left join public.citations c on c.id=pc.citation_id
    where p.id is null or c.id is null
  ) section),
  'duplicate_identity_and_sources', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select 'duplicate_trimmed_author_groups' as check_name, count(*) as problem_count
    from (select user_id,btrim(name) from public.authors group by user_id,btrim(name) having count(*)>1) x
    union all
    select 'duplicate_trimmed_book_groups',count(*)
    from (select user_id,author_id,btrim(title) from public.books
          group by user_id,author_id,btrim(title) having count(*)>1) x
    union all
    select 'accounts_with_multiple_self_authors',count(*)
    from (select user_id from public.authors where is_self group by user_id having count(*)>1) x
    union all
    select 'accounts_without_profile',count(*)
    from auth.users u left join public.profiles p on p.id=u.id where p.id is null
    union all
    select 'accounts_without_self_author',count(*)
    from auth.users u where not exists(select 1 from public.authors a where a.user_id=u.id and a.is_self)
  ) section),
  'book_order_health', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    with items as (
      select book_id,order_key,created_at_sort from public.citations where book_id is not null
      union all
      select book_id,order_key,created_at_sort from public.chapter_blocks
    )
    select count(*) as book_item_count,
           count(*) filter(where order_key is null) as missing_order_keys,
           count(*) filter(where order_key is not null and not public.book_order_key_is_valid(order_key)) as invalid_order_keys,
           max(length(order_key)) as maximum_order_key_length,
           count(*) filter(where created_at_sort is not null and
             not (created_at_sort>'-Infinity'::float8 and created_at_sort<'Infinity'::float8)) as nonfinite_legacy_positions
    from items
  ) section),
  'book_order_duplicates', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    with items as (
      select book_id,order_key from public.citations where book_id is not null
      union all select book_id,order_key from public.chapter_blocks
    )
    select count(*) as duplicate_book_order_groups
    from (select book_id,order_key from items where order_key is not null
          group by book_id,order_key having count(*)>1) x
  ) section),
  'content_shapes', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select 'blank_author_names' as check_name,count(*) as problem_count from public.authors where btrim(name)=''
    union all select 'blank_book_titles',count(*) from public.books where btrim(title)=''
    union all select 'blank_chapter_labels',count(*) from public.chapter_blocks where btrim(label)=''
    union all select 'nonarray_citation_highlights',count(*) from public.citations
    where highlights is not null and jsonb_typeof(highlights)<>'array'
    union all select 'nonobject_profile_preferences',count(*) from public.profiles
    where preferences is not null and jsonb_typeof(preferences)<>'object'
  ) section),
  'avatar_bucket', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='profile-avatars'
  ) section),
  'migration_history_available', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select to_regclass('supabase_migrations.schema_migrations') is not null as has_cli_migration_history
  ) section),
  'extensions', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select extname,extversion from pg_extension order by extname
  ) section),
  'connection_settings', (select coalesce(jsonb_agg(to_jsonb(section)), '[]'::jsonb) from (
    select name,setting from pg_settings where name in
      ('ssl','statement_timeout','lock_timeout','idle_in_transaction_session_timeout','max_connections')
    order by name
  ) section)
) as database_health;
