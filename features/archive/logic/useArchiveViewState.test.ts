import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BookSource, Citation } from '../../../types';
import { useArchiveViewState } from './useArchiveViewState';

const citation = (overrides: Partial<Citation> & Pick<Citation, 'id' | 'authorId' | 'author' | 'bookId' | 'book' | 'createdAt'>): Citation => ({
  text: 'Quote',
  notes: [],
  tags: [],
  ...overrides,
});

const book = (overrides: Partial<BookSource> & Pick<BookSource, 'id' | 'title' | 'authorId' | 'author'>): BookSource => ({
  sortIndex: null,
  createdAt: 100,
  authorSortIndex: null,
  isSelf: false,
  ...overrides,
});

describe('useArchiveViewState', () => {
  it('opens the most recently cited book on initial load', async () => {
    const books = [
      book({ id: 'book-a', title: 'Book A', authorId: 'author-a', author: 'Author A' }),
      book({ id: 'book-b', title: 'Book B', authorId: 'author-b', author: 'Author B' }),
    ];
    const citations = [
      citation({ id: 'old', authorId: 'author-a', author: 'Author A', bookId: 'book-a', book: 'Book A', createdAt: 100 }),
      citation({ id: 'new', authorId: 'author-b', author: 'Author B', bookId: 'book-b', book: 'Book B', createdAt: 300 }),
    ];

    const { result } = renderHook(() =>
      useArchiveViewState({
        citations,
        books,
        projects: [],
        username: 'Me',
      })
    );

    await waitFor(() => {
      expect(result.current.selectedBookId).toBe('book-b');
    });
    expect(result.current.editorPrefill).toEqual({
      author: 'Author B',
      book: 'Book B',
    });
    expect(result.current.viewTitle).toBe('Book B');
  });
});
