import { describe, expect, it } from 'vitest';
import type { BookSource, Citation } from '../../../types';
import { buildArchiveTree, deriveAuthorOrder, findLatestCitationBook, getCurrentOrderedAuthors } from './archiveTree';

const citation = (overrides: Partial<Citation> & Pick<Citation, 'id' | 'authorId' | 'author' | 'createdAt'>): Citation => ({
  text: 'Quote',
  book: '',
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

describe('archiveTree persisted books', () => {
  it('includes books that do not have citations yet', () => {
    const tree = buildArchiveTree(
      [],
      [book({ id: 'book-a', title: 'Book A', authorId: 'author-a', author: 'Author A' })],
      'Me',
      ['author-a'],
      () => ['book-a']
    );

    expect(tree).toEqual([
      {
        id: 'root-user',
        label: 'Me',
        type: 'root',
        data: { author: 'Me', book: '' },
      },
      {
        id: 'author-author-a',
        label: 'Author A',
        type: 'author',
        data: { authorId: 'author-a', author: 'Author A' },
        children: [
          {
            id: 'book-author-a-book-a',
            label: 'Book A',
            type: 'book',
            data: {
              authorId: 'author-a',
              author: 'Author A',
              bookId: 'book-a',
              book: 'Book A',
            },
          },
        ],
      },
    ]);
  });

  it('finds the book attached to the newest citation', () => {
    const books = [
      book({ id: 'book-a', title: 'Book A', authorId: 'author-a', author: 'Author A' }),
      book({ id: 'book-b', title: 'Book B', authorId: 'author-b', author: 'Author B' }),
    ];
    const citations = [
      citation({ id: 'old', authorId: 'author-a', author: 'Author A', bookId: 'book-a', book: 'Book A', createdAt: 100 }),
      citation({ id: 'new', authorId: 'author-b', author: 'Author B', bookId: 'book-b', book: 'Book B', createdAt: 300 }),
    ];

    expect(findLatestCitationBook(citations, books)).toMatchObject({
      id: 'book-b',
      title: 'Book B',
      authorId: 'author-b',
      author: 'Author B',
    });
  });

  it('keeps the self author label when falling back from citation data', () => {
    const citations = [
      citation({
        id: 'self-book',
        authorId: 'self-author',
        author: 'Me',
        isSelf: true,
        bookId: 'book-self',
        book: 'Notebook',
        createdAt: 100,
      }),
    ];

    expect(findLatestCitationBook(citations, [])).toMatchObject({
      id: 'book-self',
      author: 'Me',
      isSelf: true,
    });
  });
});

describe('archiveTree author order', () => {
  it('orders authors by their newest citation first', () => {
    const citations = [
      citation({ id: 'old-a', authorId: 'author-a', author: 'Alpha', createdAt: 100 }),
      citation({ id: 'old-b', authorId: 'author-b', author: 'Beta', createdAt: 200 }),
      citation({ id: 'new-a', authorId: 'author-a', author: 'Alpha', createdAt: 300 }),
    ];

    expect(deriveAuthorOrder(citations, 'Me')).toEqual(['author-a', 'author-b']);
    expect(getCurrentOrderedAuthors(citations, 'Me')).toEqual(['author-a', 'author-b']);
  });

  it('ignores stale manual sort indexes when ordering authors', () => {
    const citations = [
      citation({
        id: 'new-a',
        authorId: 'author-a',
        author: 'Alpha',
        authorSortIndex: 99,
        createdAt: 300,
      }),
      citation({
        id: 'old-b',
        authorId: 'author-b',
        author: 'Beta',
        authorSortIndex: 1,
        createdAt: 100,
      }),
    ];

    expect(deriveAuthorOrder(citations, 'Me')).toEqual(['author-a', 'author-b']);
  });

  it('excludes the signed-in user from the author list order', () => {
    const citations = [
      citation({ id: 'self', authorId: 'self-author', author: 'Me', isSelf: true, createdAt: 500 }),
      citation({ id: 'other', authorId: 'author-a', author: 'Alpha', createdAt: 100 }),
    ];

    expect(deriveAuthorOrder(citations, 'Me')).toEqual(['author-a']);
  });

  it('includes authors that only have persisted empty books', () => {
    const books = [
      book({ id: 'book-a', title: 'Book A', authorId: 'author-a', author: 'Author A', createdAt: 400 }),
    ];

    expect(deriveAuthorOrder([], 'Me', books)).toEqual(['author-a']);
    expect(getCurrentOrderedAuthors([], 'Me', books)).toEqual(['author-a']);
  });
});
