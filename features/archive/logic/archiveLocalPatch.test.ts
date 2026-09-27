import { describe, expect, it } from 'vitest';
import type { BookSource, ChapterBlock, Citation } from '../../../types';
import type { RenameAuthorMutationResult, RenameBookMutationResult } from '../contract/archiveMutationContract';
import {
  applyRenameAuthorToBooks,
  applyRenameAuthorToChapterBlocks,
  applyRenameBookToChapterBlocks,
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
        citationOrderKeys: { 'shared-citation': 'a1V' },
      }],
    };

    const nextBooks = applyRenameAuthorToBooks(books, result);
    const nextCitations = applyRenameAuthorToCitations(citations, result);

    expect(nextBooks.map((entry) => entry.id)).toEqual(['source-unique', 'target-shared']);
    expect(nextBooks.every((entry) => entry.authorId === 'author-new' && entry.author === 'New author')).toBe(true);
    expect(nextBooks.find((entry) => entry.id === 'target-shared')?.sortIndex).toBe(4);
    expect(nextBooks.find((entry) => entry.id === 'target-shared')?.memo).toBe('merged memo');
    expect(nextCitations).toMatchObject([
      { authorId: 'author-new', author: 'New author', bookId: 'target-shared', book: 'Shared', orderKey: 'a1V' },
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
      citationOrderKeys: { citation: 'a2V' },
    };

    expect(applyRenameBookToBooks(books, result)).toMatchObject([
      { id: 'target', title: 'New title', sortIndex: 3, memo: 'target memo' },
    ]);
    expect(applyRenameBookToCitations(citations, result)).toMatchObject([
      { bookId: 'target', book: 'New title', bookSortIndex: 3, orderKey: 'a2V' },
    ]);
  });

  it('moves cached source chapters, patches accepted keys and deduplicates an already loaded target', () => {
    const chapter = (id: string, bookId: string, orderKey: string, depth: number): ChapterBlock => ({
      id, bookId, orderKey, depth, label: id, createdAt: 1, createdAtSort: 2,
    });
    const source = chapter('source-chapter', 'source', 'a0', 2);
    const target = chapter('target-chapter', 'target', 'a0', 0);
    const unrelated = [chapter('other', 'other-book', 'a0', 1)];
    const result: RenameBookMutationResult = {
      merged: true, fromBookId: 'source', bookId: 'target', bookTitle: 'Target',
      bookSortIndex: null, bookMemo: '', chapterOrderKeys: { 'source-chapter': 'a0V', 'target-chapter': 'a0' },
    };
    const patched = applyRenameBookToChapterBlocks({
      source: [source], target: [target, { ...source, bookId: 'target', orderKey: 'a0V' }], 'other-book': unrelated,
    }, result);
    expect(patched.source).toBeUndefined();
    expect(patched.target).toHaveLength(2);
    expect(patched.target.find(block => block.id === source.id)).toEqual({ ...source, bookId: 'target', orderKey: 'a0V' });
    expect(patched.target.find(block => block.id === target.id)).toEqual(target);
    expect(patched['other-book']).toBe(unrelated);
    const authorResult: RenameAuthorMutationResult = {
      merged: true, fromAuthorId: 'old', authorId: 'new', authorName: 'New', authorSortIndex: null,
      isSelf: false, folderId: null, bookMerges: [{
        fromBookId: 'source', toBookId: 'target', toBookTitle: 'Target', toBookSortIndex: null,
        toBookMemo: '', chapterOrderKeys: result.chapterOrderKeys,
      }],
    };
    expect(applyRenameAuthorToChapterBlocks({ source: [source], target: [target] }, authorResult).target)
      .toEqual([{ ...source, bookId: 'target', orderKey: 'a0V' }, target]);
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
