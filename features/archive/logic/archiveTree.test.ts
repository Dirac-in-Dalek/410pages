import { describe, expect, it } from 'vitest';
import type { AuthorFolder, AuthorFolderMembership, AuthorSource, BookSource, Citation } from '../../../types';
import {
  buildArchiveTree,
  deriveAuthorOrder,
  findRecentlyCitedBooks,
  getCurrentOrderedAuthors,
  getCurrentOrderedBooks,
  sortAuthorsByActivity,
} from './archiveTree';

const citation = (overrides: Partial<Citation> & Pick<Citation, 'id' | 'authorId' | 'author' | 'createdAt'>): Citation => ({
  kind: 'sentence',
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

  it('includes a persisted author before they have a book', () => {
    const author: AuthorSource = {
      id: 'author-empty', name: 'Empty Author', sortIndex: 0, createdAt: 500, isSelf: false,
    };
    const tree = buildArchiveTree([], [], 'Me', ['author-empty'], () => [], [author]);

    expect(tree[1]).toMatchObject({
      type: 'author',
      label: 'Empty Author',
      data: { authorId: 'author-empty' },
    });
  });

  it('groups folder members and keeps other authors as ordinary top-level rows', () => {
    const authors: AuthorSource[] = [
      { id: 'author-a', name: 'Alpha', sortIndex: 0, createdAt: 200, isSelf: false },
      { id: 'author-b', name: 'Beta', sortIndex: 1, createdAt: 100, isSelf: false },
    ];
    const folders: AuthorFolder[] = [
      { id: 'folder-1', name: '철학', sortIndex: 0, createdAt: 100 },
    ];
    const memberships: AuthorFolderMembership[] = [
      { authorId: 'author-a', folderId: 'folder-1', createdAt: 300 },
    ];
    const tree = buildArchiveTree([], [], 'Me', ['author-a', 'author-b'], () => [], authors, folders, memberships);

    expect(tree[1]).toMatchObject({
      type: 'author_folder',
      label: '철학',
      children: [expect.objectContaining({ data: expect.objectContaining({ authorId: 'author-a' }) })],
    });
    expect(tree[2]).toMatchObject({
      type: 'author',
      label: 'Beta',
      data: { authorId: 'author-b' },
    });
    expect(tree.some((item) => item.label === '분류되지 않은 저자')).toBe(false);
  });

  it('keeps legacy duplicate-title books as separate id nodes', () => {
    const books = [
      book({ id: 'book-a', title: 'Same title', authorId: 'author-a', author: 'Author A' }),
      book({ id: 'book-b', title: 'Same title', authorId: 'author-a', author: 'Author A' }),
    ];

    expect(getCurrentOrderedAuthors([], 'Me', books)).toEqual(['author-a']);
    expect(getCurrentOrderedBooks([], books, 'author-a', {})).toEqual(['book-a', 'book-b']);
    const tree = buildArchiveTree([], books, 'Me', ['author-a'], () => ['book-a', 'book-b']);
    expect(tree[1].children?.map((item) => item.data?.bookId)).toEqual(['book-a', 'book-b']);
  });

  it('returns three distinct books ordered by their latest saved citation', () => {
    const books = [
      book({ id: 'book-a', title: 'Book A', authorId: 'author-a', author: 'Author A' }),
      book({ id: 'book-b', title: 'Book B', authorId: 'author-b', author: 'Author B' }),
      book({ id: 'book-c', title: 'Book C', authorId: 'author-c', author: 'Author C' }),
      book({ id: 'empty', title: 'Empty', authorId: 'author-d', author: 'Author D' }),
    ];
    const citations = [
      citation({ id: 'a-old', authorId: 'author-a', author: 'Author A', bookId: 'book-a', book: 'Book A', createdAt: 100 }),
      citation({ id: 'a-new', authorId: 'author-a', author: 'Author A', bookId: 'book-a', book: 'Book A', createdAt: 400 }),
      citation({ id: 'b', authorId: 'author-b', author: 'Author B', bookId: 'book-b', book: 'Book B', createdAt: 300 }),
      citation({ id: 'c', authorId: 'author-c', author: 'Author C', bookId: 'book-c', book: 'Book C', createdAt: 200 }),
      citation({ id: 'word-only', kind: 'word', authorId: 'author-d', author: 'Author D', bookId: 'empty', book: 'Empty', createdAt: 500 }),
      citation({ id: 'failed-only', saveStatus: 'failed', authorId: 'author-d', author: 'Author D', bookId: 'empty', book: 'Empty', createdAt: 600 }),
    ];

    expect(findRecentlyCitedBooks(citations, books).map((entry) => entry.id)).toEqual([
      'book-a',
      'book-b',
      'book-c',
    ]);
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

  it('uses author creation time until a newer citation exists', () => {
    const authors: AuthorSource[] = [
      { id: 'author-a', name: 'Alpha', sortIndex: 0, createdAt: 500, isSelf: false },
      { id: 'author-b', name: 'Beta', sortIndex: 1, createdAt: 300, isSelf: false },
    ];
    const citations = [
      citation({ id: 'latest', authorId: 'author-b', author: 'Beta', createdAt: 600 }),
    ];

    expect(deriveAuthorOrder(citations, 'Me', [], authors)).toEqual(['author-b', 'author-a']);
  });

  it('uses the same persisted-sentence activity order for the home and sidebar', () => {
    const authors: AuthorSource[] = [
      { id: 'author-a', name: 'Alpha', sortIndex: 0, createdAt: 100, isSelf: false },
      { id: 'author-b', name: 'Beta', sortIndex: 1, createdAt: 200, isSelf: false },
      { id: 'author-c', name: 'Charlie', sortIndex: 2, createdAt: 150, isSelf: false },
    ];
    const books = [
      book({ id: 'book-a', title: 'New empty book', authorId: 'author-a', author: 'Alpha', createdAt: 9_000 }),
    ];
    const citations = [
      citation({ id: 'word', kind: 'word', authorId: 'author-a', author: 'Alpha', createdAt: 1_000 }),
      citation({ id: 'saving', saveStatus: 'saving', authorId: 'author-a', author: 'Alpha', createdAt: 1_100 }),
      citation({ id: 'failed', saveStatus: 'failed', authorId: 'author-a', author: 'Alpha', createdAt: 1_200 }),
      citation({ id: 'saved', authorId: 'author-b', author: 'Beta', createdAt: 300 }),
    ];

    const expected = ['author-b', 'author-c', 'author-a'];
    expect(sortAuthorsByActivity(authors, citations).map((author) => author.id)).toEqual(expected);
    expect(deriveAuthorOrder(citations, 'Me', books, authors)).toEqual(expected);
  });
});
