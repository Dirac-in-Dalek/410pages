import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockChapterBlocksOrder = vi.fn();
const mockChapterBlocksSelect = vi.fn(() => chapterBlocksQuery);
const mockChapterBlocksEq = vi.fn(() => chapterBlocksQuery);
const mockStorageFrom = vi.fn(() => ({
  upload: mockUpload,
  getPublicUrl: mockGetPublicUrl,
}));
const mockChapterBlocksSingle = vi.fn();
const mockChapterBlocksInsertSelect = vi.fn(() => ({
  single: mockChapterBlocksSingle,
}));
const mockChapterBlocksInsert = vi.fn(() => ({
  select: mockChapterBlocksInsertSelect,
}));
const chapterBlocksQuery = {
  select: mockChapterBlocksSelect,
  eq: mockChapterBlocksEq,
  order: mockChapterBlocksOrder,
};
const mockChapterBlocksFrom = vi.fn((table: string) => {
  if (table === 'chapter_blocks') {
    return {
      ...chapterBlocksQuery,
      insert: mockChapterBlocksInsert,
    };
  }

  return {};
});

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({
    storage: {
      from: mockStorageFrom,
    },
    from: mockChapterBlocksFrom,
  }),
}));

import { api, PROFILE_AVATAR_BUCKET } from './api';

describe('api.uploadProfileAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          'https://yyfapuwgvimbjsebfifb.supabase.co/storage/v1/object/public/profile-avatars/user-1/avatar',
      },
    });
  });

  it('uploads an avatar to a single stable object path', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    const nextPath = await api.uploadProfileAvatar('user-1', file);

    expect(mockStorageFrom).toHaveBeenCalledWith(PROFILE_AVATAR_BUCKET);
    expect(mockUpload).toHaveBeenCalledWith('user-1/avatar', file, {
      upsert: true,
      contentType: 'image/png',
      cacheControl: '0',
    });
    expect(nextPath).toBe('user-1/avatar');
  });

  it('builds a cache-busted public url from an avatar path', () => {
    const publicUrl = api.getProfileAvatarPublicUrl('user-1/avatar', 1_700_000_000_000);

    expect(mockStorageFrom).toHaveBeenCalledWith(PROFILE_AVATAR_BUCKET);
    expect(mockGetPublicUrl).toHaveBeenCalledWith('user-1/avatar');
    expect(publicUrl).toBe(
      'https://yyfapuwgvimbjsebfifb.supabase.co/storage/v1/object/public/profile-avatars/user-1/avatar?v=1700000000000'
    );
  });

  it('resolves a legacy public avatar url back to its storage path', () => {
    expect(
      api.resolveStoredProfileAvatarPath(
        'https://yyfapuwgvimbjsebfifb.supabase.co/storage/v1/object/public/profile-avatars/user-1/avatar-1699999999000.png?v=old'
      )
    ).toBe('user-1/avatar-1699999999000.png');
  });
});

describe('api.createChapterBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChapterBlocksSingle.mockResolvedValue({
      data: {
        id: 'block-1',
        book_id: 'book-1',
        label: '3장',
        page_sort: 336,
        created_at_sort: 1700.5,
        created_at: '2026-04-07T10:00:00.000Z',
      },
      error: null,
    });
  });

  it('maps a created chapter block from snake_case to camelCase', async () => {
    const block = await api.createChapterBlock('user-1', {
      bookId: 'book-1',
      label: '3장',
      pageSort: 336,
      createdAtSort: 1700.5,
    });

    expect(mockChapterBlocksFrom).toHaveBeenCalledWith('chapter_blocks');
    expect(mockChapterBlocksInsert).toHaveBeenCalledWith({
      book_id: 'book-1',
      label: '3장',
      page_sort: 336,
      created_at_sort: 1700.5,
      user_id: 'user-1',
    });
    expect(block).toMatchObject({
      id: 'block-1',
      bookId: 'book-1',
      label: '3장',
      pageSort: 336,
      createdAtSort: 1700.5,
    });
  });
});

describe('api.fetchChapterBlocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChapterBlocksOrder.mockResolvedValue({
      data: [
        {
          id: 'block-2',
          book_id: 'book-1',
          label: '2장',
          page_sort: null,
          created_at_sort: 1701,
          created_at: '2026-04-07T10:05:00.000Z',
        },
        {
          id: 'block-1',
          book_id: 'book-1',
          label: '1장',
          page_sort: 12,
          created_at_sort: 1700,
          created_at: '2026-04-07T10:00:00.000Z',
        },
      ],
      error: null,
    });
  });

  it('maps rows and requests chapter blocks sorted by created_at_sort ascending', async () => {
    const blocks = await api.fetchChapterBlocks('user-1', 'book-1');

    expect(mockChapterBlocksFrom).toHaveBeenCalledWith('chapter_blocks');
    expect(mockChapterBlocksSelect).toHaveBeenCalledWith('*');
    expect(mockChapterBlocksEq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1');
    expect(mockChapterBlocksEq).toHaveBeenNthCalledWith(2, 'book_id', 'book-1');
    expect(mockChapterBlocksOrder).toHaveBeenCalledWith('created_at_sort', {
      ascending: true,
    });
    expect(blocks).toEqual([
      {
        id: 'block-2',
        bookId: 'book-1',
        label: '2장',
        pageSort: undefined,
        createdAtSort: 1701,
        createdAt: new Date('2026-04-07T10:05:00.000Z').getTime(),
      },
      {
        id: 'block-1',
        bookId: 'book-1',
        label: '1장',
        pageSort: 12,
        createdAtSort: 1700,
        createdAt: new Date('2026-04-07T10:00:00.000Z').getTime(),
      },
    ]);
  });
});
