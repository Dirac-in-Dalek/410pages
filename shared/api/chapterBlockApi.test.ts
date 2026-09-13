import { beforeEach, expect, it, vi } from 'vitest';
import { createChapterBlock, renameChapterBlock, moveChapterBlock } from './chapterBlockApi';

const mocks = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), update: vi.fn(), select: vi.fn(), eq: vi.fn(), single: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: () => ({ from: mocks.from }) }));
beforeEach(() => {
  for (const fn of [mocks.from, mocks.insert, mocks.update, mocks.select, mocks.eq]) fn.mockReturnValue(mocks);
  mocks.single.mockResolvedValue({ data: { id: 'c', book_id: 'b', label: '제목', depth: 1, page_sort: null, created_at_sort: 10, created_at: '2026-09-11T00:00:00Z' }, error: null });
});

it('stores the level with the title and preserves account/book scope', async () => {
  expect((await createChapterBlock('u', { bookId: 'b', label: '제목', depth: 1, createdAtSort: 10 })).depth).toBe(1);
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u', book_id: 'b', depth: 1 }));
  await renameChapterBlock('u', 'b', 'c', '  제목  ', 0);
  expect(mocks.update).toHaveBeenLastCalledWith({ label: '제목', depth: 0 });
  expect(mocks.eq).toHaveBeenCalledWith('user_id', 'u');
  expect(mocks.eq).toHaveBeenCalledWith('book_id', 'b');
  expect(mocks.eq).toHaveBeenCalledWith('id', 'c');
  await renameChapterBlock('u', 'b', 'c', '이름만');
  expect(mocks.update).toHaveBeenLastCalledWith({ label: '이름만' });
});

it.each([-1, 1.5, NaN, Infinity])('rejects invalid depth %s before a request', async depth => {
  await expect(renameChapterBlock('u', 'b', 'c', '제목', depth)).rejects.toThrow('Invalid chapter depth');
  expect(mocks.from).not.toHaveBeenCalled();
});

it('saves drop order and depth together without rewriting the title', async () => {
  await moveChapterBlock('u', 'b', 'c', 20, 2);
  expect(mocks.update).toHaveBeenLastCalledWith({ created_at_sort: 20, depth: 2 });
  expect(mocks.eq).toHaveBeenCalledWith('user_id', 'u');
  expect(mocks.eq).toHaveBeenCalledWith('book_id', 'b');
  expect(mocks.eq).toHaveBeenCalledWith('id', 'c');
  await moveChapterBlock('u', 'b', 'c', 30, 0);
  expect(mocks.update).toHaveBeenLastCalledWith({ created_at_sort: 30, depth: 0 });
  await moveChapterBlock('u', 'b', 'c', 40);
  expect(mocks.update).toHaveBeenLastCalledWith({ created_at_sort: 40 });
});

it.each([-1, 1.5, NaN, Infinity])('rejects invalid drag depth %s before changing the order', async depth => {
  await expect(moveChapterBlock('u', 'b', 'c', 20, depth)).rejects.toThrow('Invalid chapter depth');
  expect(mocks.from).not.toHaveBeenCalled();
});

it('propagates failed moves without a second partial update', async () => {
  mocks.single.mockResolvedValueOnce({ data: null, error: new Error('offline') });
  await expect(moveChapterBlock('u', 'b', 'c', 20, 1)).rejects.toThrow('offline');
  expect(mocks.update).toHaveBeenCalledTimes(1);
});
