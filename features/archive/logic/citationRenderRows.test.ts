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

const rowShape = (rows: ReturnType<typeof buildCitationRenderRows>) =>
  rows.map((row) =>
    row.type === 'word_group'
      ? `words:${row.citations.map((entry) => entry.id).join(',')}`
      : `${row.type}:${row.id}`
  );

describe('buildCitationRenderRows', () => {
  it('groups consecutive duplicate words immediately above their preceding sentence', () => {
    const first = citation('sentence-1', 'sentence', 100);
    const word1 = citation('word-1', 'word', 101, '고독');
    const word2 = citation('word-2', 'word', 102, '고독');
    const second = citation('sentence-2', 'sentence', 103);

    expect(
      rowShape(
        buildCitationRenderRows(
          [first, word1, word2, second],
          [sentenceItem(first, 10), sentenceItem(second, 11)]
        )
      )
    ).toEqual(['words:word-1,word-2', 'sentence:sentence-1', 'sentence:sentence-2']);
  });

  it('places words after their preceding sentence in oldest-first book mode', () => {
    const sentence = citation('sentence-1', 'sentence', 100);
    const word = citation('word-1', 'word', 101);

    expect(rowShape(buildCitationRenderRows(
      [sentence, word],
      [sentenceItem(sentence)],
      [sentence, word],
      true
    ))).toEqual(['sentence:sentence-1', 'words:word-1']);
  });

  it('uses book ids to keep duplicate-title books separate', () => {
    const selectedSentence = citation('sentence-selected', 'sentence', 100);
    const otherSentence = { ...citation('sentence-other', 'sentence', 105), bookId: 'book-2' };
    const selectedWord = citation('word-selected', 'word', 110);

    expect(rowShape(buildCitationRenderRows(
      [selectedSentence, selectedWord],
      [sentenceItem(selectedSentence)],
      [selectedSentence, otherSentence, selectedWord],
      true
    ))).toEqual(['sentence:sentence-selected', 'words:word-selected']);
  });

  it('sorts an orphan word after an older chapter in oldest-first book mode', () => {
    const word = citation('word-orphan', 'word', 200);
    const block = chapterItem(100);

    expect(rowShape(buildCitationRenderRows([word], [block], [word], true))).toEqual([
      'chapter_block:chapter-1',
      'words:word-orphan',
    ]);
  });

  it('splits orphan words across a chapter boundary in oldest-first book mode', () => {
    const earlyWord = citation('word-early', 'word', 50);
    const lateWord = citation('word-late', 'word', 150);
    const block = chapterItem(100);

    expect(rowShape(buildCitationRenderRows(
      [earlyWord, lateWord],
      [block],
      [earlyWord, lateWord],
      true
    ))).toEqual([
      'words:word-early',
      'chapter_block:chapter-1',
      'words:word-late',
    ]);
  });

  it('keeps the word group immediately above its anchor when display sorting reverses sentences', () => {
    const first = citation('sentence-1', 'sentence', 100);
    const word = citation('word-1', 'word', 101);
    const second = citation('sentence-2', 'sentence', 102);

    expect(
      rowShape(
        buildCitationRenderRows(
          [first, word, second],
          [sentenceItem(second, 11), sentenceItem(first, 10)]
        )
      )
    ).toEqual(['sentence:sentence-2', 'words:word-1', 'sentence:sentence-1']);
  });

  it('places words before the first visible sentence in a leading orphan group', () => {
    const word = citation('word-1', 'word', 100);
    const sentence = citation('sentence-1', 'sentence', 101);

    expect(rowShape(buildCitationRenderRows([word, sentence], [sentenceItem(sentence)]))).toEqual([
      'words:word-1',
      'sentence:sentence-1',
    ]);
  });

  it('reanchors a word to the preceding surviving sentence after its original anchor is removed', () => {
    const surviving = citation('sentence-0', 'sentence', 90);
    const word = citation('word-1', 'word', 101);
    const next = citation('sentence-2', 'sentence', 102);

    expect(
      rowShape(
        buildCitationRenderRows(
          [surviving, word, next],
          [sentenceItem(surviving), sentenceItem(next)]
        )
      )
    ).toEqual(['words:word-1', 'sentence:sentence-0', 'sentence:sentence-2']);
  });

  it('ends the sentence run at an intervening chapter block', () => {
    const sentence = citation('sentence-1', 'sentence', 100);
    const word = citation('word-1', 'word', 102);
    const block = chapterItem(101);

    expect(
      rowShape(buildCitationRenderRows([sentence, word], [sentenceItem(sentence), block]))
    ).toEqual(['sentence:sentence-1', 'chapter_block:chapter-1', 'words:word-1']);
  });

  it('keeps a filtered word visible when its anchor sentence is absent', () => {
    const word = citation('word-1', 'word', 101);
    expect(rowShape(buildCitationRenderRows([word], []))).toEqual(['words:word-1']);
  });

  it('uses author and title to anchor an optimistic word before it receives a book id', () => {
    const sentence = citation('sentence-1', 'sentence', 100);
    const word = { ...citation('word-1', 'word', 101), bookId: undefined };

    expect(
      rowShape(buildCitationRenderRows([sentence, word], [sentenceItem(sentence)]))
    ).toEqual(['words:word-1', 'sentence:sentence-1']);
  });

  it('does not merge visible words separated by a filtered-out sentence', () => {
    const firstWord = citation('word-1', 'word', 101);
    const hiddenSentence = citation('sentence-hidden', 'sentence', 102);
    const secondWord = citation('word-2', 'word', 103);

    expect(
      rowShape(
        buildCitationRenderRows(
          [firstWord, secondWord],
          [],
          [firstWord, hiddenSentence, secondWord]
        )
      )
    ).toEqual(['words:word-1', 'words:word-2']);
  });

  it.each([
    ['date ascending', (items: BookViewItem[]) => items],
    ['date descending', (items: BookViewItem[]) => [...items].reverse()],
    ['page ascending', (items: BookViewItem[]) => items],
    ['page descending', (items: BookViewItem[]) => [...items].reverse()],
  ])('keeps a chapter boundary intact for %s display order', (_label, orderItems) => {
    const sentence = citation('sentence-1', 'sentence', 100);
    const word = citation('word-1', 'word', 102);
    const block = chapterItem(101);
    const orderedItems = orderItems([sentenceItem(sentence, 10), block]);

    const rows = rowShape(buildCitationRenderRows([sentence, word], orderedItems));
    const blockIndex = rows.indexOf('chapter_block:chapter-1');
    const wordIndex = rows.indexOf('words:word-1');

    expect(wordIndex).toBe(blockIndex + 1);
  });
});
