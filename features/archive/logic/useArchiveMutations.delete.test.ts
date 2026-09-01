import { useState } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthorFolder, AuthorFolderMembership, AuthorSource, BookSource, ChapterBlock, Citation, Project } from '../../../types';

const { mockAddCitation, mockCreateAuthor, mockCreateBook, mockCreateAuthorFolder, mockDeleteAuthorCascade, mockDeleteBookCascade, mockMoveAuthorToFolder, mockRemoveAuthorFromFolder, mockCreateChapterBlock, mockDeleteChapterBlock, mockDeleteCitations, mockAddCitationsToProject, mockCreateProjectRecord, mockRenameBook, mockUpdateBookMemo } = vi.hoisted(() => ({
  mockAddCitation: vi.fn(),
  mockCreateAuthor: vi.fn(),
  mockCreateBook: vi.fn(),
  mockCreateAuthorFolder: vi.fn(),
  mockDeleteAuthorCascade: vi.fn(),
  mockDeleteBookCascade: vi.fn(),
  mockMoveAuthorToFolder: vi.fn(),
  mockRemoveAuthorFromFolder: vi.fn(),
  mockCreateChapterBlock: vi.fn(),
  mockDeleteChapterBlock: vi.fn(),
  mockDeleteCitations: vi.fn(),
  mockAddCitationsToProject: vi.fn(),
  mockCreateProjectRecord: vi.fn(),
  mockRenameBook: vi.fn(),
  mockUpdateBookMemo: vi.fn(),
}));

vi.mock('../../../shared/api/authorFolderApi', () => ({
  createAuthorFolder: mockCreateAuthorFolder,
  deleteAuthorCascade: mockDeleteAuthorCascade,
  deleteAuthorFolder: vi.fn(),
  moveAuthorToFolder: mockMoveAuthorToFolder,
  removeAuthorFromFolder: mockRemoveAuthorFromFolder,
  renameAuthorFolder: vi.fn(),
  previewAuthorDeletion: vi.fn(),
}));

vi.mock('../../../shared/api/authorApi', () => ({
  createAuthor: mockCreateAuthor,
  renameAuthor: vi.fn(),
}));

vi.mock('../../../shared/api/bookApi', () => ({
  createBook: mockCreateBook,
  deleteBookCascade: mockDeleteBookCascade,
  previewBookDeletion: vi.fn(),
  renameBook: mockRenameBook,
  updateBookMemo: mockUpdateBookMemo,
}));

vi.mock('../../../shared/api/citationApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/api/citationApi')>();
  return {
    ...actual,
    addCitation: mockAddCitation,
    deleteCitations: mockDeleteCitations,
  };
});

vi.mock('../../../shared/api/chapterBlockApi', () => ({
  createChapterBlock: mockCreateChapterBlock,
  deleteChapterBlock: mockDeleteChapterBlock,
}));

vi.mock('../../../shared/api/projectApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../shared/api/projectApi')>(),
  addCitationsToProject: mockAddCitationsToProject,
  createProject: mockCreateProjectRecord,
}));

import { useArchiveMutations } from './useArchiveMutations';
import { readCitationDrafts, storeCitationDraft } from './citationDraftStorage';

const persistedCitation: Citation = {
  id: 'citation-1',
  kind: 'sentence',
  text: 'Persisted sentence.',
  author: 'Author',
  book: 'Book',
  notes: [],
  tags: [],
  createdAt: 1,
};

const failedOptimisticCitation: Citation = {
  ...persistedCitation,
  id: 'optimistic-citation-failed',
  text: 'Failed local sentence.',
  saveStatus: 'failed',
};

