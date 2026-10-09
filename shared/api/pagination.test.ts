import { expect, it, vi } from 'vitest';
import { fetchAllRows } from './pagination';

it.each([1000, 137, 1])('reads all rows with an enforced server cap of %s', async (cap) => {
  const rows = Array.from({ length: 1005 }, (_, id) => ({ id }));
  const page = vi.fn(async (from: number, to: number) => ({
    data: rows.slice(from, Math.min(to + 1, from + cap)),
    error: null,
  }));
  expect(await fetchAllRows(page)).toEqual(rows);
  expect(page.mock.calls.at(-1)?.[0]).toBe(rows.length);
});

it('rejects a failure after the first page instead of returning a partial archive', async () => {
  const page = vi
    .fn()
    .mockResolvedValueOnce({ data: [{ id: 1 }], error: null })
    .mockResolvedValueOnce({ data: null, error: new Error('offline') });
  await expect(fetchAllRows(page)).rejects.toThrow('offline');
});
