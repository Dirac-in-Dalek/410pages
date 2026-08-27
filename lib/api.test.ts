import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockChapterBlocksOrder = vi.fn();
const mockChapterBlocksSelect = vi.fn(() => chapterBlocksQuery);
const mockChapterBlocksEq = vi.fn(() => chapterBlocksQuery);
const mockChapterBlocksDeleteEq = vi.fn();
const mockCitationsSingle = vi.fn();
const mockCitationsSelect = vi.fn(() => ({ single: mockCitationsSingle }));
const mockCitationsInsert = vi.fn(() => ({ select: mockCitationsSelect }));
const mockCitationsDeleteEq = vi.fn();
const mockCitationsDeleteIn = vi.fn(() => ({ eq: mockCitationsDeleteEq }));
const mockCitationsDelete = vi.fn(() => ({ in: mockCitationsDeleteIn }));
const mockGetSession = vi.fn();
const mockRpc = vi.fn();
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
const mockAuthorsSingle = vi.fn();
const mockAuthorsNeq = vi.fn(() => authorsQuery);
const mockAuthorsOrder = vi.fn(() => authorsQuery);
const mockAuthorsEq = vi.fn(() => authorsQuery);
const mockAuthorsSelect = vi.fn(() => authorsQuery);
const authorsQuery = {
  select: mockAuthorsSelect,
  eq: mockAuthorsEq,
  neq: mockAuthorsNeq,
  order: mockAuthorsOrder,
  maybeSingle: mockAuthorsMaybeSingle,
  single: mockAuthorsSingle,
};
const mockBooksSingle = vi.fn();
const mockBooksInsertSelect = vi.fn(() => ({
  single: mockBooksSingle,
}));
const mockBooksInsert = vi.fn(() => ({
  select: mockBooksInsertSelect,
}));
const mockBooksMaybeSingle = vi.fn();
const mockBooksUpdate = vi.fn(() => booksQuery);
const mockBooksNeq = vi.fn(() => booksQuery);
const mockBooksLimit = vi.fn(() => booksQuery);
const mockBooksOrder = vi.fn(() => booksQuery);
const mockBooksEq = vi.fn(() => booksQuery);
const mockBooksSelect = vi.fn(() => booksQuery);
const booksQuery = {
  select: mockBooksSelect,
  eq: mockBooksEq,
  order: mockBooksOrder,
  limit: mockBooksLimit,
  neq: mockBooksNeq,
  maybeSingle: mockBooksMaybeSingle,
  single: mockBooksSingle,
  insert: mockBooksInsert,
  update: mockBooksUpdate,
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

  if (table === 'citations') {
    return { insert: mockCitationsInsert, delete: mockCitationsDelete };
  }

  return {};
});

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
    storage: {
      from: mockStorageFrom,
    },
    from: mockChapterBlocksFrom,
    rpc: mockRpc,
  }),
}));

import { api, PROFILE_AVATAR_BUCKET } from './api';

beforeEach(() => {
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: 'user-1' } } },
    error: null,
  });
});

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

describe('api.addCitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfileSingle.mockResolvedValue({ data: { username: 'Me' }, error: null });
    mockAuthorsMaybeSingle.mockResolvedValue({
      data: { id: 'author-1', name: 'Author A', sort_index: 1, is_self: false },
      error: null,
    });
    mockBooksMaybeSingle.mockResolvedValue({
      data: { id: 'book-1', sort_index: 2 },
      error: null,
    });
    mockBooksSingle.mockResolvedValue({
      data: {
        id: 'book-1',
        title: 'Canonical Book',
        sort_index: 2,
        created_at: '2026-07-18T06:00:00.000Z',
        author: { id: 'author-1', name: 'Canonical Author', sort_index: 1, is_self: false },
      },
      error: null,
    });
    mockCitationsSingle.mockResolvedValue({
      data: {
        id: 'citation-1',
        kind: 'word',
        text: '고독',
        page: null,
        page_sort: null,
        created_at: '2026-07-18T06:00:00.000Z',
        author: { id: 'author-1', name: 'Author A', sort_index: 1, is_self: false },
        book: { id: 'book-1', title: 'Book A', sort_index: 2 },
      },
      error: null,
    });
  });

  it('persists a word kind with null page fields', async () => {
    const result = await api.addCitation('user-1', {
      id: 'ignored-by-input-type',
      kind: 'word',
      text: '고독',
      author: 'Author A',
      book: 'Book A',
      page: '77',
      tags: [],
      highlights: [],
    } as any);

    expect(mockCitationsInsert).toHaveBeenCalledWith({
      kind: 'word',
      text: '고독',
      book_id: 'book-1',
      author_id: 'author-1',
      page: null,
      page_sort: null,
      user_id: 'user-1',
    });
    expect(result).toMatchObject({ kind: 'word', page: undefined, pageSort: undefined });
  });

  it('uses a supplied book id as the canonical citation source', async () => {
    await api.addCitation('user-1', {
      kind: 'sentence',
      text: 'Canonical sentence',
      bookId: 'book-1',
      author: 'Stale Author',
      book: 'Stale Book',
      page: '12',
      tags: [],
      highlights: [],
    });

    expect(mockBooksEq).toHaveBeenCalledWith('id', 'book-1');
    expect(mockCitationsInsert).toHaveBeenCalledWith(expect.objectContaining({
      book_id: 'book-1',
      author_id: 'author-1',
    }));
    expect(mockProfileSingle).not.toHaveBeenCalled();
  });
});

