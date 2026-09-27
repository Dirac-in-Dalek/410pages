// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { generateBookPosition, legacyOrderKey } from '../../lib/bookOrder';

const sql = readFileSync(new URL('../../supabase/migrations/20260927052202_add_book_order_keys.sql', import.meta.url), 'utf8');
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const book = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const root = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const quote = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const next = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
async function database() {
  const db = new PGlite();
  await db.exec(`
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.authors(id uuid primary key, user_id uuid not null);
    create table public.books(id uuid primary key, user_id uuid not null, author_id uuid);
    create table public.citations(id uuid primary key, user_id uuid not null, book_id uuid references books,
      author_id uuid, text text, page text, highlights jsonb default '[]', created_at timestamptz not null, created_at_sort double precision);
    create table public.chapter_blocks(id uuid primary key, user_id uuid not null, book_id uuid not null references books,
      label text, depth integer not null default 0, created_at timestamptz not null, created_at_sort double precision not null);
    insert into authors values ('${owner}','${owner}');
    insert into books values ('${book}','${owner}','${owner}');
    insert into chapter_blocks values ('${root}','${owner}','${book}','2-2',1,'2026-09-27',1800000000000);
    insert into citations(id,user_id,book_id,text,page,created_at,created_at_sort) values
      ('${quote}','${owner}','${book}','Keep original text','30','2026-09-27',1800000000000.1);
    insert into chapter_blocks values ('${next}','${owner}','${book}','3',0,'2026-09-27',1800000000001);
    alter table books enable row level security;
    alter table citations enable row level security;
    alter table chapter_blocks enable row level security;
    create policy own on books for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    create policy own on citations for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    create policy own on chapter_blocks for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    grant usage on schema public,auth to authenticated;
    grant select,insert,update,delete on authors,books,citations,chapter_blocks to authenticated;
  `);
  return db;
}

describe('book order key migration', () => {
  it('preserves data, matches JS legacy keys, stores long keys and enforces owner/collision guards', async () => {
    const db = await database();
    try {
      const before = (await db.query('select to_jsonb(c) as value from citations c')).rows;
      await db.exec(sql);
      expect((await db.query("select to_jsonb(c) - 'order_key' as value from citations c")).rows).toEqual(before);
      for (const value of [-123, -0, 0, 0.1, 1800000000000.1, Number.MAX_VALUE]) {
        const result = await db.query<{ key: string }>('select public.book_legacy_order_key($1::double precision) as key', [value]);
        expect(result.rows[0].key).toBe(legacyOrderKey(value));
      }
      const order = await db.query<{ id: string; order_key: string }>(`select * from (select id,order_key from citations union all select id,order_key from chapter_blocks) items order by order_key collate "C"`);
      expect(order.rows.map(r => r.id)).toEqual([root, quote, next]);
      await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
      const low = order.rows[1].order_key, high = order.rows[2].order_key;
      let cursor = low;
      // Persist and re-read each generated key; no double arithmetic or rank rebalance.
      for (let i = 0; i < 1000; i++) {
        cursor = generateBookPosition(cursor, high);
        const id = `00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
        await db.query('insert into citations(id,user_id,book_id,text,created_at,order_key) values($1,$2,$3,$4,now(),$5)',[id,owner,book,`entry ${i}`,cursor]);
      }
      expect((await db.query('select count(*)::int as n from citations')).rows[0]).toEqual({ n: 1001 });
      // Variable keys can exceed a normal B-tree key tuple; hash uniqueness still works.
      const longKey = 'a9' + 'V'.repeat(4000);
      expect(longKey.length).toBeGreaterThan(2704);
      await db.query('insert into citations(id,user_id,book_id,text,created_at,order_key) values($1,$2,$3,$4,now(),$5)', ['eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',owner,book,'long',longKey]);
      await expect(db.query('update citations set order_key=$1 where id=$2',[order.rows[0].order_key,quote])).rejects.toMatchObject({ code: '23505' });
      await expect(db.query('update citations set created_at_sort=42 where id=$1',[quote])).rejects.toMatchObject({ code:'22023' });
      await expect(db.query('update citations set order_key=$1 where id=$2',['invalid!',quote])).rejects.toMatchObject({ code:'22023' });
      await db.exec(`set request.jwt.claim.sub='${other}';`);
      expect((await db.query('select * from citations')).rows).toEqual([]);
      await expect(db.query('insert into citations(id,user_id,book_id,text,created_at,order_key) values($1,$2,$3,$4,now(),$5)', ['ffffffff-ffff-4fff-8fff-ffffffffffff',other,book,'wrong owner','a9'])).rejects.toMatchObject({ code:'42501' });
    } finally { await db.close(); }
  }, 30000);
  it('rolls back completely when legacy positions have ambiguous ties', async () => {
    const db = await database();
    try {
      await db.exec(`update citations set created_at_sort=1800000000000; begin;`);
      await expect(db.exec(sql)).rejects.toThrow('Legacy book position ties');
      await db.exec('rollback');
      const columns = await db.query("select column_name from information_schema.columns where table_name='citations' and column_name='order_key'");
      expect(columns.rows).toEqual([]);
      expect((await db.query('select text from citations')).rows[0]).toEqual({text:'Keep original text'});
    } finally { await db.close(); }
  }, 30000);
  it('keeps bulk source updates atomic when a later item collides', async () => {
    const db = await database();
    try {
      await db.exec(sql);
      await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
      const second = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
      await db.query('insert into citations(id,user_id,book_id,text,created_at,order_key) values($1,$2,$3,$4,now(),$5)', [second,owner,book,'Second','a7']);
      const before = (await db.query('select id,author_id,book_id,order_key,text from citations order by id')).rows;
      const expected = JSON.stringify(Object.fromEntries(before.map((row: any) => [row.id,{book_id:row.book_id,order_key:row.order_key}])));
      await expect(db.query('select * from bulk_update_citation_source($1,$2::uuid[],$3,$4,$5::jsonb,$6::jsonb)',
        [owner,[quote,second],owner,book,JSON.stringify({[quote]:'a9',[second]:'a9'}),expected]
      )).rejects.toMatchObject({code:'23505'});
      expect((await db.query('select id,author_id,book_id,order_key,text from citations order by id')).rows).toEqual(before);
      const result = await db.query('select * from bulk_update_citation_source($1,$2::uuid[],$3,$4,$5::jsonb,$6::jsonb)',
        [owner,[quote,second],owner,book,JSON.stringify({[quote]:'a8',[second]:'a9'}),expected]);
      expect(result.rows).toHaveLength(2);
      expect((await db.query('select id from citations order by order_key')).rows.map((r: any) => r.id)).toEqual([quote,second]);
      await expect(db.query('select * from bulk_update_citation_source($1,$2::uuid[],$3,$4,$5::jsonb,$6::jsonb)',
        [owner,[quote,second],owner,book,JSON.stringify({[quote]:'a5',[second]:'a6'}),expected]
      )).rejects.toMatchObject({code:'40001'});
    } finally { await db.close(); }
  }, 30000);
});
