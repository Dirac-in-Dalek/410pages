import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock('../../../lib/supabase', () => ({ getSupabaseClient: () => ({ auth: { getSession: mocks.session } }) }));
import { forgetBookMetadata, loadBookMetadata, useBookMetadata } from './useBookMetadata';

const metadata = { itemId: 1, title: '롱 뷰', author: '리처드 피셔 저', isbn13: '123', coverUrl: 'https://image.yes24.com/goods/1/L', sourceUrl: 'https://www.yes24.com/product/goods/1', tableOfContents: '첫 장' };
beforeEach(() => { localStorage.clear(); mocks.session.mockResolvedValue({ data: { session: { access_token: 'session' } } }); });
afterEach(() => vi.unstubAllGlobals());

describe('browser book metadata', () => {
  it('deduplicates calls and reuses the browser cache', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ metadata }) });
    vi.stubGlobal('fetch', fetcher);
    const [a, b] = await Promise.all([loadBookMetadata('롱뷰', '리처드 피셔'), loadBookMetadata('롱뷰', '리처드 피셔')]);
    expect(a).toEqual(metadata); expect(b).toEqual(metadata);
    expect(await loadBookMetadata('롱뷰', '리처드 피셔')).toEqual(metadata);
    expect(fetcher).toHaveBeenCalledTimes(1);
    forgetBookMetadata('롱뷰', '리처드 피셔');
    await loadBookMetadata('롱뷰', '리처드 피셔');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('does not persist failed or ambiguous lookups', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true, json: async () => ({ metadata: null }) });
    vi.stubGlobal('fetch', fetcher);
    expect(await loadBookMetadata('책', '저자')).toBeNull();
    expect(await loadBookMetadata('책', '저자')).toBeNull();
    expect(localStorage.length).toBe(0);
  });
  it('does not show a previous book response after switching books', async () => {
    let resolve!: (value: unknown) => void;
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValue({ ok: true, json: async () => ({ metadata: null }) }));
    const { result, rerender } = renderHook(({ title }) => useBookMetadata(title, '리처드 피셔'), { initialProps: { title: '롱뷰' } });
    await waitFor(() => expect(resolve).toBeDefined());
    rerender({ title: '다른 책' });
    await act(async () => resolve({ ok: true, json: async () => ({ metadata }) }));
    expect(result.current).toBeNull();
  });
});
