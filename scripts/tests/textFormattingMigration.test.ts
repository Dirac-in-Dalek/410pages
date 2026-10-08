// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const author = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const book = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const quote = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const note = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const sourceBook = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const migration = (name: string) => readFileSync(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), 'utf8');
async function database() {
  const db = new PGlite();
  await db.exec(`create role authenticated; create role anon; create role service_role; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table authors(id uuid primary key,user_id uuid not null,name text,sort_index integer,is_self boolean default false,created_at timestamptz default now());
    create table books(id uuid primary key,user_id uuid not null,author_id uuid references authors,title text,sort_index integer,memo text not null default '',created_at timestamptz default now());
    create table author_folder_memberships(author_id uuid primary key references authors,user_id uuid not null,folder_id uuid);
    create table citations(id uuid primary key,user_id uuid not null,book_id uuid references books,author_id uuid references authors,text text not null,page text,highlights jsonb default '[]',created_at timestamptz default now(),created_at_sort double precision);
    create table notes(id uuid primary key,user_id uuid not null,citation_id uuid references citations,content text not null);
    create table chapter_blocks(id uuid primary key,user_id uuid not null,book_id uuid references books,label text,depth integer default 0,created_at timestamptz default now(),created_at_sort double precision not null);
    insert into authors(id,user_id,name) values('${author}','${owner}','Author');
    insert into books(id,user_id,author_id,title,memo) values('${book}','${owner}','${author}','Target','😀target'),('${sourceBook}','${owner}','${author}','Source','source');
    insert into citations(id,user_id,author_id,book_id,text) values('${quote}','${owner}','${author}','${book}','한😀글');
    insert into notes values('${note}','${owner}','${quote}','comment');
    grant usage on schema public,auth to authenticated,anon;
  `);
  for (const table of ['authors', 'books', 'citations', 'notes', 'chapter_blocks', 'author_folder_memberships']) {
    await db.exec(`alter table ${table} enable row level security; create policy own on ${table} for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid()); grant select,insert,update,delete on ${table} to authenticated;`);
  }
  await db.exec(migration('20260927052202_add_book_order_keys'));
  await db.exec(migration('20260927052212_preserve_book_order_merges'));
  await db.exec(migration('20261008120000_add_text_formatting'));
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
  return db;
}
const save = (db: PGlite, kind: string, id: string, before: string, after: string, formats: unknown) => db.query('select save_text_formatting($1,$2::uuid,$3,$4,$5::jsonb)', [kind,id,before,after,JSON.stringify(formats)]);

describe('text formatting migration', () => {
  it('saves UTF-16 citation ranges and mirrors legacy highlights without changing text', async () => {
    const db = await database();
    try {
      const formats = [{start:1,end:3,bold:true,highlight:true,fontSizeOffset:2}];
      await save(db,'citation',quote,'한😀글','한😀글',formats);
      expect((await db.query('select text,text_formats,highlights from citations')).rows).toEqual([{text:'한😀글',text_formats:formats,highlights:[{id:'format-1-3',start:1,end:3,color:'yellow'}]}]);
      await save(db,'citation',quote,'한😀글','한😀글',[]);
      expect((await db.query('select highlights from citations')).rows).toEqual([{highlights:[]}]);
    } finally { await db.close(); }
  },30000);
  it('rejects stale text, anonymous callers and other owners without modifying data', async () => {
    const db = await database();
    try {
      await expect(save(db,'note',note,'old comment','changed',[])).rejects.toMatchObject({code:'40001'});
      await db.exec(`set request.jwt.claim.sub='${other}';`);
      await expect(save(db,'memo',book,'😀target','changed',[])).rejects.toMatchObject({code:'42501'});
      await db.exec('reset role; set role anon;');
      await expect(save(db,'memo',book,'😀target','changed',[])).rejects.toMatchObject({code:'42501'});
      await db.exec('reset role;');
      expect((await db.query('select content from notes')).rows).toEqual([{content:'comment'}]);
      expect((await db.query('select memo from books where id=$1',[book])).rows).toEqual([{memo:'😀target'}]);
    } finally { await db.close(); }
  },30000);
  it('validates persisted ranges even for direct writes and saves memo text with formats atomically', async () => {
    const db = await database();
    try {
      expect((await db.query("select text_utf16_length('') as empty_length, text_utf16_length('한😀글') as emoji_length")).rows).toEqual([{empty_length:0,emoji_length:4}]);
      await expect(save(db,'memo',book,'😀target','',[{start:0,end:1,bold:true}])).rejects.toMatchObject({code:'22023'});
      for (const formats of [null,{},[{start:0,end:99,bold:true}],[{start:0,end:2,fontSizeOffset:999}],[{start:0,end:2,bold:false}],[{start:0,end:2,html:'<script>'}],[{start:0,end:3,bold:true},{start:2,end:4,italic:true}]]) {
        await expect(save(db,'memo',book,'😀target','😀target',formats)).rejects.toMatchObject({code:'22023'});
      }
      await expect(db.query('update notes set text_formats=$1::jsonb where id=$2',[JSON.stringify([{start:0,end:999,bold:true}]),note])).rejects.toMatchObject({code:'23514'});
      const formats = [{start:0,end:2,italic:true}];
      await save(db,'memo',book,'😀target','새 메모',formats);
      expect((await db.query('select memo,memo_formats from books where id=$1',[book])).rows).toEqual([{memo:'새 메모',memo_formats:formats}]);
      await db.exec('reset role; set role service_role;');
      expect((await db.query("select public.text_formats_are_valid('memo','[]') as valid")).rows).toEqual([{valid:true}]);
    } finally { await db.close(); }
  },30000);
  it('preserves both memo format sets and UTF-16 offsets during book merges', async () => {
    const db = await database();
    try {
      await save(db,'memo',book,'😀target','😀target',[{start:0,end:2,bold:true}]);
      await save(db,'memo',sourceBook,'source','source',[{start:0,end:6,underline:true}]);
      const result = (await db.query<{result:any}>('select rename_or_merge_book($1,$2) as result',[sourceBook,'Target'])).rows[0].result;
      expect(result.bookMemo).toBe('😀target\n\n---\n\nsource');
      expect(result.bookMemoFormats).toEqual([{start:0,end:2,bold:true},{start:15,end:21,underline:true}]);
      expect((await db.query('select memo_formats from books where id=$1',[book])).rows).toEqual([{memo_formats:result.bookMemoFormats}]);
    } finally { await db.close(); }
  },30000);
  it('preserves memo formatting during an author merge with matching book titles', async () => {
    const db = await database();
    try {
      const sourceAuthor = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
      await db.query('insert into authors(id,user_id,name) values($1,$2,$3)',[sourceAuthor,owner,'Source author']);
      await db.query('update books set author_id=$1,title=$2 where id=$3',[sourceAuthor,'Target',sourceBook]);
      await save(db,'memo',book,'😀target','😀target',[{start:0,end:2,bold:true}]);
      await save(db,'memo',sourceBook,'source','source',[{start:0,end:6,underline:true}]);
      const result = (await db.query<{result:any}>('select rename_or_merge_author($1,$2) as result',[sourceAuthor,'Author'])).rows[0].result;
      expect(result.bookMerges[0].toBookMemo).toBe('😀target\n\n---\n\nsource');
      expect(result.bookMerges[0].toBookMemoFormats).toEqual([{start:0,end:2,bold:true},{start:15,end:21,underline:true}]);
    } finally { await db.close(); }
  },30000);
});
