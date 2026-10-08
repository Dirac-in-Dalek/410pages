import argparse
import concurrent.futures
import uuid
import json
import subprocess
import time
from pathlib import Path

parser = argparse.ArgumentParser(description='Audit repository SQL in disposable PostgreSQL; never connects to Supabase.')
parser.add_argument('--output', type=Path, help='Write the full diagnostic JSON report to this file')
args = parser.parse_args()
ROOT = Path(__file__).resolve().parents[1]
NAME = '410pages-db-audit-' + uuid.uuid4().hex[:12]
container_started = False
A = '11111111-1111-4111-8111-111111111111'
B = '22222222-2222-4222-8222-222222222222'
AA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
BA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
BOOK = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
QUOTE = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
PROJECT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
result = {}

def sql(database, statement):
    process = subprocess.run(['docker','exec','-i',NAME,'psql','-X','-U','postgres','-d',database,
                              '-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-Atq'],
                             input=statement,text=True,capture_output=True)
    return {'ok':process.returncode==0,'output':process.stdout.strip(),
            'error':process.stderr.strip() if process.returncode else ''}

def required(database, statement):
    output = sql(database,statement)
    if not output['ok']:
        raise RuntimeError(output['error'])
    return output['output']

def as_user(user, statement):
    return f"set role authenticated; set request.jwt.claim.sub='{user}'; {statement}"

bootstrap = '''
create schema auth; create schema storage; create schema extensions;
create extension "uuid-ossp" with schema extensions;
set search_path=public,extensions;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$
select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table storage.buckets(id text primary key,name text,public boolean default false,
file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets,
name text,owner uuid,metadata jsonb);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
grant usage on schema public,auth,storage,extensions to anon,authenticated;
alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;
'''
schema = (ROOT/'supabase_schema.sql').read_text()
migrations = sorted((ROOT/'supabase/migrations').glob('*.sql'))

