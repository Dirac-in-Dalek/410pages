import { describe, expect, it } from 'vitest';
import type { BookViewItem, ChapterBlock, Citation } from '../../../types';
import { buildCitationRenderRows } from './citationRenderRows';

const citation = (
  id: string,
  kind: Citation['kind'],
  createdAt: number,
  text = id
): Citation => ({
  id,
  kind,
  text,
  author: 'Author',
  bookId: 'book-1',
  book: 'Book',
  notes: [],
  tags: [],
  createdAt,
});

const sentenceItem = (entry: Citation, pageSort?: number): BookViewItem => ({
  type: 'citation',
  id: entry.id,
  citation: entry,
  pageSort,
  createdAtSort: entry.createdAt,
});

const chapterItem = (createdAtSort: number): BookViewItem => {
  const block: ChapterBlock = {
    id: 'chapter-1',
    bookId: 'book-1',
    label: 'Chapter 2',
    createdAtSort,
    createdAt: createdAtSort,
  };
  return { type: 'chapter_block', id: block.id, block, createdAtSort };
};

describe('buildCitationRenderRows', () => {
  it('keeps every short citation as an individual row in the supplied order', () => {
    const short = citation('short', 'sentence', 100, '고독');
    const other = citation('other', 'sentence', 101, '근원적 고독');
    const rows = buildCitationRenderRows([sentenceItem(other, 20), chapterItem(100), sentenceItem(short, 10)]);
    expect(rows.map(row => row.id)).toEqual(['other', 'chapter-1', 'short']);
    expect(rows.map(row => row.type)).toEqual(['sentence', 'chapter_block', 'sentence']);
    expect(rows[0]).toMatchObject({ citation: other, pageSort: 20 });
  });
});