const setup = (
  initialCitations: Citation[],
  options: {
    initialChapterBlocks?: Record<string, ChapterBlock[]>;
    initialAuthors?: AuthorSource[];
    initialBooks?: BookSource[];
    initialAuthorFolders?: AuthorFolder[];
    initialAuthorFolderMemberships?: AuthorFolderMembership[];
    refreshChapterBlocks?: (bookId: string) => void | Promise<void>;
    refreshAuthorFolders?: () => void | Promise<void>;
  } = {}
) => renderHook(() => {
  const [citations, setCitations] = useState(initialCitations);
  const [projects, setProjects] = useState<Project[]>([{
    id: 'project-1',
    name: 'Folder',
    citationIds: initialCitations.map((citation) => citation.id),
  }]);
  const [books, setBooks] = useState<BookSource[]>(options.initialBooks ?? []);
  const [authors, setAuthors] = useState<AuthorSource[]>(options.initialAuthors ?? []);
  const [authorFolders, setAuthorFolders] = useState<AuthorFolder[]>(options.initialAuthorFolders ?? []);
  const [authorFolderMemberships, setAuthorFolderMemberships] = useState<AuthorFolderMembership[]>(options.initialAuthorFolderMemberships ?? []);
  const [chapterBlocksByBook, setChapterBlocksByBook] = useState<Record<string, ChapterBlock[]>>(
    options.initialChapterBlocks ?? {}
  );
  const mutations = useArchiveMutations({
    session: { user: { id: 'user-1' } },
    projects,
    citations,
    authors,
    books,
    authorFolderMemberships,
    setProjects,
    setCitations,
    setAuthors,
    setAuthorFolders,
    setAuthorFolderMemberships,
    setBooks,
    setChapterBlocksByBook,
    refreshChapterBlocks: options.refreshChapterBlocks,
    refreshAuthorFolders: options.refreshAuthorFolders,
  });
  return { citations, projects, authors, authorFolders, authorFolderMemberships, books, chapterBlocksByBook, setCitations, ...mutations };
});

