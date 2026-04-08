import { describe, expect, it } from 'vitest';
import {
  getDescendingMidpoint,
  getMidpoint,
  getInsertionPageSort,
  sortBookViewItems,
  toBookViewItems,
} from './bookViewItems';
import type { Citation, ChapterBlock } from '../types';

const citation = (overrides: Partial<Citation> & Pick<Citation, 'id' | 'text' | 'author' | 'book'>): Citation => ({
  notes: [],
  tags: [],
  createdAt: 0,
  ...overrides,
});

const chapterBlock = (
  overrides: Partial<ChapterBlock> & Pick<ChapterBlock, 'id' | 'bookId' | 'label'>
): ChapterBlock => ({
  createdAt: 0,
  createdAtSort: 0,
  ...overrides,
});

describe('bookViewItems', () => {
  it('sorts same-page items newest-first when sorting by page', () => {
    const items = toBookViewItems(
      [
        citation({
          id: 'citation-old',
          text: 'Older quote',
          author: 'Author A',
          book: 'Book A',
          pageSort: 336,
          createdAt: 1000,
        }),
        citation({
          id: 'citation-new',
          text: 'Newer quote',
          author: 'Author B',
          book: 'Book A',
          pageSort: 336,
          createdAt: 1001,
        }),
      ],
      []
    );

    expect(sortBookViewItems(items, 'page', 'asc').map((item) => item.id)).toEqual([
      'citation-new',
      'citation-old',
    ]);
  });

  it('sorts page-less items newest-first when sorting by page', () => {
    const items = toBookViewItems(
      [
        citation({
          id: 'citation-old',
          text: 'Older quote',
          author: 'Author A',
          book: 'Book A',
          createdAt: 1000,
        }),
        citation({
          id: 'citation-new',
          text: 'Newer quote',
          author: 'Author B',
          book: 'Book A',
          createdAt: 1001,
        }),
      ],
      []
    );

    expect(sortBookViewItems(items, 'page', 'asc').map((item) => item.id)).toEqual([
      'citation-new',
      'citation-old',
    ]);
  });

  it('treats a page-less citation as belonging to the previous explicit page', () => {
    const items = toBookViewItems(
      [
        citation({
          id: 'citation-335',
          text: 'Page 335 quote',
          author: 'Author A',
          book: 'Book A',
          pageSort: 335,
          createdAt: 1000,
        }),
        citation({
          id: 'citation-no-page',
          text: 'Same chapter note without page',
          author: 'Author A',
          book: 'Book A',
          createdAt: 1001,
        }),
        citation({
          id: 'citation-337',
          text: 'Page 337 quote',
          author: 'Author A',
          book: 'Book A',
          pageSort: 337,
          createdAt: 1002,
        }),
      ],
      []
    );

    expect(sortBookViewItems(items, 'page', 'asc').map((item) => item.id)).toEqual([
      'citation-no-page',
      'citation-335',
      'citation-337',
    ]);
  });

  it('keeps a chapter block between neighboring citations when sorting by page', () => {
    const items = toBookViewItems(
      [
        citation({
          id: 'citation-1',
          text: 'First quote',
          author: 'Author A',
          book: 'Book A',
          pageSort: 335,
          createdAt: 1000,
        }),
        citation({
          id: 'citation-2',
          text: 'Second quote',
          author: 'Author B',
          book: 'Book A',
          pageSort: 337,
          createdAt: 1001,
        }),
      ],
      [
        chapterBlock({
          id: 'block-1',
          bookId: 'book-a',
          label: '3장',
          pageSort: 336,
          createdAtSort: 1000.5,
          createdAt: 1000.5,
        }),
      ]
    );

    expect(sortBookViewItems(items, 'page', 'asc').map((item) => item.id)).toEqual([
      'citation-1',
      'block-1',
      'citation-2',
    ]);
  });

  it('uses midpoint fallbacks when only one neighbor exists', () => {
    expect(getMidpoint(336, undefined)).toBe(336.9);
    expect(getMidpoint(undefined, 336)).toBe(335.9);
  });

  it('keeps a block on the same page group when inserted between same-page neighbors', () => {
    expect(getInsertionPageSort(335, 335)).toBe(335);
    expect(getInsertionPageSort(335, undefined)).toBe(335);
    expect(getInsertionPageSort(undefined, 335)).toBe(335);
  });

  it('uses newest-first midpoint fallbacks for descending tie groups', () => {
    expect(getDescendingMidpoint(100, undefined)).toBe(99.9);
    expect(getDescendingMidpoint(undefined, 100)).toBe(100.1);
    expect(getDescendingMidpoint(100.2, 99.8)).toBe(100);
  });
});
