import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppendBookOrderKey, mutateWithBookOrderRetry } from './bookOrderApi';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rows: new Map<string, { max?: string; next?: string }>(),
}));

vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: () => ({ from: mocks.from }),
}));

beforeEach(() => {
  mocks.rows.clear();
  mocks.from.mockReset();
  mocks.from.mockImplementation((table: string) => {
    let after: string | undefined;
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      not: vi.fn(() => query),
      gt: vi.fn((_column: string, value: string) => {
        after = value;
        return query;
      }),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        const key = after === undefined ? mocks.rows.get(table)?.max : mocks.rows.get(table)?.next;
        return { data: key ? { order_key: key } : null, error: null };
      }),
    };
    return query;
  });
});

describe('book order API helpers', () => {
  it('appends after the greatest key across citations and chapter blocks', async () => {
    mocks.rows.set('citations', { max: 'a1V' });
    mocks.rows.set('chapter_blocks', { max: 'a2V' });

    const key = await createAppendBookOrderKey('user-1', 'book-1');

    expect(key > 'a2V').toBe(true);
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual(['citations', 'chapter_blocks']);
  });

  it('regenerates only an order-key conflict and returns the server accepted key', async () => {
    mocks.rows.set('citations', { next: 'a3V' });
    const mutate = vi.fn()
      .mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'Duplicate book order key' },
      })
      .mockImplementationOnce(async (orderKey: string) => ({
        data: { id: 'citation-1', order_key: orderKey },
        error: null,
      }));

    const stored = await mutateWithBookOrderRetry('user-1', 'book-1', 'a1V', mutate);

    expect(mutate).toHaveBeenCalledTimes(2);
    expect(stored.order_key).toBe(mutate.mock.calls[1][0]);
    expect(stored.order_key! > 'a1V' && stored.order_key! < 'a3V').toBe(true);
  });

  it('does not retry an unrelated unique violation', async () => {
    const error = { code: '23505', message: 'duplicate key value violates unique constraint citations_pkey' };
    const mutate = vi.fn().mockResolvedValue({ data: null, error });

    await expect(mutateWithBookOrderRetry('user-1', 'book-1', 'a1V', mutate)).rejects.toBe(error);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('rejects a malformed key before reading or mutating', async () => {
    const mutate = vi.fn();

    await expect(mutateWithBookOrderRetry('user-1', 'book-1', 'not/a/key', mutate)).rejects.toThrow('Invalid book position');
    expect(mutate).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