describe('useArchiveMutations grouped citation deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockAddCitation.mockResolvedValue({ ...persistedCitation, id: 'persisted-retry' });
    mockCreateChapterBlock.mockResolvedValue({
      id: 'block-new',
      bookId: 'book-1',
      label: '제2장',
      pageSort: 20,
      createdAtSort: 20,
      createdAt: 20,
    });
    mockDeleteChapterBlock.mockResolvedValue(undefined);
    mockDeleteCitations.mockResolvedValue(undefined);
  });

  it('deletes persisted and failed ids from the server in one call', async () => {
    const { result } = setup([persistedCitation, failedOptimisticCitation]);

    let didDelete = false;
    await act(async () => {
      didDelete = await result.current.handleDeleteCitations([
        persistedCitation.id,
        failedOptimisticCitation.id,
      ]);
    });

    expect(didDelete).toBe(true);
    expect(mockDeleteCitations).toHaveBeenCalledTimes(1);
    expect(mockDeleteCitations).toHaveBeenCalledWith('user-1', [
      'citation-1',
      'optimistic-citation-failed',
    ]);
    expect(result.current.citations).toEqual([]);
    expect(result.current.projects[0].citationIds).toEqual([]);
  });

  it('also deletes a failed draft UUID from the server to prevent resurrection', async () => {
    const { result } = setup([failedOptimisticCitation]);

    await act(async () => {
      await result.current.handleDeleteCitations([failedOptimisticCitation.id]);
    });

    expect(mockDeleteCitations).toHaveBeenCalledWith('user-1', [failedOptimisticCitation.id]);
    expect(result.current.citations).toEqual([]);
    expect(result.current.projects[0].citationIds).toEqual([]);
  });

  it('returns one group failure without applying a partial local deletion', async () => {
    mockDeleteCitations.mockRejectedValue(new Error('delete failed'));
    const { result } = setup([persistedCitation, failedOptimisticCitation]);

    let didDelete = true;
    await act(async () => {
      didDelete = await result.current.handleDeleteCitations([
        persistedCitation.id,
        failedOptimisticCitation.id,
      ]);
    });

    expect(didDelete).toBe(false);
    expect(result.current.citations).toEqual([persistedCitation, failedOptimisticCitation]);
    expect(result.current.projects[0].citationIds).toEqual([
      persistedCitation.id,
      failedOptimisticCitation.id,
    ]);
    expect(result.current.mutationError).toBe('선택한 항목을 삭제하지 못해 다시 복원했습니다.');
  });

  it('clears stale source ids when a failed draft is edited before retry', async () => {
    const failedDraft: Citation = {
      ...failedOptimisticCitation,
      authorId: 'old-author-id',
      authorSortIndex: 1,
      bookId: 'old-book-id',
      bookSortIndex: 2,
    };
    const { result } = setup([failedDraft]);

    await act(async () => {
      await result.current.handleUpdateCitation(failedDraft.id, {
        author: 'New author',
        book: 'New book',
      });
    });
    await act(async () => {
      await result.current.handleRetryCitationSave(failedDraft.id);
      await Promise.resolve();
    });

    expect(mockAddCitation).toHaveBeenCalledWith('user-1', expect.objectContaining({
      author: 'New author',
      book: 'New book',
      authorId: undefined,
      bookId: undefined,
    }));
  });

  it('keeps source ids when only failed draft content changes before retry', async () => {
    const failedDraft: Citation = {
      ...failedOptimisticCitation,
      authorId: 'author-id',
      authorSortIndex: 1,
      bookId: 'book-id',
      bookSortIndex: 2,
    };
    const { result } = setup([failedDraft]);

    await act(async () => {
      await result.current.handleUpdateCitation(failedDraft.id, {
        text: 'Edited local sentence.',
        author: failedDraft.author,
        book: failedDraft.book,
      });
    });
    await act(async () => {
      await result.current.handleRetryCitationSave(failedDraft.id);
      await Promise.resolve();
    });

    expect(mockAddCitation).toHaveBeenCalledWith('user-1', expect.objectContaining({
      text: 'Edited local sentence.',
      authorId: 'author-id',
      bookId: 'book-id',
    }));
  });

  it('keeps the author id when only the failed draft book name changes', async () => {
    const failedDraft: Citation = {
      ...failedOptimisticCitation,
      authorId: 'author-id',
      authorSortIndex: 1,
      bookId: 'book-id',
      bookSortIndex: 2,
    };
    const { result } = setup([failedDraft]);

    await act(async () => {
      await result.current.handleUpdateCitation(failedDraft.id, {
        author: failedDraft.author,
        book: 'New book',
      });
    });
    await act(async () => {
      await result.current.handleRetryCitationSave(failedDraft.id);
      await Promise.resolve();
    });

    expect(mockAddCitation).toHaveBeenCalledWith('user-1', expect.objectContaining({
      authorId: 'author-id',
      bookId: undefined,
    }));
  });

  it('keeps a failed draft storage record aligned after a book merge', async () => {
    const failedDraft: Citation = {
      ...failedOptimisticCitation,
      bookId: 'book-old',
      book: 'Old book',
      bookSortIndex: 1,
    };
    storeCitationDraft('user-1', failedDraft);
    mockRenameBook.mockResolvedValueOnce({
      merged: true,
      fromBookId: 'book-old',
      bookId: 'book-new',
      bookTitle: 'Merged book',
      bookSortIndex: 2,
      bookMemo: 'Merged memo',
    });
    const { result } = setup([failedDraft]);

    await act(async () => {
      await result.current.handleRenameBook('book-old', 'Merged book');
    });

    expect(readCitationDrafts('user-1')).toEqual([
      expect.objectContaining({ bookId: 'book-new', book: 'Merged book', bookSortIndex: 2 }),
    ]);
  });

  it('keeps the same UUID and a newer local book merge when an older save response finishes last', async () => {
    let finishSave!: (citation: Citation) => void;
    mockAddCitation.mockImplementationOnce(
      () => new Promise<Citation>((resolve) => { finishSave = resolve; })
    );
    const { result } = setup([]);
    let optimisticId = '';
    let addPromise!: ReturnType<typeof result.current.handleAddCitationOptimistic>;

    act(() => {
      addPromise = result.current.handleAddCitationOptimistic({
        kind: 'sentence',
        text: 'Concurrent sentence.',
        author: 'Author',
        book: 'Old book',
        bookId: 'old-book-id',
        tags: [],
      });
    });
    await waitFor(() => expect(result.current.citations).toHaveLength(1));
    optimisticId = result.current.citations[0].id;
    act(() => {
      result.current.setCitations((current) => current.map((citation) =>
        citation.id === optimisticId
          ? {
              ...citation,
              text: 'Newer local text',
              book: 'Merged book',
              bookId: 'merged-book-id',
              bookSortIndex: 9,
            }
          : citation
      ));
    });

    const persistence = result.current.resolveCitationId(optimisticId);
    await act(async () => {
      finishSave({
        ...persistedCitation,
        id: optimisticId,
        book: 'Old book',
        bookId: 'old-book-id',
        bookSortIndex: 2,
      });
      await addPromise;
      await persistence;
    });

    expect(result.current.citations).toEqual([
      expect.objectContaining({
        id: optimisticId,
        text: 'Newer local text',
        book: 'Merged book',
        bookId: 'merged-book-id',
        bookSortIndex: 9,
        saveStatus: 'failed',
      }),
    ]);
    expect(readCitationDrafts('user-1')).toEqual([
      expect.objectContaining({ id: optimisticId, text: 'Newer local text', saveStatus: 'failed' }),
    ]);
  });

  it('returns immediately and keeps an eventual failure as a retryable local draft', async () => {
    mockAddCitation.mockRejectedValueOnce(new Error('offline'));
    const { result } = setup([]);

    let addResult;
    await act(async () => {
      addResult = await result.current.handleAddCitationOptimistic({
        kind: 'sentence', text: 'Keep this input', author: 'Author', book: 'Book', tags: [],
      });
    });

    expect(addResult).toMatchObject({ ok: true });
    expect(result.current.citations).toHaveLength(1);
    await waitFor(() => expect(result.current.citations[0]).toMatchObject({
      text: 'Keep this input',
      saveStatus: 'failed',
    }));
    expect(mockAddCitation).toHaveBeenCalledWith('user-1', expect.objectContaining({
      id: result.current.citations[0].id,
    }));
  });

  it('retries a lost response with the same UUID and removes the recovered draft', async () => {
    mockAddCitation.mockRejectedValueOnce(new Error('response lost'));
    const { result } = setup([]);

    await act(async () => {
      await result.current.handleAddCitationOptimistic({
        kind: 'sentence', text: 'Only one row', author: 'Author', book: 'Book', tags: [],
      });
    });
    await waitFor(() => expect(result.current.citations[0]?.saveStatus).toBe('failed'));
    const citationId = result.current.citations[0].id;
    expect(readCitationDrafts('user-1').map((citation) => citation.id)).toEqual([citationId]);

    mockAddCitation.mockResolvedValueOnce({ ...persistedCitation, id: citationId, text: 'Only one row' });
    await act(async () => {
      await result.current.handleRetryCitationSave(citationId);
      await result.current.resolveCitationId(citationId);
    });

    expect(mockAddCitation).toHaveBeenCalledTimes(2);
    expect(mockAddCitation.mock.calls.map(([, input]) => input.id)).toEqual([citationId, citationId]);
    expect(result.current.citations.map((citation) => citation.id)).toEqual([citationId]);
    expect(result.current.citations[0].saveStatus).toBeUndefined();
    expect(readCitationDrafts('user-1')).toEqual([]);
  });

  it('re-fetches the mutated book after creating a chapter block', async () => {
    const refreshChapterBlocks = vi.fn();
    const { result } = setup([], { refreshChapterBlocks });

    await act(async () => {
      await result.current.handleCreateChapterBlock({
        bookId: 'book-1',
        label: '제2장',
        pageSort: 20,
        createdAtSort: 20,
      });
    });

    expect(refreshChapterBlocks).toHaveBeenCalledWith('book-1');
    expect(result.current.chapterBlocksByBook['book-1']).toEqual([
      expect.objectContaining({ id: 'block-new' }),
    ]);
  });

  it('re-fetches the mutated book after deleting a chapter block', async () => {
    const refreshChapterBlocks = vi.fn();
    const existingBlock = {
      id: 'block-old',
      bookId: 'book-1',
      label: '제1장',
      pageSort: 10,
      createdAtSort: 10,
      createdAt: 10,
    } as ChapterBlock;
    const { result } = setup([], {
      initialChapterBlocks: { 'book-1': [existingBlock] },
      refreshChapterBlocks,
    });

    await act(async () => {
      await result.current.handleDeleteChapterBlock('book-1', 'block-old');
    });

    expect(refreshChapterBlocks).toHaveBeenCalledWith('book-1');
    expect(result.current.chapterBlocksByBook['book-1']).toEqual([]);
  });
});

