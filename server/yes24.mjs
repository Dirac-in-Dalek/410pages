export const normalizeBookText = value => typeof value === 'string' ? value.replace(/\s+/gu, '') : '';

function authorsMatch(value, expected) {
  if (typeof value !== 'string') return false;
  return value.split('/').some(credit => {
    if (/\s+(역|번역|그림|감수|편집)\s*$/.test(credit)) return false;
    return credit.replace(/\s+저\s*$/, '').split(',').some(name => normalizeBookText(name) === normalizeBookText(expected));
  });
}

function isVolumeOne(candidate, title) {
  const base = normalizeBookText(title);
  return !/\d+(?:권)?$/.test(base) && [base + '1', base + '1권'].includes(normalizeBookText(candidate));
}

export function selectBookMetadata(response, title, author, seriesCover = false) {
  const items = response?.data?.items;
  const count = response?.data?.totalCount;
  if (!response?.success || !Array.isArray(items) || !Number.isInteger(count) || count > items.length) return null;
  const matches = new Map();
  for (const item of items) {
    if (item && Number.isSafeInteger(item.itemId) && item.itemId > 0 &&
        (seriesCover ? isVolumeOne(item.title, title) : normalizeBookText(item.title) === normalizeBookText(title)) && authorsMatch(item.author, author)) {
      matches.set(item.itemId, item);
    }
  }
  if (matches.size !== 1) return null;
  const item = [...matches.values()][0];
  let coverUrl = null;
  try {
    const cover = new URL(item.cover);
    if (cover.protocol === 'https:' && cover.hostname === 'image.yes24.com' && !cover.username && !cover.password) coverUrl = cover.href;
  } catch { /* Missing artwork must not discard an otherwise valid table of contents. */ }
  if (seriesCover && !coverUrl) return null;
  return {
      itemId: item.itemId, title: seriesCover ? title : item.title, author: item.author,
      matchType: seriesCover ? 'series-cover' : 'book',
      isbn13: !seriesCover && typeof item.isbn13 === 'string' ? item.isbn13 : '',
      publisher: !seriesCover && typeof item.publisher === 'string' ? item.publisher : '',
      publishedAt: !seriesCover && typeof item.publishDate === 'string' ? item.publishDate : '',
      totalPages: !seriesCover && Number.isSafeInteger(item.pages) && item.pages > 0 ? item.pages : null,
      coverUrl,
      sourceUrl: `https://www.yes24.com/product/goods/${item.itemId}`,
      tableOfContents: !seriesCover && typeof item.contentDetail?.tableOfContents === 'string' ? item.contentDetail.tableOfContents : '',
  };
}

export async function lookupYes24(title, author, key, fetcher = fetch) {
  const search = async query => {
    const url = new URL('https://apis.yes24.com/v1/goods/itemList');
    url.search = new URLSearchParams({ query, category: 'BOOK', detail: 'Y', page: '1', pageSize: '20' }).toString();
    const response = await fetcher(url, { headers: { 'X-Api-Key': key }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Book provider unavailable');
    const data = await response.json();
    if (data?.success !== true) throw new Error('Book provider rejected the request');
    return data;
  };
  const data = await search(title);
  const exact = selectBookMetadata(data, title, author);
  if (exact) return exact;
  const items = Array.isArray(data?.data?.items) ? data.data.items : [];
  if (items.some(item => normalizeBookText(item?.title) === normalizeBookText(title) && authorsMatch(item?.author, author))) return null;
  if (!items.some(item => isVolumeOne(item?.title, title) && authorsMatch(item?.author, author))) return null;
  return selectBookMetadata(await search(`${title} 1`), title, author, true);
}

export async function handleBookMetadata(req, res, env = process.env, fetcher = fetch) {
  const send = (status, data) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(data));
  };
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(405, { error: 'Method not allowed' }); }
  const query = new URL(req.url || '/', 'http://localhost').searchParams;
  const title = query.get('title')?.trim();
  const author = query.get('author')?.trim();
  if (!title || !author || title.length > 300 || author.length > 200) return send(400, { error: 'Invalid book' });
  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !/^Bearer \S+$/.test(authorization) || authorization.length > 8192) return send(401, { error: 'Sign in required' });
  if (!env.YES24_API_KEY || !env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) return send(503, { error: 'Book lookup not configured' });
  try {
    const auth = await fetcher(new URL('/auth/v1/user', env.VITE_SUPABASE_URL), {
      headers: { Authorization: authorization, apikey: env.VITE_SUPABASE_ANON_KEY }, signal: AbortSignal.timeout(8000),
    });
    if (!auth.ok || typeof (await auth.json())?.id !== 'string') return send(401, { error: 'Sign in required' });
    const metadata = await lookupYes24(title, author, env.YES24_API_KEY, fetcher);
    return send(200, { metadata });
  } catch { return send(502, { error: 'Book lookup unavailable' }); }
}
