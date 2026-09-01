import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthorSource } from '../types';

const { reorderAuthorsMock, reorderBooksMock } = vi.hoisted(() => ({
  reorderAuthorsMock: vi.fn(),
  reorderBooksMock: vi.fn(),
}));

vi.mock('../shared/api/authorApi', () => ({ reorderAuthors: reorderAuthorsMock }));
vi.mock('../shared/api/bookApi', () => ({ reorderBooks: reorderBooksMock }));

import { useArchiveFilter } from './useArchiveFilter';

const authors: AuthorSource[] = [
  { id: 'author-1', name: 'First', sortIndex: 0, createdAt: 1, isSelf: false },
  { id: 'author-2', name: 'Second', sortIndex: 1, createdAt: 2, isSelf: false },
];

const setup = () => renderHook(() => useArchiveFilter(
  [],
  authors,
  [],
  [],
  [],
  [],
  'Me',
  'user-1'
));

describe('useArchiveFilter library reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reorderAuthorsMock.mockResolvedValue(undefined);
    reorderBooksMock.mockResolvedValue(undefined);
  });

  it('optimistically reorders one author group and persists the full author order', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.treeData.filter((item) => item.type === 'author')).toHaveLength(2));

    await act(async () => {
      expect(await result.current.handleReorderAuthorAt(['author-1', 'author-2'], 'author-1', 2)).toBe(true);
    });

    expect(reorderAuthorsMock).toHaveBeenCalledWith('user-1', ['author-2', 'author-1']);
    expect(result.current.treeData.filter((item) => item.type === 'author').map((item) => item.data?.authorId)).toEqual([
      'author-2',
      'author-1',
    ]);
  });

  it('restores author order and exposes an error when persistence fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    reorderAuthorsMock.mockRejectedValueOnce(new Error('network'));
    const { result } = setup();
    await waitFor(() => expect(result.current.treeData.filter((item) => item.type === 'author')).toHaveLength(2));

    await act(async () => {
      expect(await result.current.handleReorderAuthorAt(['author-1', 'author-2'], 'author-1', 2)).toBe(false);
    });

    expect(result.current.treeData.filter((item) => item.type === 'author').map((item) => item.data?.authorId)).toEqual([
      'author-1',
      'author-2',
    ]);
    expect(result.current.libraryOrderError).toContain('이전 순서');
    consoleError.mockRestore();
  });
});
