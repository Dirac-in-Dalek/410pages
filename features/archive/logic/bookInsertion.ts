import type { BookViewItem, ChapterBlock } from '../../../types';
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

// A citation belongs to the preceding chapter. Moving out therefore moves the
// marker to the end of the parent's direct content, before its first child.
export function changeCitationInsertion(items: BookViewItem[], insertion: BookInsertion, direction: 'in' | 'out'): BookInsertion {
  const current = resolveBookInsertion(items, insertion);
  if (!current) return insertion;
  const { parent, chapters, depths } = current;
  let target: ChapterBlock | undefined;
  if (direction === 'out') {
    if (!parent) return insertion;
    const depth = depths.get(parent.id)!;
    target = [...chapters].reverse().find(chapter => chapter.createdAtSort < parent.createdAtSort && depths.get(chapter.id) === depth - 1);
  } else {
    const start = parent ? chapters.findIndex(chapter => chapter.id === parent.id) + 1 : 0;
    const candidate = chapters[start];
    if (!candidate || depths.get(candidate.id) !== (parent ? depths.get(parent.id)! + 1 : 0)) return insertion;
    target = candidate;
  }
  const start = target ? items.findIndex(item => item.id === target.id) + 1 : 0;
  let end = start;
  while (end < items.length && items[end].type !== 'chapter_block') end++;
  return { afterId: end ? items[end - 1].id : null, depth: target ? depths.get(target.id)! : 0 };
}
