import { describe, expect, it } from 'vitest';
import type { BookSource, Citation } from '../../../types';
import type { RenameAuthorMutationResult, RenameBookMutationResult } from '../contract/archiveMutationContract';
import {
  applyRenameAuthorToBooks,
  applyRenameAuthorToCitations,
  applyRenameBookToBooks,
  applyRenameBookToCitations,
  mergeFetchedCitations,
  replaceCitationById,
} from './archiveLocalPatch';

const book = (id: string, title: string, authorId: string, author: string): BookSource => ({
  id,
  title,
  authorId,
  author,
  sortIndex: null,
  authorSortIndex: null,
  createdAt: 1,
  isSelf: false,
});

const citation = (id: string, bookId: string, bookTitle: string, authorId: string, author: string): Citation => ({
  id,
  kind: 'sentence',
  text: id,
  bookId,
  book: bookTitle,
  authorId,
  author,
  notes: [],
  tags: [],
  createdAt: 1,
});

describe('archive rename patches', () => {
  it('keeps books and citations canonical after an author merge with a colliding book', () => {
    const books = [
      book('source-shared', 'Shared', 'author-old', 'Old author'),
      book('source-unique', 'Unique', 'author-old', 'Old author'),
      book('target-shared', 'Shared', 'author-new', 'New author'),
    ];
    const citations = [
      citation('shared-citation', 'source-shared', 'Shared', 'author-old', 'Old author'),
      citation('unique-citation', 'source-unique', 'Unique', 'author-old', 'Old author'),
    ];
    const result: RenameAuthorMutationResult = {
      merged: true,
      fromAuthorId: 'author-old',
      authorId: 'author-new',
      authorName: 'New author',
      authorSortIndex: 2,
      isSelf: false,
      folderId: null,
      bookMerges: [{
        fromBookId: 'source-shared',
        toBookId: 'target-shared',
        toBookTitle: 'Shared',
        toBookSortIndex: 4,
        toBookMemo: 'merged memo',
      }],
    };

    const nextBooks = applyRenameAuthorToBooks(books, result);
    const nextCitations = applyRenameAuthorToCitations(citations, result);

    expect(nextBooks.map((entry) => entry.id)).toEqual(['source-unique', 'target-shared']);
    expect(nextBooks.every((entry) => entry.authorId === 'author-new' && entry.author === 'New author')).toBe(true);
    expect(nextBooks.find((entry) => entry.id === 'target-shared')?.sortIndex).toBe(4);
    expect(nextBooks.find((entry) => entry.id === 'target-shared')?.memo).toBe('merged memo');
    expect(nextCitations).toMatchObject([
      { authorId: 'author-new', author: 'New author', bookId: 'target-shared', book: 'Shared' },
      { authorId: 'author-new', author: 'New author', bookId: 'source-unique', book: 'Unique' },
    ]);
  });

  it('deduplicates a merged book and patches citations to the target id', () => {
    const books = [
      book('source', 'Old title', 'author', 'Author'),
      book('target', 'New title', 'author', 'Author'),
    ];
    const citations = [citation('citation', 'source', 'Old title', 'author', 'Author')];
    const result: RenameBookMutationResult = {
      merged: true,
      fromBookId: 'source',
      bookId: 'target',
      bookTitle: 'New title',
      bookSortIndex: 3,
      bookMemo: 'target memo',
    };

    expect(applyRenameBookToBooks(books, result)).toMatchObject([
      { id: 'target', title: 'New title', sortIndex: 3, memo: 'target memo' },
    ]);
    expect(applyRenameBookToCitations(citations, result)).toMatchObject([
      { bookId: 'target', book: 'New title', bookSortIndex: 3 },
    ]);
  });

  it('preserves the canonical merged book when the target was not loaded locally', () => {
    const result: RenameBookMutationResult = {
      merged: true,
      fromBookId: 'source',
      bookId: 'target',
      bookTitle: 'Target title',
      bookSortIndex: 7,
      bookMemo: 'merged memo',
    };

    expect(applyRenameBookToBooks([book('source', 'Source title', 'author', 'Author')], result)).toMatchObject([
      { id: 'target', title: 'Target title', sortIndex: 7, memo: 'merged memo' },
    ]);
  });
});

describe('archive query and optimistic save patches', () => {
  it('keeps saving and failed drafts when a refresh response arrives', () => {
    const saving = { ...citation('optimistic-saving', 'book', 'Book', 'author', 'Author'), saveStatus: 'saving' as const };
    const failed = { ...citation('optimistic-failed', 'book', 'Book', 'author', 'Author'), saveStatus: 'failed' as const };
    const fetched = citation('server', 'book', 'Book', 'author', 'Author');

    expect(mergeFetchedCitations([saving, failed], [fetched]).map((entry) => entry.id)).toEqual([
      'optimistic-saving',
      'optimistic-failed',
      'server',
    ]);
  });

  it('keeps a local failed draft over a fetched row with the same UUID', () => {
    const local = { ...citation('same-id', 'book', 'Book', 'author', 'Author'), text: 'Local edit', saveStatus: 'failed' as const };
    const server = { ...citation('same-id', 'book', 'Book', 'author', 'Author'), text: 'Server value' };
    expect(mergeFetchedCitations([local], [server])).toEqual([local]);
  });

  it('inserts the persisted citation even if a refresh removed its optimistic row', () => {
    const persisted = citation('persisted', 'book', 'Book', 'author', 'Author');
    expect(replaceCitationById([], 'optimistic-missing', persisted)).toEqual([persisted]);
    expect(replaceCitationById(
      [persisted, { ...persisted, id: 'optimistic-present' }],
      'optimistic-present',
      persisted
    )).toEqual([persisted]);
  });
});
