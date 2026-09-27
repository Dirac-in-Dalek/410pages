// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';
import { describe, expect, it } from 'vitest';

const migration = (name: string) => readFileSync(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), 'utf8');
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const a1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const a2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const b1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const b2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
const c1 = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const c2 = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2';
const h1 = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const h2 = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2';
const h3 = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3';
const h4 = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4';
const folder = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

async function database(authorMerge = false) {
  const db = new PGlite();
  await db.exec(`
    create role authenticated; create role anon; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table authors(id uuid primary key,user_id uuid not null,name text,sort_index integer,is_self boolean default false,created_at timestamptz default now());
    create table books(id uuid primary key,user_id uuid not null,author_id uuid references authors,title text,sort_index integer,created_at timestamptz default now());
    create table author_folder_memberships(author_id uuid primary key references authors,user_id uuid not null,folder_id uuid);
    create table citations(id uuid primary key,user_id uuid not null,book_id uuid references books,author_id uuid references authors,
      text text,page text,highlights jsonb default '[]',created_at timestamptz default now(),created_at_sort double precision);
    create table chapter_blocks(id uuid primary key,user_id uuid not null,book_id uuid references books,
      label text,depth integer default 0,created_at timestamptz default now(),created_at_sort double precision not null);
    insert into authors(id,user_id,name) values ('${a1}','${owner}','Old author'),('${a2}','${owner}','New author');
    insert into books(id,user_id,author_id,title) values
      ('${b1}','${owner}','${a1}','${authorMerge ? 'Shared' : 'Old title'}'),
      ('${b2}','${owner}','${authorMerge ? a2 : a1}','${authorMerge ? 'Shared' : 'New title'}');
    insert into author_folder_memberships values('${a2}','${owner}','${folder}');
    insert into citations(id,user_id,book_id,author_id,text,page,created_at_sort) values
      ('${c1}','${owner}','${b1}','${a1}','Source quote','3',100),
      ('${c2}','${owner}','${b2}','${authorMerge ? a2 : a1}','Target quote','4',100.1);
    insert into chapter_blocks(id,user_id,book_id,label,depth,created_at_sort) values
      ('${h1}','${owner}','${b1}','Source child',1,100.1),
      ('${h2}','${owner}','${b2}','Target parent',0,100),
      ('${h3}','${owner}','${b1}','Source last',0,200),
      ('${h4}','${owner}','${b2}','Target last',0,300);
  `);
  for (const table of ['authors', 'books', 'author_folder_memberships', 'citations', 'chapter_blocks']) {
    await db.exec(`alter table ${table} enable row level security;
      create policy own on ${table} for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
      grant select,insert,update,delete on ${table} to authenticated;`);
  }
  await db.exec(`grant usage on schema public,auth to authenticated;`);
  await db.exec(migration('20260831073035_add_book_memo'));
  await db.exec(migration('20260827070211_return_author_folder_after_merge'));
  await db.exec(migration('20260927052202_add_book_order_keys'));
  await db.exec(migration('20260927052212_preserve_book_order_merges'));
  await db.exec(`update books set memo = case when id='${b1}' then 'source memo' else 'target memo' end;
    set role authenticated; set request.jwt.claim.sub='${owner}';`);
  return db;
}

const rows = async (db: PGlite) => (await db.query<{ id: string; book_id: string; order_key: string; value: Record<string, unknown> }>(`
  select * from (select id,book_id,order_key,to_jsonb(c)-'order_key'-'book_id'-'author_id' as value from citations c
  union all select id,book_id,order_key,to_jsonb(c)-'order_key'-'book_id' from chapter_blocks c
  ) items order by order_key collate "C",id
`)).rows;