describe('useArchiveMutations author and book creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores an independent author and creates a book with its id', async () => {
    const author: AuthorSource = {
      id: 'author-1', name: 'Author', sortIndex: 0, createdAt: 100, isSelf: false,
    };
    const book: BookSource = {
      id: 'book-1', title: 'Book', sortIndex: 0, createdAt: 200,
      authorId: author.id, author: author.name, authorSortIndex: 0, isSelf: false,
    };
    mockCreateAuthor.mockResolvedValue(author);
    mockCreateBook.mockResolvedValue(book);
    const { result } = setup([]);

    await act(async () => {
      await result.current.handleCreateAuthor('Author');
      await result.current.handleCreateBook({ authorId: author.id, title: 'Book' });
    });

    expect(result.current.authors).toEqual([author]);
    expect(result.current.books).toEqual([book]);
    expect(mockCreateBook).toHaveBeenCalledWith('user-1', {
      authorId: author.id,
      title: 'Book',
    });
  });

  it('restores the previous folder when an optimistic move fails', async () => {
    const author = { id: 'author-1', name: 'Author', sortIndex: 0, createdAt: 1, isSelf: false } as AuthorSource;
    const previous = { authorId: author.id, folderId: 'folder-old', createdAt: 1 } as AuthorFolderMembership;
    mockMoveAuthorToFolder.mockRejectedValueOnce(new Error('offline'));
    const refreshAuthorFolders = vi.fn();
    const { result } = setup([], {
      initialAuthors: [author],
      initialAuthorFolderMemberships: [previous],
      refreshAuthorFolders,
    });

    await act(async () => {
      await result.current.handleMoveAuthorToFolder(author.id, 'folder-new');
    });

    expect(result.current.authorFolderMemberships).toEqual([previous]);
    expect(refreshAuthorFolders).toHaveBeenCalledOnce();
  });

  it('removes an author cascade result from all local archive state', async () => {
    const author = { id: 'author-1', name: 'Author', sortIndex: 0, createdAt: 1, isSelf: false } as AuthorSource;
    const book = { id: 'book-1', title: 'Book', sortIndex: 0, createdAt: 1, authorId: author.id, author: author.name, authorSortIndex: 0, isSelf: false } as BookSource;
    const citation = { ...persistedCitation, authorId: author.id, bookId: book.id };
    mockDeleteAuthorCascade.mockResolvedValueOnce({
      authorId: author.id,
      deletedBookIds: [book.id],
      deletedBookCount: 1,
      deletedCitationCount: 1,
    });
    const { result } = setup([citation], {
      initialAuthors: [author],
      initialBooks: [book],
      initialAuthorFolderMemberships: [{ authorId: author.id, folderId: 'folder-1', createdAt: 1 }],
    });

    await act(async () => {
      await result.current.handleDeleteAuthorCascade(author.id);
    });

    expect(result.current.authors).toEqual([]);
    expect(result.current.books).toEqual([]);
    expect(result.current.citations).toEqual([]);
    expect(result.current.authorFolderMemberships).toEqual([]);
    expect(result.current.projects[0].citationIds).toEqual([]);
  });

  it('does not delete an author while a failed local citation still belongs to it', async () => {
    const author = { id: 'author-1', name: 'Author', sortIndex: 0, createdAt: 1, isSelf: false } as AuthorSource;
    const book = { id: 'book-1', title: 'Book', sortIndex: 0, createdAt: 1, authorId: author.id, author: author.name, authorSortIndex: 0, isSelf: false } as BookSource;
    const failedCitation = {
      ...failedOptimisticCitation,
      authorId: author.id,
      bookId: book.id,
    };
    const { result } = setup([failedCitation], {
      initialAuthors: [author],
      initialBooks: [book],
    });

    await act(async () => {
      await result.current.handleDeleteAuthorCascade(author.id);
    });

    expect(mockDeleteAuthorCascade).not.toHaveBeenCalled();
    expect(result.current.authors).toEqual([author]);
    expect(result.current.citations).toEqual([failedCitation]);
    expect(result.current.mutationError).toContain('저장 중이거나 저장에 실패한 문장');
  });

  it('removes a deleted book and all of its local dependent records', async () => {
    const author = { id: 'author-1', name: 'Author', sortIndex: 0, createdAt: 1, isSelf: false } as AuthorSource;
    const book = { id: 'book-1', title: 'Book', sortIndex: 0, createdAt: 1, authorId: author.id, author: author.name, authorSortIndex: 0, isSelf: false } as BookSource;
    const citation = { ...persistedCitation, authorId: author.id, bookId: book.id };
    mockDeleteBookCascade.mockResolvedValueOnce({ bookId: book.id, deletedCitationCount: 1 });
    const { result } = setup([citation], {
      initialAuthors: [author],
      initialBooks: [book],
      initialChapterBlocks: { 'book-1': [{ id: 'block-1', bookId: book.id, label: 'Chapter', createdAtSort: 1, createdAt: 1 }] },
    });

    await act(async () => {
      await result.current.handleDeleteBookCascade(book.id);
    });

    expect(result.current.authors).toEqual([author]);
    expect(result.current.books).toEqual([]);
    expect(result.current.citations).toEqual([]);
    expect(result.current.projects[0].citationIds).toEqual([]);
    expect(result.current.chapterBlocksByBook).toEqual({});
  });

  it('keeps bulk project writes inside the archive mutation controller', async () => {
    mockAddCitationsToProject.mockResolvedValue(undefined);
    mockCreateProjectRecord.mockResolvedValue({ id: 'project-2', name: 'New folder', citationIds: [] });
    const { result } = setup([]);

    await act(async () => {
      await result.current.handleAddCitationsToProject('project-1', ['citation-1']);
      await result.current.handleCreateProjectWithCitations('New folder', ['citation-2']);
    });

    expect(result.current.projects).toEqual([
      expect.objectContaining({ id: 'project-1', citationIds: ['citation-1'] }),
      expect.objectContaining({ id: 'project-2', citationIds: ['citation-2'] }),
    ]);
  });

  it('updates the local book memo only after the server save succeeds', async () => {
    const book = { id: 'book-1', title: 'Book', memo: 'old', sortIndex: 0, createdAt: 1, authorId: 'author-1', author: 'Author', authorSortIndex: 0, isSelf: false } as BookSource;
    mockUpdateBookMemo.mockResolvedValueOnce(undefined);
    const { result } = setup([], { initialBooks: [book] });

    await act(async () => {
      expect(await result.current.handleUpdateBookMemo(book.id, 'new')).toBe(true);
    });

    expect(mockUpdateBookMemo).toHaveBeenCalledWith('user-1', book.id, 'new');
    expect(result.current.books[0].memo).toBe('new');
  });

  it('keeps the server memo locally when a save fails', async () => {
    const book = { id: 'book-1', title: 'Book', memo: 'old', sortIndex: 0, createdAt: 1, authorId: 'author-1', author: 'Author', authorSortIndex: 0, isSelf: false } as BookSource;
    mockUpdateBookMemo.mockRejectedValueOnce(new Error('network'));
    const { result } = setup([], { initialBooks: [book] });

    await act(async () => {
      expect(await result.current.handleUpdateBookMemo(book.id, 'new')).toBe(false);
    });

    expect(result.current.books[0].memo).toBe('old');
    expect(result.current.mutationError).toContain('서버에 저장하지 못했습니다');
  });
});
