import type { BookViewItem, ChapterBlock, Citation } from '../types';

export const toBookViewItems = (
  citations: Citation[],
  chapterBlocks: ChapterBlock[],
): BookViewItem[] => {
  return [
    ...citations.map((citation) => ({
      type: 'citation' as const,
      id: citation.id,
      citation,
      pageSort: citation.pageSort,
      createdAtSort: citation.createdAt,
    })),
    ...chapterBlocks.map((block) => ({
      type: 'chapter_block' as const,
      id: block.id,
      block,
      pageSort: block.pageSort,
      createdAtSort: block.createdAtSort,
    })),
  ];
};

export const sortBookViewItems = (
  items: BookViewItem[],
  sortField: 'date' | 'page',
  direction: 'asc' | 'desc',
) => {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    if (sortField === 'date') {
      return (a.createdAtSort - b.createdAtSort) * factor;
    }
    if (a.pageSort == null && b.pageSort == null) {
      return b.createdAtSort - a.createdAtSort;
    }
    if (a.pageSort == null) return 1;
    if (b.pageSort == null) return -1;
    if (a.pageSort !== b.pageSort) return (a.pageSort - b.pageSort) * factor;
    return b.createdAtSort - a.createdAtSort;
  });
};

export const getMidpoint = (left?: number, right?: number) => {
  if (left != null && right != null) return (left + right) / 2;
  if (left != null) return left + 0.9;
  if (right != null) return right - 0.1;
  return undefined;
};

// Used for newest-first groups such as createdAt tie-breaking.
// `above` means the item rendered before the insertion point,
// `below` means the item rendered after the insertion point.
export const getDescendingMidpoint = (above?: number, below?: number) => {
  if (above != null && below != null) return (above + below) / 2;
  if (above != null) return above - 0.1;
  if (below != null) return below + 0.1;
  return undefined;
};
