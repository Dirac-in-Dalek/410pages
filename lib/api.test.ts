import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockChapterBlocksOrder = vi.fn();
const mockChapterBlocksSelect = vi.fn(() => chapterBlocksQuery);
const mockChapterBlocksEq = vi.fn(() => chapterBlocksQuery);
const mockChapterBlocksDeleteEq = vi.fn();
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
const mockChapterBlocksDelete = vi.fn(() => ({
  eq: mockChapterBlocksDeleteEq,
}));
const mockProfileSingle = vi.fn();
const mockProfileEq = vi.fn(() => profileQuery);
const mockProfileSelect = vi.fn(() => profileQuery);
const profileQuery = {
  select: mockProfileSelect,
  eq: mockProfileEq,
  single: mockProfileSingle,
};
const mockAuthorsMaybeSingle = vi.fn();
const mockAuthorsEq = vi.fn(() => authorsQuery);
const mockAuthorsSelect = vi.fn(() => authorsQuery);
const authorsQuery = {
  select: mockAuthorsSelect,
  eq: mockAuthorsEq,
  maybeSingle: mockAuthorsMaybeSingle,
};
const mockBooksSingle = vi.fn();
const mockBooksInsertSelect = vi.fn(() => ({
  single: mockBooksSingle,
}));
const mockBooksInsert = vi.fn(() => ({
  select: mockBooksInsertSelect,
}));
const mockBooksMaybeSingle = vi.fn();
const mockBooksLimit = vi.fn(() => booksQuery);
const mockBooksOrder = vi.fn(() => booksQuery);
const mockBooksEq = vi.fn(() => booksQuery);
const mockBooksSelect = vi.fn(() => booksQuery);
const booksQuery = {
  select: mockBooksSelect,
  eq: mockBooksEq,
  order: mockBooksOrder,
  limit: mockBooksLimit,
  maybeSingle: mockBooksMaybeSingle,
  insert: mockBooksInsert,
};
const chapterBlocksQuery = {
  select: mockChapterBlocksSelect,
  eq: mockChapterBlocksEq,
  order: mockChapterBlocksOrder,
};
const mockChapterBlocksFrom = vi.fn((table: string) => {
  if (table === 'profiles') {
    return profileQuery;
  }

  if (table === 'authors') {
    return authorsQuery;
  }

  if (table === 'books') {
    return booksQuery;
  }

  if (table === 'chapter_blocks') {
    return {
      ...chapterBlocksQuery,
      insert: mockChapterBlocksInsert,
      delete: mockChapterBlocksDelete,
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

describe('api.fetchBooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockBooksOrder as any)
      .mockReturnValueOnce(booksQuery)
      .mockResolvedValueOnce({
        data: [
          {
            id: 'book-1',
            title: 'Book A',
            sort_index: 2,
            created_at: '2026-04-07T10:00:00.000Z',
            author: {
              id: 'author-1',
              name: 'Author A',
              sort_index: 1,
              is_self: false,
            },
          },
        ],
        error: null,
      });
  });

  it('fetches persisted books with author metadata', async () => {
    const books = await api.fetchBooks('user-1');

    expect(mockChapterBlocksFrom).toHaveBeenCalledWith('books');
    expect(mockBooksSelect).toHaveBeenCalledWith(`
        id,
        title,
        sort_index,
        created_at,
        author:authors(id, name, sort_index, is_self)
      `);
    expect(mockBooksEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockBooksOrder).toHaveBeenNthCalledWith(1, 'sort_index', {
      ascending: true,
      nullsFirst: false,
    });
    expect(mockBooksOrder).toHaveBeenNthCalledWith(2, 'created_at', {
      ascending: true,
    });
    expect(books).toEqual([
      {
        id: 'book-1',
        title: 'Book A',
        sortIndex: 2,
        createdAt: new Date('2026-04-07T10:00:00.000Z').getTime(),
        authorId: 'author-1',
        author: 'Author A',
        authorSortIndex: 1,
        isSelf: false,
      },
    ]);
  });
});

describe('api.createBook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfileSingle.mockResolvedValue({
      data: { username: 'Me' },
      error: null,
    });
    mockAuthorsMaybeSingle.mockResolvedValue({
      data: {
        id: 'author-1',
        name: 'Author A',
        sort_index: 1,
        is_self: false,
      },
      error: null,
    });
    mockBooksMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { sort_index: 2 }, error: null });
    mockBooksSingle.mockResolvedValue({
      data: {
        id: 'book-2',
        title: 'Book B',
        sort_index: 3,
        created_at: '2026-04-07T10:10:00.000Z',
        author: {
          id: 'author-1',
          name: 'Author A',
          sort_index: 1,
          is_self: false,
        },
      },
      error: null,
    });
  });

  it('creates a persisted book under the resolved author', async () => {
    const book = await api.createBook('user-1', {
      author: 'Author A',
      title: 'Book B',
    });

    expect(mockBooksInsert).toHaveBeenCalledWith({
      title: 'Book B',
      author_id: 'author-1',
      user_id: 'user-1',
      sort_index: 3,
    });
    expect(book).toMatchObject({
      id: 'book-2',
      title: 'Book B',
      authorId: 'author-1',
      author: 'Author A',
      sortIndex: 3,
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

describe('api.deleteChapterBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChapterBlocksDeleteEq
      .mockReturnValueOnce({ eq: mockChapterBlocksDeleteEq })
      .mockResolvedValueOnce({ error: null });
  });

  it('deletes a chapter block scoped to the current user', async () => {
    await api.deleteChapterBlock('user-1', 'block-1');

    expect(mockChapterBlocksFrom).toHaveBeenCalledWith('chapter_blocks');
    expect(mockChapterBlocksDelete).toHaveBeenCalled();
    expect(mockChapterBlocksDeleteEq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1');
    expect(mockChapterBlocksDeleteEq).toHaveBeenNthCalledWith(2, 'id', 'block-1');
  });
});
