import { useState } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthorFolder, AuthorFolderMembership, AuthorSource, BookSource, ChapterBlock, Citation, Project } from '../../../types';
import { useArchiveQuery } from './useArchiveQuery';

const fetchCitationsMock = vi.fn();
const fetchBooksMock = vi.fn();
const fetchAuthorsMock = vi.fn();
const fetchAuthorFoldersMock = vi.fn();
const fetchProjectsMock = vi.fn();
const fetchChapterBlocksMock = vi.fn();

vi.mock('../../../shared/api/citationApi', () => ({
  fetchCitations: (...args: unknown[]) => fetchCitationsMock(...args),
}));
vi.mock('../../../shared/api/bookApi', () => ({
  fetchBooks: (...args: unknown[]) => fetchBooksMock(...args),
}));
vi.mock('../../../shared/api/authorApi', () => ({
  fetchAuthors: (...args: unknown[]) => fetchAuthorsMock(...args),
}));
vi.mock('../../../shared/api/authorFolderApi', () => ({
  fetchAuthorFolders: (...args: unknown[]) => fetchAuthorFoldersMock(...args),
}));
vi.mock('../../../shared/api/projectApi', () => ({
  fetchProjects: (...args: unknown[]) => fetchProjectsMock(...args),
}));
vi.mock('../../../shared/api/chapterBlockApi', () => ({
  fetchChapterBlocks: (...args: unknown[]) => fetchChapterBlocksMock(...args),
}));

const oldCitation = { id: 'old-citation' } as Citation;
const oldBook = { id: 'old-book' } as BookSource;
const oldProject = { id: 'old-project' } as Project;

const renderQuery = () => renderHook(() => {
  const [citations, setCitations] = useState<Citation[]>([oldCitation]);
  const [authors, setAuthors] = useState<AuthorSource[]>([]);
  const [authorFolders, setAuthorFolders] = useState<AuthorFolder[]>([]);
  const [authorFolderMemberships, setAuthorFolderMemberships] = useState<AuthorFolderMembership[]>([]);
  const [books, setBooks] = useState<BookSource[]>([oldBook]);
  const [projects, setProjects] = useState<Project[]>([oldProject]);
  const [chapterBlocksByBook, setChapterBlocksByBook] = useState({});
  const query = useArchiveQuery({
    session: { user: { id: 'user-a' } },
    setCitations,
    setAuthors,
    setAuthorFolders,
    setAuthorFolderMemberships,
    setBooks,
    setProjects,
    setChapterBlocksByBook,
  });
  return { citations, authors, authorFolders, authorFolderMemberships, books, projects, chapterBlocksByBook, ...query };
});

