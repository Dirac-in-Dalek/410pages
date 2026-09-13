import { beforeEach, expect, it, vi } from 'vitest';
import { fetchCitations, moveCitation } from './citationApi';
const mocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(), order: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: () => ({ from: mocks.from }) }));
beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of [mocks.from, mocks.update, mocks.eq, mocks.select]) fn.mockReturnValue(mocks);
  mocks.single.mockResolvedValue({ data: { id: 'q', created_at_sort: 25 }, error: null });
});
it('moves only the position and requires the user, book and citation to match', async () => {
  expect(await moveCitation('u', 'book', 'q', 25)).toEqual({ createdAtSort: 25 });
  expect(mocks.update).toHaveBeenCalledWith({ created_at_sort: 25 });
  for (const [field, value] of [['user_id', 'u'], ['book_id', 'book'], ['id', 'q']]) expect(mocks.eq).toHaveBeenCalledWith(field, value);
  expect(mocks.single).toHaveBeenCalledOnce();
});
it.each([NaN, Infinity, -Infinity])('rejects invalid position %s without a request', async value => {
  await expect(moveCitation('u', 'book', 'q', value)).rejects.toThrow('Invalid citation position');
  expect(mocks.from).not.toHaveBeenCalled();
});
it('propagates a failed scoped update instead of claiming the move succeeded', async () => {
  mocks.single.mockResolvedValueOnce({ data: null, error: new Error('No matching row') });
  await expect(moveCitation('u', 'book', 'q', 25)).rejects.toThrow('No matching row');
});
it('restores manual positions while keeping creation timestamps and legacy rows', async () => {
  const row = { text: 'Original', page: '50', page_sort: 50, created_at: '2026-09-01T00:00:00Z', book: { id: 'book', title: 'Book' }, notes: [] };
  mocks.order.mockResolvedValue({ data: [{ ...row, id: 'moved', created_at_sort: 25 }, { ...row, id: 'legacy' }], error: null });
  const result = await fetchCitations();
  expect(result[0].createdAtSort).toBe(25);
  expect(result[0].createdAt).toBe(Date.parse(row.created_at));
  expect(result[0].page).toBe('50');
  expect(result[1].createdAtSort).toBeUndefined();
});