describe('book merge order keys', () => {
  for (const authorMerge of [false, true]) {
    it(`preserves fields and both relative orders during an atomic ${authorMerge ? 'author' : 'book'} merge`, async () => {
      const db = await database(authorMerge);
      try {
        const before = await rows(db);
        const result = (await db.query<{ result: any }>(authorMerge
          ? `select rename_or_merge_author_with_folder($1,'New author') as result`
          : `select rename_or_merge_book($1,'New title') as result`, [authorMerge ? a1 : b1])).rows[0].result;
        const after = await rows(db);
        expect(after).toHaveLength(before.length);
        expect(after.every(row => row.book_id === b2)).toBe(true);
        expect(new Set(after.map(row => row.order_key)).size).toBe(after.length);
        for (const row of before) expect(after.find(saved => saved.id === row.id)?.value).toEqual(row.value);
        for (const originalBook of [b1, b2]) {
          const originalIds = before.filter(row => row.book_id === originalBook).map(row => row.id);
          expect(after.filter(row => originalIds.includes(row.id)).map(row => row.id)).toEqual(originalIds);
        }
        // Collision-only allocation preserves every destination key and non-colliding source key.
        for (const id of [c2,h2,h3,h4]) expect(after.find(row => row.id === id)?.order_key).toBe(before.find(row => row.id === id)?.order_key);
        for (const id of [c1,h1]) expect(after.find(row => row.id === id)?.order_key).not.toBe(before.find(row => row.id === id)?.order_key);
        const response = authorMerge ? result.bookMerges[0] : result;
        expect(response.citationOrderKeys[c1]).toBe(after.find(row => row.id === c1)?.order_key);
        expect(response.chapterOrderKeys[h1]).toBe(after.find(row => row.id === h1)?.order_key);
        expect((await db.query('select memo from books where id=$1',[b2])).rows).toEqual([{memo:'target memo\n\n---\n\nsource memo'}]);
        expect((await db.query('select id from books where id=$1',[b1])).rows).toEqual([]);
        if (authorMerge) expect(result.folderId).toBe(folder);
      } finally { await db.close(); }
    }, 30000);
  }

  it('generates valid library-compatible keys between close, prefix, integer and long boundaries', async () => {
    const db = await database();
    try {
      const keys = generateNKeysBetween(null,null,80);
      let cursor = 'a0';
      for (let i=0;i<150;i++) { cursor = generateKeyBetween(cursor,'a1'); keys.push(cursor); }
      keys.push('A'+'0'.repeat(26)+'V','a0'+'0'.repeat(4000)+'1','a0'+'0'.repeat(4000)+'2','a01','a0101');
      keys.sort();
      for (let i=0;i<keys.length;i++) {
        const lower = keys[i], upper = keys[i+1] ?? null;
        if (lower === upper) continue;
        const { rows: [{ key }] } = await db.query<{key:string}>('select book_order_key_after($1,$2) as key',[lower,upper]);
        expect(key > lower).toBe(true);
        if (upper) expect(key < upper).toBe(true);
        // Actual fractional-indexing parser/generator must accept the server's result.
        expect(generateKeyBetween(lower,key) < key).toBe(true);
        expect(generateKeyBetween(key,upper) > key).toBe(true);
      }
      await expect(db.query('select book_order_key_after($1,$2)',['invalid!','a0'])).rejects.toMatchObject({code:'22023'});
      await expect(db.query('select book_order_key_after($1,$2)',['a1','a0'])).rejects.toMatchObject({code:'22023'});
    } finally { await db.close(); }
  }, 30000);

  it('denies another owner and rolls back memo/order/source removal if a merge fails', async () => {
    const db = await database();
    try {
      const before = await rows(db);
      await db.exec(`set request.jwt.claim.sub='${other}';`);
      await expect(db.query(`select rename_or_merge_book($1,'New title')`,[b1])).rejects.toBeDefined();
      await db.exec(`set request.jwt.claim.sub='${owner}'; reset role;
        create function fail_merge() returns trigger language plpgsql as $$ begin raise exception 'injected transfer failure'; end $$;
        create trigger z_fail_merge before update on chapter_blocks for each row execute function fail_merge();
        set role authenticated;`);
      await expect(db.query(`select rename_or_merge_book($1,'New title')`,[b1])).rejects.toThrow('injected transfer failure');
      expect(await rows(db)).toEqual(before);
      expect((await db.query('select memo from books where id=$1',[b2])).rows).toEqual([{memo:'target memo'}]);
      expect((await db.query('select id from books where id=$1',[b1])).rows).toEqual([{id:b1}]);
    } finally { await db.close(); }
  },30000);
});