describe('useArchiveQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCitationsMock.mockResolvedValue([]);
    fetchAuthorsMock.mockResolvedValue([]);
    fetchAuthorFoldersMock.mockResolvedValue({ folders: [], memberships: [] });
    fetchBooksMock.mockResolvedValue([]);
    fetchProjectsMock.mockResolvedValue([]);
    fetchChapterBlocksMock.mockResolvedValue([]);
  });

  it('keeps the last visible library and exposes a retryable error when loading fails', async () => {
    fetchCitationsMock.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderQuery();

    await act(async () => {
      await result.current.fetchData();
    });

    expect(result.current.citations).toEqual([oldCitation]);
    expect(result.current.books).toEqual([oldBook]);
    expect(result.current.projects).toEqual([oldProject]);
    expect(result.current.loadError).toBeTruthy();
  });

  it('loads persisted authors independently from books', async () => {
    fetchAuthorsMock.mockResolvedValueOnce([{
      id: 'author-empty', name: 'Empty Author', sortIndex: 0, createdAt: 100, isSelf: false,
    } as AuthorSource]);
    const { result } = renderQuery();

    await act(async () => {
      await result.current.fetchData();
    });

    expect(result.current.authors.map((author) => author.id)).toEqual(['author-empty']);
  });

  it('loads author folders and memberships independently from citation projects', async () => {
    fetchAuthorFoldersMock.mockResolvedValueOnce({
      folders: [{ id: 'folder-1', name: '철학', sortIndex: 0, createdAt: 1 }],
      memberships: [{ authorId: 'author-1', folderId: 'folder-1', createdAt: 2 }],
    });
    const { result } = renderQuery();
    await act(async () => { await result.current.fetchData(); });
    await waitFor(() => expect(result.current.authorFolders.map((folder) => folder.id)).toEqual(['folder-1']));
    expect(result.current.authorFolders.map((folder) => folder.id)).toEqual(['folder-1']);
    expect(result.current.authorFolderMemberships).toEqual([
      { authorId: 'author-1', folderId: 'folder-1', createdAt: 2 },
    ]);
  });

  it('updates the core library and preserves prior folders when the folder request fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchAuthorFoldersMock
      .mockResolvedValueOnce({
        folders: [{ id: 'folder-1', name: '철학', sortIndex: 0, createdAt: 1 }],
        memberships: [{ authorId: 'author-1', folderId: 'folder-1', createdAt: 2 }],
      })
      .mockRejectedValueOnce(new Error('folder offline'))
      .mockResolvedValueOnce({
        folders: [{ id: 'folder-2', name: '소설', sortIndex: 0, createdAt: 3 }],
        memberships: [],
      });
    const { result } = renderQuery();
    await act(async () => { await result.current.fetchData(); });

    fetchCitationsMock.mockResolvedValueOnce([{ id: 'new-citation' } as Citation]);
    fetchBooksMock.mockResolvedValueOnce([{ id: 'new-book' } as BookSource]);
    fetchProjectsMock.mockResolvedValueOnce([{ id: 'new-project' } as Project]);
    await act(async () => { await result.current.fetchData(); });

    expect(result.current.citations[0]?.id).toBe('new-citation');
    expect(result.current.books[0]?.id).toBe('new-book');
    expect(result.current.projects[0]?.id).toBe('new-project');
    expect(result.current.authorFolders.map((folder) => folder.id)).toEqual(['folder-1']);
    expect(result.current.authorFolderMemberships.map((membership) => membership.authorId)).toEqual(['author-1']);
    await waitFor(() => expect(result.current.authorFolderLoadError).toContain('저자 폴더'));
    expect(result.current.loadError).toBeNull();

    await act(async () => { await result.current.retryAuthorFolders(); });
    expect(result.current.authorFolders.map((folder) => folder.id)).toEqual(['folder-2']);
    expect(result.current.authorFolderLoadError).toBeNull();
    consoleError.mockRestore();
  });

  it('ignores a stale folder response after a folder mutation invalidates it', async () => {
    let resolveFolders!: (value: { folders: AuthorFolder[]; memberships: AuthorFolderMembership[] }) => void;
    fetchAuthorFoldersMock
      .mockResolvedValueOnce({
        folders: [{ id: 'old-folder', name: 'Existing', sortIndex: 0, createdAt: 1 }],
        memberships: [],
      })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFolders = resolve; }));
    const { result } = renderQuery();

    await act(async () => { await result.current.fetchData(); });
    await waitFor(() => expect(result.current.authorFolders.map((folder) => folder.id)).toEqual(['old-folder']));
    await act(async () => { await result.current.fetchData(); });
    act(() => result.current.invalidateAuthorFolderLoad());
    await act(async () => {
      resolveFolders({
        folders: [{ id: 'stale-folder', name: 'Stale', sortIndex: 0, createdAt: 1 }],
        memberships: [],
      });
      await Promise.resolve();
    });

    expect(result.current.authorFolders.map((folder) => folder.id)).toEqual(['old-folder']);
    expect(result.current.authorFolderLoading).toBe(false);
  });

  it('ignores an older response that finishes after a retry', async () => {
    let resolveFirst!: (value: Citation[]) => void;
    fetchCitationsMock
      .mockImplementationOnce(() => new Promise<Citation[]>((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce([{ id: 'new-citation' } as Citation]);
    fetchBooksMock
      .mockResolvedValueOnce([{ id: 'stale-book' } as BookSource])
      .mockResolvedValueOnce([{ id: 'new-book' } as BookSource]);
    fetchProjectsMock
      .mockResolvedValueOnce([{ id: 'stale-project' } as Project])
      .mockResolvedValueOnce([{ id: 'new-project' } as Project]);
    const { result } = renderQuery();

    let firstRequest!: Promise<void>;
    await act(async () => {
      firstRequest = result.current.fetchData();
      await result.current.fetchData();
    });
    expect(result.current.citations[0]?.id).toBe('new-citation');

    await act(async () => {
      resolveFirst([{ id: 'stale-citation' } as Citation]);
      await firstRequest;
    });

    expect(result.current.citations[0]?.id).toBe('new-citation');
    expect(result.current.books[0]?.id).toBe('new-book');
    expect(result.current.projects[0]?.id).toBe('new-project');
  });

  it('re-fetches after a user change and ignores the older response', async () => {
    let resolveCitations!: (value: Citation[]) => void;
    fetchCitationsMock
      .mockImplementationOnce(() => new Promise<Citation[]>((resolve) => { resolveCitations = resolve; }))
      .mockResolvedValueOnce([{ id: 'canonical-citation' } as Citation]);
    fetchBooksMock
      .mockResolvedValueOnce([{ id: 'stale-book' } as BookSource])
      .mockResolvedValueOnce([{ id: 'canonical-book' } as BookSource]);
    fetchProjectsMock
      .mockResolvedValueOnce([{ id: 'stale-project' } as Project])
      .mockResolvedValueOnce([{ id: 'canonical-project' } as Project]);
    const { result } = renderQuery();

    let request!: Promise<void>;
    act(() => {
      request = result.current.fetchData();
    });
    act(() => result.current.invalidateDataLoad());
    await waitFor(() => {
      expect(result.current.citations[0]?.id).toBe('canonical-citation');
    });
    await act(async () => {
      resolveCitations([{ id: 'stale-citation' } as Citation]);
      await request;
    });

    expect(result.current.citations[0]?.id).toBe('canonical-citation');
    expect(result.current.books[0]?.id).toBe('canonical-book');
    expect(result.current.projects[0]?.id).toBe('canonical-project');
    expect(result.current.loading).toBe(false);
  });

  it('surfaces a chapter-block load failure instead of silently hiding it', async () => {
    fetchChapterBlocksMock.mockRejectedValueOnce(new Error('chapter offline'));
    const { result } = renderQuery();

    await act(async () => {
      await result.current.handleLoadChapterBlocks('book-a');
    });

    expect(result.current.loadError).toBeNull();
    expect(result.current.chapterLoadError).toContain('장 구분');
  });

  it('cancels a book-scoped chapter error when leaving the book', async () => {
    let rejectChapterLoad!: (error: Error) => void;
    fetchChapterBlocksMock.mockImplementationOnce(
      () => new Promise((_, reject) => { rejectChapterLoad = reject; })
    );
    const { result } = renderQuery();

    let request!: Promise<void>;
    act(() => {
      request = result.current.handleLoadChapterBlocks('book-a');
    });
    expect(result.current.chapterLoadingBookId).toBe('book-a');
    act(() => result.current.cancelChapterBlockLoad());
    await act(async () => {
      rejectChapterLoad(new Error('late chapter error'));
      await request;
    });

    expect(result.current.chapterLoadError).toBeNull();
    expect(result.current.chapterLoadingBookId).toBeNull();
  });

  it('does not let a background refresh for one book cancel another book load', async () => {
    let resolveBookB!: (value: ChapterBlock[]) => void;
    let resolveBookA!: (value: ChapterBlock[]) => void;
    fetchChapterBlocksMock
      .mockImplementationOnce(() => new Promise<ChapterBlock[]>((resolve) => { resolveBookB = resolve; }))
      .mockImplementationOnce(() => new Promise<ChapterBlock[]>((resolve) => { resolveBookA = resolve; }));
    const { result } = renderQuery();

    let bookBRequest!: Promise<void>;
    let bookARefresh!: Promise<void>;
    act(() => {
      bookBRequest = result.current.handleLoadChapterBlocks('book-b');
      bookARefresh = result.current.refreshChapterBlocks('book-a');
    });
    expect(result.current.chapterLoadingBookId).toBe('book-b');

    await act(async () => {
      resolveBookA([{ id: 'block-a', bookId: 'book-a' } as ChapterBlock]);
      await bookARefresh;
    });
    expect(result.current.chapterLoadingBookId).toBe('book-b');

    await act(async () => {
      resolveBookB([{ id: 'block-b', bookId: 'book-b' } as ChapterBlock]);
      await bookBRequest;
    });
    expect(result.current.chapterLoadingBookId).toBeNull();
    expect(result.current.chapterBlocksByBook).toEqual({
      'book-a': [{ id: 'block-a', bookId: 'book-a' }],
      'book-b': [{ id: 'block-b', bookId: 'book-b' }],
    });
  });

  it('keeps a same-book refresh failure visible after it supersedes the foreground load', async () => {
    let resolveForeground!: (value: ChapterBlock[]) => void;
    let rejectRefresh!: (error: Error) => void;
    fetchChapterBlocksMock
      .mockImplementationOnce(
        () => new Promise<ChapterBlock[]>((resolve) => { resolveForeground = resolve; })
      )
      .mockImplementationOnce(
        () => new Promise<ChapterBlock[]>((_, reject) => { rejectRefresh = reject; })
      );
    const { result } = renderQuery();

    let foregroundRequest!: Promise<void>;
    let refreshRequest!: Promise<void>;
    act(() => {
      foregroundRequest = result.current.handleLoadChapterBlocks('book-a');
      refreshRequest = result.current.refreshChapterBlocks('book-a');
    });
    expect(result.current.chapterLoadingBookId).toBe('book-a');

    await act(async () => {
      rejectRefresh(new Error('refresh offline'));
      await refreshRequest;
    });
    expect(result.current.chapterLoadError).toContain('장 구분');
    expect(result.current.chapterLoadingBookId).toBeNull();

    await act(async () => {
      resolveForeground([{ id: 'stale-block', bookId: 'book-a' } as ChapterBlock]);
      await foregroundRequest;
    });
    expect(result.current.chapterLoadError).toContain('장 구분');
    expect(result.current.chapterBlocksByBook).toEqual({});
  });
});