describe('api.deleteCitations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });
    mockCitationsDeleteEq.mockResolvedValue({ error: null });
  });

  it('deletes all requested citations in one user-scoped query', async () => {
    await api.deleteCitations('user-1', ['citation-1', 'citation-2']);

    expect(mockChapterBlocksFrom).toHaveBeenCalledTimes(1);
    expect(mockChapterBlocksFrom).toHaveBeenCalledWith('citations');
    expect(mockCitationsDelete).toHaveBeenCalledTimes(1);
    expect(mockCitationsDeleteIn).toHaveBeenCalledWith('id', ['citation-1', 'citation-2']);
    expect(mockCitationsDeleteEq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('stops before deletion when the active account has changed', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-2' } } },
      error: null,
    });

    await expect(api.deleteCitations('user-1', ['citation-1'])).rejects.toThrow(
      'Active user changed before deletion'
    );
    expect(mockCitationsDelete).not.toHaveBeenCalled();
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

describe('api.fetchAuthors', () => {
  it('fetches authors even when they have no books', async () => {
    (mockAuthorsOrder as any).mockResolvedValueOnce({
      data: [{
        id: 'author-empty',
        name: 'Empty Author',
        sort_index: 4,
        created_at: '2026-04-07T09:00:00.000Z',
        is_self: false,
      }],
      error: null,
    });

    await expect(api.fetchAuthors('user-1')).resolves.toEqual([{
      id: 'author-empty',
      name: 'Empty Author',
      sortIndex: 4,
      createdAt: new Date('2026-04-07T09:00:00.000Z').getTime(),
      isSelf: false,
    }]);
    expect(mockAuthorsEq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});

describe('api.createBook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: {
        authorId: 'author-1',
        authorName: 'Author A',
        authorSortIndex: 1,
        authorCreatedAt: '2026-04-07T09:00:00.000Z',
        isSelf: false,
        bookId: 'book-2',
        bookTitle: 'Book B',
        bookSortIndex: 3,
        bookCreatedAt: '2026-04-07T10:10:00.000Z',
      },
      error: null,
    });
  });

  it('creates a persisted book under the resolved author', async () => {
    const book = await api.createBook('user-1', {
      authorId: 'author-1',
      title: 'Book B',
    });

    expect(mockRpc).toHaveBeenCalledWith('get_or_create_book', {
      expected_user_id: 'user-1',
      source_author_id: 'author-1',
      requested_title: 'Book B',
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

describe('api book deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('previews and deletes through user-bound atomic RPCs', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { bookId: 'book-1', citationCount: 3 }, error: null })
      .mockResolvedValueOnce({ data: { bookId: 'book-1', deletedCitationCount: 3 }, error: null });

    await expect(api.previewBookDeletion('user-1', 'book-1')).resolves.toEqual({ bookId: 'book-1', citationCount: 3 });
    await expect(api.deleteBookCascade('user-1', 'book-1')).resolves.toEqual({ bookId: 'book-1', deletedCitationCount: 3 });

    expect(mockRpc).toHaveBeenNthCalledWith(1, 'preview_book_deletion', {
      expected_user_id: 'user-1', source_book_id: 'book-1',
    });
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'delete_book_cascade', {
      expected_user_id: 'user-1', source_book_id: 'book-1',
    });
  });
});

describe('api.createAuthor', () => {
  it('returns the existing or created author from the atomic RPC', async () => {
    mockRpc.mockResolvedValue({
      data: {
        authorId: 'author-1',
        authorName: 'Author A',
        authorSortIndex: 2,
        authorCreatedAt: '2026-04-07T09:00:00.000Z',
        isSelf: false,
      },
      error: null,
    });

    await expect(api.createAuthor('user-1', ' Author A ')).resolves.toMatchObject({
      id: 'author-1',
      name: 'Author A',
      sortIndex: 2,
    });
    expect(mockRpc).toHaveBeenCalledWith('get_or_create_author', {
      expected_user_id: 'user-1',
      requested_name: 'Author A',
    });
  });

  it('stops before the RPC when the active account has changed', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-2' } } },
      error: null,
    });

    await expect(api.createAuthor('user-1', 'Author A')).rejects.toThrow(
      'Active user changed before author creation'
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe('api.renameBook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: {
        merged: true,
        fromBookId: 'book-1',
        bookId: 'book-2',
        bookTitle: 'Existing Book',
        bookSortIndex: 2,
      },
      error: null,
    });
  });

  it('runs the complete book rename-or-merge decision in one RPC', async () => {
    const result = await api.renameBook('user-1', 'book-1', 'Existing Book');

    expect(mockRpc).toHaveBeenCalledWith('rename_or_merge_book', {
      source_book_id: 'book-1',
      requested_title: 'Existing Book',
    });
    expect(result).toMatchObject({
      merged: true,
      fromBookId: 'book-1',
      bookId: 'book-2',
    });
  });
});

describe('api.renameAuthor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: {
        merged: true,
        fromAuthorId: 'author-1',
        authorId: 'author-2',
        authorName: 'Existing Author',
        authorSortIndex: 2,
        isSelf: false,
        bookMerges: [],
      },
      error: null,
    });
  });

  it('runs the complete author rename-or-merge decision in one RPC', async () => {
    const result = await api.renameAuthor('user-1', 'author-1', 'Existing Author');

    expect(mockRpc).toHaveBeenCalledWith('rename_or_merge_author_with_folder', {
      source_author_id: 'author-1',
      requested_name: 'Existing Author',
    });
    expect(result).toMatchObject({
      merged: true,
      fromAuthorId: 'author-1',
      authorId: 'author-2',
    });
  });

  it('propagates an atomic merge failure without returning a partial result', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('merge failed') });

    await expect(api.renameAuthor('user-1', 'author-1', 'Existing Author'))
      .rejects.toThrow('merge failed');
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
