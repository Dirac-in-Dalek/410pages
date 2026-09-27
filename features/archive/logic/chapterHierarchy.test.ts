import { describe, expect, it } from 'vitest';
import { changeChapterDepth, getChapterDepths, getChapterDropPlacement, getChapterLevelDirection } from './chapterHierarchy';
import { generateBookPosition, legacyOrderKey } from '../../../lib/bookOrder';

describe('chapter levels', () => {
  it('derives levels from saved order, including moves that leave missing ancestors', () => {
    const chapters = [
      { id: 'two', bookId: 'book', label: '2장', createdAtSort: 2, createdAt: 0, depth: 0 },
      { id: 'child', bookId: 'book', label: '소제목', createdAtSort: 3, createdAt: 0, depth: 1 },
      { id: 'grandchild', bookId: 'book', label: '더 아래', createdAtSort: 4, createdAt: 0, depth: 2 },
    ];
    expect([...getChapterDepths(chapters)]).toEqual([['two', 0], ['child', 1], ['grandchild', 2]]);
    expect([...getChapterDepths(chapters.map(c => c.id === 'child' ? { ...c, createdAtSort: 1 } : c))]).toEqual([['child', 0], ['two', 0], ['grandchild', 1]]);
    expect(chapters[1].depth).toBe(1);
  });

  it('uses the previous chapter as parent and removes one level on outdent', () => {
    expect(changeChapterDepth(0, 0, 'in')).toBe(1);
    expect(changeChapterDepth(1, 0, 'out')).toBe(0);
    expect(changeChapterDepth(0, 2, 'in')).toBe(1);
    expect(changeChapterDepth(0, undefined, 'in')).toBe(0);
    expect(changeChapterDepth(0, 0, 'out')).toBe(0);
  });

  it('keeps selections, IME composition, modifiers, and nonleading input native', () => {
    const event = { key: ' ', altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, currentTarget: { selectionStart: 0, selectionEnd: 0 }, nativeEvent: { isComposing: false, keyCode: 32 } };
    expect(getChapterLevelDirection(event)).toBe('in');
    expect(getChapterLevelDirection({ ...event, key: 'Backspace' })).toBe('out');
    expect(getChapterLevelDirection({ ...event, currentTarget: { selectionStart: 0, selectionEnd: 1 } })).toBeNull();
    expect(getChapterLevelDirection({ ...event, currentTarget: { selectionStart: 1, selectionEnd: 1 } })).toBeNull();
    expect(getChapterLevelDirection({ ...event, nativeEvent: { isComposing: true, keyCode: 32 } })).toBeNull();
    expect(getChapterLevelDirection({ ...event, nativeEvent: { isComposing: false, keyCode: 229 } })).toBeNull();
    expect(getChapterLevelDirection({ ...event, key: 'Tab', shiftKey: true })).toBeNull();
  });
});

it('projects siblings, grandchildren and root drops using the destination order', () => {
  const chapter = (id: string, depth: number, createdAtSort: number) => ({ id, depth, createdAtSort, label: id, bookId: 'b', createdAt: 0 });
  const chapters = [chapter('one', 0, 1), chapter('two', 0, 2), chapter('child', 1, 3), chapter('moved', 0, 4)];
  expect(getChapterDropPlacement(chapters, 'moved', 3.5, 1)).toEqual({ depth: 1, parent: chapters[1] });
  expect(getChapterDropPlacement(chapters, 'moved', 3.5, 2)).toEqual({ depth: 2, parent: chapters[2] });
  expect(getChapterDropPlacement(chapters, 'moved', 3.5, -1)).toEqual({ depth: 0, parent: undefined });
  expect(getChapterDropPlacement(chapters, 'moved', 0.5, 100)).toEqual({ depth: 0, parent: undefined });
  expect(getChapterDropPlacement(chapters, 'moved', 2.5, 100).depth).toBe(1);
  // Removing the old parent changes the available levels before the new position.
  expect(getChapterDropPlacement(chapters, 'two', 3.5, 2)).toEqual({ depth: 2, parent: chapters[2] });
});

it('keeps deeply nested ownership when chapters mix legacy and string positions', () => {
  const root = { id: 'root', bookId: 'b', label: 'Root', depth: 0, createdAtSort: 10, createdAt: 0 };
  const childKey = generateBookPosition(10, 20);
  const child = { id: 'child', bookId: 'b', label: 'Child', depth: 1, createdAtSort: 999, orderKey: childKey, createdAt: 0 };
  const grandchildKey = generateBookPosition(childKey, 20);
  const grandchild = { id: 'grandchild', bookId: 'b', label: 'Grandchild', depth: 2, createdAtSort: -999, orderKey: grandchildKey, createdAt: 0 };
  const next = { id: 'next', bookId: 'b', label: 'Next', depth: 0, createdAtSort: 20, orderKey: legacyOrderKey(20), createdAt: 0 };
  const chapters = [next, grandchild, root, child];

  expect([...getChapterDepths(chapters)]).toEqual([
    ['root', 0], ['child', 1], ['grandchild', 2], ['next', 0],
  ]);
  const position = generateBookPosition(grandchildKey, legacyOrderKey(20));
  expect(getChapterDropPlacement(chapters, 'moving', position, 3)).toEqual({ depth: 3, parent: grandchild });
});