try:
    subprocess.run(['docker','run','--rm','-d','--name',NAME,'--network','none',
                    '--memory','512m','--cpus','2','--tmpfs','/var/lib/postgresql/data',
                    '-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],
                   check=True,capture_output=True,text=True)
    container_started = True
    for _ in range(80):
        ready = subprocess.run(['docker','exec',NAME,'pg_isready','-U','postgres'],capture_output=True)
        if ready.returncode == 0:
            break
        time.sleep(.25)
    else:
        raise RuntimeError('Isolated PostgreSQL did not start')
    required('postgres','create role anon; create role authenticated; create database baseline; create database replay; create database hardened;')
    result['postgres_version'] = required('postgres','select version();')
    for database in ['baseline','replay','hardened']:
        required(database,bootstrap)
        result[database+'_schema_install'] = sql(database,'set search_path=public,extensions; begin;\n'+schema+'\ncommit;')
        if not result[database+'_schema_install']['ok']:
            raise RuntimeError(result[database+'_schema_install']['error'])
    result['baseline_columns'] = json.loads(required('baseline',"select json_agg(row_to_json(c)) from (select table_name,column_name from information_schema.columns where table_schema='public' order by table_name,ordinal_position)c;"))
    result['replay'] = []
    for migration in migrations:
        applied = sql('replay','set search_path=public,extensions; begin;\n'+migration.read_text()+'\ncommit;')
        result['replay'].append({'migration':migration.name,**applied})
        if not applied['ok']:
            break
    # Historical fixtures are deliberately local only. These missing definitions
    # are not claimed to reconstruct the production trigger bodies.
    required('hardened','''
      alter table citations add column author_id uuid references authors(id) on delete cascade;
      alter table citations add column page_sort double precision;
      create function handle_citation_defaults() returns trigger language plpgsql as $$ begin return new; end $$;
      create function sync_author_name_with_username() returns trigger language plpgsql as $$ begin return new; end $$;
      create function sync_self_author_name() returns trigger language plpgsql as $$ begin return new; end $$;
    ''')
    result['historical_fixture_additions'] = ['citations.author_id FK','citations.page_sort',
        'three placeholder trigger functions required by hardening migration (bodies not under test)']
    result['hardened_migrations'] = []
    for migration in migrations:
        applied = sql('hardened','set search_path=public,extensions; begin;\n'+migration.read_text()+'\ncommit;')
        result['hardened_migrations'].append({'migration':migration.name,**applied})
        if not applied['ok']:
            raise RuntimeError(applied['error'])
    for database in ['baseline','hardened']:
        required(database,f"insert into auth.users(id,email,raw_user_meta_data) values ('{A}','audit-a@example.invalid','{{\"username\":\"Audit A\"}}'),('{B}','audit-b@example.invalid','{{\"username\":\"Audit B\"}}');")
        required(database,as_user(A,f"insert into authors(id,name,user_id) values('{AA}','Author A','{A}');"))
        required(database,as_user(B,f"insert into authors(id,name,user_id) values('{BA}','Author B','{B}'); insert into projects(id,name,user_id) values('{PROJECT}','Project B','{B}');"))
        quote_columns = f"id,text,user_id{' ,author_id' if database=='hardened' else ''}"
        quote_values = f"'{QUOTE}','synthetic audit quotation','{A}'{', ' + repr(AA) if database=='hardened' else ''}"
        required(database,as_user(A,f"insert into books(id,title,author_id,user_id) values('{BOOK}','Book A','{AA}','{A}'); insert into citations({quote_columns}) values({quote_values});"))
        tests = {
            'other_account_read':as_user(B,f"select count(*) from authors where user_id='{A}';"),
            'own_account_read':as_user(B,f"select count(*) from authors where user_id='{B}';"),
            'cross_owner_book':as_user(B,f"insert into books(title,author_id,user_id) values('Cross-owner','{AA}','{B}');"),
            'cross_owner_note':as_user(B,f"insert into notes(citation_id,content,user_id) values('{QUOTE}','Synthetic note','{B}');"),
            'cross_owner_project_link':as_user(B,f"insert into project_citations(project_id,citation_id) values('{PROJECT}','{QUOTE}');"),
            'anonymous_read':"set role anon; select count(*) from citations;",
            'anonymous_email_rpc':"set role anon; select check_email_exists('audit-absent@example.invalid');",
            'duplicate_self_author':as_user(B,f"insert into authors(name,user_id,is_self) values('Extra self','{B}',true); select count(*) from authors where is_self;"),
            'citations_api_columns':"select author_id,page_sort from citations limit 0;",
        }
        result[database+'_tests'] = {name:sql(database,statement) for name,statement in tests.items()}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        calls=list(pool.map(lambda _:sql('hardened',as_user(B,f"select get_or_create_author('{B}','Concurrent RPC author')->>'authorId';")),range(4)))
        result['concurrent_atomic_author_creation']=calls
        calls=list(pool.map(lambda _:sql('hardened',as_user(B,f"insert into authors(name,user_id) values('Concurrent direct author','{B}') returning id;")),range(4)))
        result['concurrent_direct_author_creation']=calls
    required('hardened',as_user(B,f"insert into books(title,author_id,user_id,memo) values('Memo race','{BA}','{B}','Original');"))
    result['memo_stale_write_1']=sql('hardened',as_user(B,"update books set memo='First client new memo' where title='Memo race' returning memo;"))
    result['memo_stale_write_2']=sql('hardened',as_user(B,"update books set memo='Second client stale edit' where title='Memo race' returning memo;"))
    result['memo_final']=required('hardened',as_user(B,"select memo from books where title='Memo race';"))
    order_inserts=[as_user(A,f"begin; insert into citations(text,book_id,author_id,user_id,order_key) values('Synthetic concurrent row','{BOOK}','{AA}','{A}','a9'); select pg_sleep(0.4); commit;"),
                   as_user(A,f"begin; insert into chapter_blocks(book_id,label,user_id,created_at_sort,order_key) values('{BOOK}','Synthetic concurrent chapter','{A}',42,'a9'); select pg_sleep(0.4); commit;")]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        result['concurrent_cross_table_order_guard']=list(pool.map(lambda statement:sql('hardened',statement),order_inserts))
    result['concurrent_cross_table_final_count']=required('hardened',"select count(*) from (select order_key from citations union all select order_key from chapter_blocks)x where order_key='a9';")
    # Same owner, two different authors: tenant ownership and source consistency
    # are separate invariants. Existing composite FKs cover the former only.
    result['same_owner_mismatched_book_author']=sql('hardened',as_user(A,f"insert into authors(name,user_id) values('Other own author','{A}'); insert into citations(text,book_id,author_id,user_id,order_key) select 'Inconsistent source','{BOOK}',id,'{A}','aB' from authors where name='Other own author';"))
    result['guard_rejects_service_context']=sql('hardened',f"insert into citations(text,book_id,author_id,user_id,order_key) values('Admin import','{BOOK}','{AA}','{A}','aC');")
    result['health_check_report'] = json.loads(required('hardened',
        "begin transaction read only; set local statement_timeout='15s'; set local lock_timeout='2s';\n"
        + (ROOT/'supabase/audit/health-check.sql').read_text() + '\ncommit;'))
    assert result['health_check_report']['connection'][0]['read_only'] == 'on'
    result['health_check_read_only_validation'] = True
    if args.output:
        args.output.write_text(json.dumps(result,indent=2))
    print(json.dumps({'postgres':result['postgres_version'],
                     'first_replay_failure':next((entry for entry in result['replay'] if not entry['ok']),None),
                     'baseline_tests':result['baseline_tests'],'hardened_tests':result['hardened_tests'],
                     'atomic_rpc_successes':sum(c['ok'] for c in result['concurrent_atomic_author_creation']),
                     'atomic_rpc_unique_ids':len(set(c['output'] for c in result['concurrent_atomic_author_creation'] if c['ok'])),
                     'direct_insert_successes':sum(c['ok'] for c in result['concurrent_direct_author_creation']),
                     'direct_insert_unique_ids':len(set(c['output'] for c in result['concurrent_direct_author_creation'] if c['ok'])),
                     'memo_final':result['memo_final'],
                     'concurrent_order_guard':result['concurrent_cross_table_order_guard'],
                     'concurrent_order_final_count':result['concurrent_cross_table_final_count'],
                     'same_owner_mismatched_book_author':result['same_owner_mismatched_book_author'],
                     'service_context':result['guard_rejects_service_context']}))
except Exception:
    if args.output:
        args.output.write_text(json.dumps(result,indent=2))
    raise
finally:
    if container_started:
        subprocess.run(['docker','rm','-f',NAME],capture_output=True,check=True)
