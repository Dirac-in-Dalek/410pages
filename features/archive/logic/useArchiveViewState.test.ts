import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AuthorSource, BookSource, Citation } from '../../../types';
import { useArchiveViewState } from './useArchiveViewState';

const citation = (overrides: Partial<Citation> & Pick<Citation, 'id' | 'authorId' | 'author' | 'bookId' | 'book' | 'createdAt'>): Citation => ({
  kind: 'sentence',
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
  it('accepts a refreshed canonical author order after an optimistic reorder', async () => {
    const initialAuthors: AuthorSource[] = [
      { id: 'author-a', name: 'Author A', sortIndex: 0, createdAt: 1, isSelf: false },
      { id: 'author-b', name: 'Author B', sortIndex: 1, createdAt: 2, isSelf: false },
    ];
    const { result, rerender } = renderHook(
      ({ authors }) => useArchiveViewState({ authors, books: [], citations: [], projects: [], username: 'Me' }),
      { initialProps: { authors: initialAuthors } }
    );
    await waitFor(() => expect(result.current.getCurrentOrderedAuthors()).toEqual(['author-a', 'author-b']));
    act(() => result.current.setAuthorOrder(['author-b', 'author-a']));
    expect(result.current.getCurrentOrderedAuthors()).toEqual(['author-b', 'author-a']);

    rerender({ authors: [
      { ...initialAuthors[0], sortIndex: 2 },
      { ...initialAuthors[1], sortIndex: 3 },
    ] });
    await waitFor(() => expect(result.current.getCurrentOrderedAuthors()).toEqual(['author-a', 'author-b']));
  });

  it('opens the home bookshelf on initial load', async () => {
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

    await waitFor(() => expect(result.current.isHomeView).toBe(true));
    expect(result.current.selectedBookId).toBeNull();
    expect(result.current.editorPrefill).toBeUndefined();

    act(() => result.current.handleBookSourceSelect(books[1]));
    expect(result.current.isHomeView).toBe(false);
    expect(result.current.selectedBookId).toBe('book-b');

    act(() => result.current.handleHomeSelect());
    expect(result.current.isHomeView).toBe(true);
    expect(result.current.selectedBookId).toBeNull();
  });

  it('moves from author to exact book and back home using ids', () => {
    const author: AuthorSource = {
      id: 'author-a', name: 'Author A', sortIndex: 0, createdAt: 100, isSelf: false,
    };
    const selectedBook = book({ id: 'book-a', title: 'Book A', authorId: author.id, author: author.name });
    const authors = [author];
    const books = [selectedBook];
    const citations: Citation[] = [];
    const projects: never[] = [];
    const { result } = renderHook(() => useArchiveViewState({
      authors, books, citations, projects, username: 'Me',
    }));

    act(() => result.current.handleAuthorSourceSelect(author));
    expect(result.current.isAuthorView).toBe(true);
    expect(result.current.selectedAuthorId).toBe(author.id);

    act(() => result.current.handleBookSourceSelect(selectedBook));
    expect(result.current.isBookView).toBe(true);
    expect(result.current.selectedBookId).toBe(selectedBook.id);
    expect(result.current.filteredCitations).toEqual([]);
    expect(result.current.sortField).toBe('date');
    expect(result.current.dateDirection).toBe('asc');

    act(() => result.current.handleHomeSelect());
    expect(result.current.isHomeView).toBe(true);
    expect(result.current.selectedAuthorId).toBeNull();
  });

  it('filters by book id and refreshes displayed metadata from BookSource', () => {
    const initialBook = book({ id: 'book-a', title: 'Old title', authorId: 'author-a', author: 'Old author' });
    const otherBook = book({ id: 'book-b', title: 'Old title', authorId: 'author-b', author: 'Old author' });
    const initialCitations = [
      citation({ id: 'selected', authorId: 'author-a', author: 'Old author', bookId: 'book-a', book: 'Old title', createdAt: 100 }),
      citation({ id: 'other', authorId: 'author-b', author: 'Old author', bookId: 'book-b', book: 'Old title', createdAt: 200 }),
    ];

    const { result, rerender } = renderHook(
      ({ books, citations }) => useArchiveViewState({ books, citations, projects: [], username: 'Me' }),
      { initialProps: { books: [initialBook, otherBook], citations: initialCitations } }
    );

    act(() => result.current.handleBookSourceSelect(initialBook));
    expect(result.current.filteredCitations.map((entry) => entry.id)).toEqual(['selected']);

    rerender({
      books: [{ ...initialBook, title: 'New title', author: 'New author' }, otherBook],
      citations: [{ ...initialCitations[0], book: 'New title', author: 'New author' }, initialCitations[1]],
    });

    expect(result.current.filteredCitations.map((entry) => entry.id)).toEqual(['selected']);
    expect(result.current.viewTitle).toBe('New title');
    expect(result.current.editorPrefill).toEqual({
      author: 'New author',
      book: 'New title',
      bookId: 'book-a',
    });
    expect(result.current.filter).toMatchObject({ bookId: 'book-a', authorId: 'author-a' });
  });

  it('falls back from a removed book to its author and then home', async () => {
    const author: AuthorSource = {
      id: 'author-a', name: 'Author A', sortIndex: 0, createdAt: 100, isSelf: false,
    };
    const selectedBook = book({ id: 'book-a', title: 'Book A', authorId: author.id, author: author.name });
    const citations: Citation[] = [];
    const projects: never[] = [];
    const { result, rerender } = renderHook(
      ({ authors, books }) => useArchiveViewState({
        authors, books, citations, projects, username: 'Me',
      }),
      { initialProps: { authors: [author], books: [selectedBook] } }
    );

    act(() => result.current.handleBookSourceSelect(selectedBook));
    rerender({ authors: [author], books: [] });
    await waitFor(() => expect(result.current.isAuthorView).toBe(true));
    expect(result.current.selectedAuthorId).toBe(author.id);

    rerender({ authors: [], books: [] });
    await waitFor(() => expect(result.current.isHomeView).toBe(true));
    expect(result.current.selectedAuthorId).toBeNull();
  });
});
