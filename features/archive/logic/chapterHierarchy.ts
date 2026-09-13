import type { ChapterBlock } from '../../../types';

export function getChapterDepths(chapters: ChapterBlock[]) {
  const depths = new Map<string, number>();
  let previous = -1;
  for (const chapter of [...chapters].sort((a, b) => a.createdAtSort - b.createdAtSort)) {
    const stored = Number.isSafeInteger(chapter.depth) && chapter.depth! >= 0 ? chapter.depth! : 0;
    // A moved chapter cannot have ancestors that do not exist before it.
    const depth = Math.min(stored, previous + 1);
    depths.set(chapter.id, depth);
    previous = depth;
  }
  return depths;
}

export function getChapterDropPlacement(chapters: ChapterBlock[], movedId: string, position: number, requestedDepth: number) {
  const preceding = chapters.filter(chapter => chapter.id !== movedId && chapter.createdAtSort < position)
    .sort((a, b) => a.createdAtSort - b.createdAtSort);
  const depths = getChapterDepths(preceding);
  const previous = preceding.at(-1);
  const depth = Math.max(0, Math.min(Math.round(requestedDepth), previous ? depths.get(previous.id)! + 1 : 0));
  const parent = [...preceding].reverse().find(chapter => depths.get(chapter.id) === depth - 1);
  return { depth, parent };
}

type TitleKeyEvent = {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  currentTarget: Pick<HTMLInputElement, 'selectionStart' | 'selectionEnd'>;
  nativeEvent: Pick<KeyboardEvent, 'isComposing' | 'keyCode'>;
};

export function getChapterLevelDirection(event: TitleKeyEvent): 'in' | 'out' | null {
  if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (event.currentTarget.selectionStart !== 0 || event.currentTarget.selectionEnd !== 0) return null;
  if (event.key === 'Tab' || event.key === ' ') return 'in';
  if (event.key === 'Delete' || event.key === 'Backspace') return 'out';
  return null;
}

export function changeChapterDepth(depth: number, previousDepth: number | undefined, direction: 'in' | 'out') {
  return direction === 'out' ? Math.max(0, depth - 1) : previousDepth === undefined ? depth : previousDepth + 1;
}
