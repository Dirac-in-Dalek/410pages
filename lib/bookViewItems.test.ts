import { describe, expect, it } from 'vitest';
import { getMidpoint, sortBookViewItems, toBookViewItems } from './bookViewItems';
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
});
