import type { BookViewItem } from '../../../types';
import { getMidpoint } from '../../../lib/bookViewItems';
import { getChapterDepths } from './chapterHierarchy';

// null is the beginning; undefined means the current end of the full book.
export type BookInsertion = { afterId?: string | null; depth: number };

export function resolveBookInsertion(items: BookViewItem[], insertion: BookInsertion) {
  const index = insertion.afterId === undefined ? items.length
    : insertion.afterId === null ? 0 : items.findIndex(item => item.id === insertion.afterId) + 1;
  if (insertion.afterId != null && index === 0) return null;
  const left = items[index - 1];
  const right = items[index];
  const position = getMidpoint(left?.createdAtSort, right?.createdAtSort) ?? Date.now();
  if (!Number.isFinite(position) || (left && position <= left.createdAtSort) || (right && position >= right.createdAtSort)) return null;
  const chapters = items.filter(item => item.type === 'chapter_block').map(item => item.block);
  const depths = getChapterDepths(chapters);
  const preceding = items.slice(0, index).filter(item => item.type === 'chapter_block').map(item => item.block);
  const parent = preceding.at(-1);
  return { index, position, parent, previousDepth: parent ? depths.get(parent.id)! : undefined, depths, chapters };
}
