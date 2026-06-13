import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookSource, ChapterBlock, Citation, Project } from '../../../types';
import { deleteAuthor } from '../../../shared/api/authorApi';
import { deleteBook } from '../../../shared/api/bookApi';
import { useArchiveMutations } from './useArchiveMutations';

vi.mock('../../../shared/api/authorApi', () => ({
  deleteAuthor: vi.fn(),
  renameAuthor: vi.fn(),
}));

vi.mock('../../../shared/api/bookApi', () => ({
  createBook: vi.fn(),
  deleteBook: vi.fn(),
  renameBook: vi.fn(),
}));

vi.mock('../../../shared/api/chapterBlockApi', () => ({
  createChapterBlock: vi.fn(),
  deleteChapterBlock: vi.fn(),
}));

vi.mock('../../../shared/api/citationApi', () => ({
  addCitation: vi.fn(),
  addNote: vi.fn(),
  bulkUpdateCitationSource: vi.fn(),
  deleteCitation: vi.fn(),
  deleteNote: vi.fn(),
  updateCitation: vi.fn(),
  updateNote: vi.fn(),
}));

vi.mock('../../../shared/api/projectApi', () => ({
  addCitationToProject: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  renameProject: vi.fn(),
  reorderProjects: vi.fn(),
}));

const book = (overrides: Partial<BookSource> & Pick<BookSource, 'id'>): BookSource => ({
  title: 'Book',
  sortIndex: null,
  createdAt: 1,
  authorId: 'author-1',
  author: 'Author',
  authorSortIndex: null,
  isSelf: false,
  ...overrides,
});

const citation = (overrides: Partial<Citation> & Pick<Citation, 'id'>): Citation => ({
  text: 'Quote',
  author: 'Author',
  book: 'Book',
  notes: [],
  tags: [],
  createdAt: 1,
  ...overrides,
});

const block = (overrides: Partial<ChapterBlock> & Pick<ChapterBlock, 'id' | 'bookId'>): ChapterBlock => ({
  label: '1장',
  createdAtSort: 1,
  createdAt: 1,
  ...overrides,
});

const renderMutationHook = () => {
  const fetchData = vi.fn().mockResolvedValue(undefined);
  const rendered = renderHook(() => {
    const [projects, setProjects] = useState<Project[]>([
      { id: 'project-1', name: 'Project', citationIds: ['citation-1', 'citation-legacy', 'citation-2'] },
    ]);
    const [citations, setCitations] = useState<Citation[]>([
      citation({ id: 'citation-1', authorId: 'author-1', bookId: 'book-1' }),
      citation({ id: 'citation-legacy', bookId: 'book-1' }),
      citation({ id: 'citation-2', authorId: 'author-2', bookId: 'book-2' }),
    ]);
    const [books, setBooks] = useState<BookSource[]>([
      book({ id: 'book-1', authorId: 'author-1' }),
      book({ id: 'book-2', authorId: 'author-2' }),
    ]);
    const [chapterBlocksByBook, setChapterBlocksByBook] = useState({
      'book-1': [block({ id: 'block-1', bookId: 'book-1' })],
      'book-2': [block({ id: 'block-2', bookId: 'book-2' })],
    });

    const controller = useArchiveMutations({
      session: { user: { id: 'user-1' } },
      projects,
      citations,
      books,
      setProjects,
      setCitations,
      setBooks,
      setChapterBlocksByBook,
      fetchData,
    });

    return { controller, projects, citations, books, chapterBlocksByBook };
  });

  return { ...rendered, fetchData };
};

describe('useArchiveMutations delete handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deleteAuthor).mockResolvedValue(undefined);
    vi.mocked(deleteBook).mockResolvedValue(undefined);
  });

  it('removes a deleted book from every local archive cache and refetches', async () => {
    const { result, fetchData } = renderMutationHook();

    await act(async () => {
      await result.current.controller.handleDeleteBook('book-1');
    });

    await waitFor(() => {
      expect(result.current.books.map((entry) => entry.id)).toEqual(['book-2']);
      expect(result.current.citations.map((entry) => entry.id)).toEqual(['citation-2']);
      expect(result.current.projects[0].citationIds).toEqual(['citation-2']);
      expect(Object.keys(result.current.chapterBlocksByBook)).toEqual(['book-2']);
      expect(fetchData).toHaveBeenCalled();
    });
  });

  it('removes a deleted author by author id and deleted book ids', async () => {
    const { result, fetchData } = renderMutationHook();

    await act(async () => {
      await result.current.controller.handleDeleteAuthor('author-1');
    });

    await waitFor(() => {
      expect(result.current.books.map((entry) => entry.id)).toEqual(['book-2']);
      expect(result.current.citations.map((entry) => entry.id)).toEqual(['citation-2']);
      expect(result.current.projects[0].citationIds).toEqual(['citation-2']);
      expect(Object.keys(result.current.chapterBlocksByBook)).toEqual(['book-2']);
      expect(fetchData).toHaveBeenCalled();
    });
  });
});
