import { describe, expect, it, vi } from 'vitest';
import { handleBookMetadata, lookupYes24, selectBookMetadata } from './yes24.mjs';

const item = { itemId: 142954777, title: '롱 뷰', author: '리처드 피셔 저/한미선 역', isbn13: '9791194368151', cover: 'https://image.yes24.com/goods/142954777/L', contentDetail: { tableOfContents: '첫 장\n둘째 장' } };
const result = (items = [item], totalCount = items.length) => ({ success: true, data: { items, totalCount } });

describe('YES24 exact book matching', () => {
  it('uses the original author’s first-volume cover without assigning its ISBN or contents to the series', async () => {
    const volume = { ...item, title: '광마회귀 1', author: '유진성 저' };
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => result([volume], 23) }).mockResolvedValueOnce({ ok: true, json: async () => result([volume, { ...volume, itemId: 9, author: '유진성 원저/JP 글/이히 그림' }, { ...volume, itemId: 8, title: '광마회귀 1~8권 세트' }]) });
    const match = await lookupYes24('광마회귀', '유진성', 'secret', fetcher);
    expect(match?.itemId).toBe(volume.itemId);
    expect(match?.matchType).toBe('series-cover');
    expect(match?.isbn13).toBe('');
    expect(match?.tableOfContents).toBe('');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('does not replace an explicitly numbered volume with another first volume', () => {
    expect(selectBookMetadata(result([{ ...item, title: '시리즈 21' }]), '시리즈 2', '리처드 피셔', true)).toBeNull();
  });
  it('ignores whitespace and separates author credits from translators', () => {
    expect(selectBookMetadata(result(), '롱뷰', '리처드피셔')?.itemId).toBe(item.itemId);
    expect(selectBookMetadata(result(), '롱뷰', '한미선')).toBeNull();
  });
  it('never drops volume numbers, editions or subtitles to force a match', () => {
    for (const title of ['롱 뷰 1', '롱 뷰 개정판', '롱 뷰: 부제']) {
      expect(selectBookMetadata(result([{ ...item, title }]), '롱뷰', '리처드 피셔')).toBeNull();
    }
  });
  it('rejects ambiguous or incomplete results even if only one has a cover', () => {
    expect(selectBookMetadata(result([item, { ...item, itemId: 42, cover: '' }]), '롱뷰', '리처드 피셔')).toBeNull();
    expect(selectBookMetadata(result([item], 30), '롱뷰', '리처드 피셔')).toBeNull();
    expect(selectBookMetadata(result([item, item]), '롱뷰', '리처드 피셔')?.itemId).toBe(item.itemId);
  });
  it('omits missing or untrusted artwork without losing the matched book contents', () => {
    for (const cover of ['', 'https://example.com/cover.jpg', 'javascript:alert(1)']) {
      const book = selectBookMetadata(result([{ ...item, cover }]), '롱뷰', '리처드 피셔');
      expect(book?.coverUrl).toBeNull();
      expect(book?.tableOfContents).toBe('첫 장\n둘째 장');
    }
  });
});

const env = { YES24_API_KEY: 'server-secret', VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-key' };
const makeResponse = () => ({ statusCode: 0, setHeader: vi.fn(), end: vi.fn() });
const request = { method: 'GET', url: '/?title=롱뷰&author=리처드%20피셔', headers: { authorization: 'Bearer session' } };
describe('book metadata endpoint', () => {
  it('does not call the provider for unsigned or invalid sessions', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false });
    const unsigned = makeResponse();
    await handleBookMetadata({ ...request, headers: {} }, unsigned, env, fetcher);
    expect(unsigned.statusCode).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
    const denied = makeResponse();
    await handleBookMetadata(request, denied, env, fetcher);
    expect(denied.statusCode).toBe(401);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('keeps the provider key server-side and returns only book metadata', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'user' }) }).mockResolvedValueOnce({ ok: true, json: async () => result() });
    const res = makeResponse();
    await handleBookMetadata(request, res, env, fetcher);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.end.mock.calls[0][0]).metadata.tableOfContents).toBe('첫 장\n둘째 장');
    expect(res.end.mock.calls[0][0]).not.toContain(env.YES24_API_KEY);
    expect(fetcher.mock.calls[1][1].headers).toEqual({ 'X-Api-Key': env.YES24_API_KEY });
  });
});
