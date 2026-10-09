// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const project = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const second = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const quote = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const sql = readFileSync(
  new URL('../../supabase/migrations/20261009090000_atomic_project_mutations.sql', import.meta.url),
  'utf8'
);

async function database() {
  const db = new PGlite();
  await db.exec(`create role authenticated; create role anon; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table projects(id uuid primary key,user_id uuid not null,name text not null,sort_index integer not null,created_at timestamptz default now());
    create table citations(id uuid primary key,user_id uuid not null);
    create table project_citations(project_id uuid references projects on delete cascade,citation_id uuid references citations on delete cascade,primary key(project_id,citation_id));
    grant usage on schema public,auth to authenticated,anon;
    grant select,insert,update,delete on projects,citations,project_citations to authenticated;
    alter table projects enable row level security;
    create policy own on projects for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    alter table citations enable row level security;
    create policy own on citations for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    alter table project_citations enable row level security;
    create policy own on project_citations for all to authenticated using(exists(select 1 from projects where id=project_id and user_id=auth.uid()) and exists(select 1 from citations where id=citation_id and user_id=auth.uid()));
    insert into citations values('${quote}','${owner}');`);
  await db.exec(sql);
  // The additive migration must be safe to apply again.
  await db.exec(sql);
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
  return db;
}
const create = (db: PGlite, id = project, ids = [quote], user = owner) =>
  db.query('select create_project_with_citations($1,$2,$3,$4::uuid[]) as result', [user, id, 'Folder', ids]);
const reorder = (db: PGlite, ids: string[], user = owner) =>
  db.query('select reorder_projects($1,$2::uuid[]) as result', [user, ids]);

describe('atomic project mutations', () => {
  it('creates and attaches once when the same request is retried', async () => {
    const db = await database();
    try {
      const first = await create(db);
      expect((await create(db)).rows).toEqual(first.rows);
      expect((await db.query('select count(*)::int as count from projects')).rows).toEqual([{ count: 1 }]);
      expect((await db.query('select count(*)::int as count from project_citations')).rows).toEqual([
        { count: 1 },
      ]);
      await expect(create(db, project, [])).rejects.toMatchObject({ code: '40001' });
    } finally {
      await db.close();
    }
  }, 30000);

  it('rolls back the folder when attachment fails after creation', async () => {
    const db = await database();
    try {
      await db.exec(`reset role; create function reject_attachment() returns trigger language plpgsql as $$ begin raise exception 'attachment failed'; end $$;
        create trigger fail before insert on project_citations for each row execute function reject_attachment(); set role authenticated;`);
      await expect(create(db)).rejects.toThrow('attachment failed');
      expect((await db.query('select count(*)::int as count from projects')).rows).toEqual([{ count: 0 }]);
    } finally {
      await db.close();
    }
  }, 30000);

  it('rejects an invalid reorder without changing any saved sort indexes', async () => {
    const db = await database();
    try {
      await create(db);
      await create(db, second, []);
      const before = (await db.query('select id,sort_index from projects order by id')).rows;
      await expect(reorder(db, [second, quote])).rejects.toMatchObject({ code: '40001' });
      expect((await db.query('select id,sort_index from projects order by id')).rows).toEqual(before);
      await reorder(db, [second, project]);
      expect((await db.query('select id from projects order by sort_index')).rows).toEqual([
        { id: second },
        { id: project },
      ]);
    } finally {
      await db.close();
    }
  }, 30000);

  it('keeps folders created after the client captured its order', async () => {
    const db = await database();
    try {
      await create(db);
      await create(db, second, []);
      await reorder(db, [project]);
      expect((await db.query('select id,sort_index from projects order by sort_index')).rows).toEqual([
        { id: project, sort_index: 0 },
        { id: second, sort_index: 1 },
      ]);
    } finally {
      await db.close();
    }
  }, 30000);

  it('rolls back every position if an update trigger fails during reorder', async () => {
    const db = await database();
    try {
      await create(db);
      await create(db, second, []);
      const before = (await db.query('select id,sort_index from projects order by id')).rows;
      await db.exec(`reset role; create function reject_position() returns trigger language plpgsql as $$ begin
        if new.id='${second}' then raise exception 'position failed'; end if; return new; end $$;
        create trigger fail before update on projects for each row execute function reject_position(); set role authenticated;`);
      await expect(reorder(db, [second, project])).rejects.toThrow('position failed');
      expect((await db.query('select id,sort_index from projects order by id')).rows).toEqual(before);
    } finally {
      await db.close();
    }
  }, 30000);

  it('rejects wrong owners, foreign citations, duplicate ids and anonymous calls', async () => {
    const db = await database();
    try {
      await expect(create(db, project, [quote], other)).rejects.toMatchObject({ code: '42501' });
      await expect(create(db, project, [quote, quote])).rejects.toMatchObject({ code: '22023' });
      await db.exec(`set request.jwt.claim.sub='${other}';`);
      await expect(create(db, project, [quote], other)).rejects.toMatchObject({ code: '42501' });
      await db.exec(`set request.jwt.claim.sub='${owner}';`);
      await create(db);
      await expect(reorder(db, [project, project])).rejects.toMatchObject({ code: '22023' });
      await expect(reorder(db, [project], other)).rejects.toMatchObject({ code: '42501' });
      await db.exec('reset role; set role anon;');
      await expect(create(db)).rejects.toMatchObject({ code: '42501' });
      await expect(reorder(db, [project])).rejects.toMatchObject({ code: '42501' });
    } finally {
      await db.close();
    }
  }, 30000);
});
