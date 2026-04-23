import type React from 'react';
import type { SidebarItem } from '../../../types';
import type {
  LibraryTreeDragMeta,
  LibraryTreeDropIndicator,
  LibraryTreeListMeta,
} from '../contract/librarySidebarContract';

const LIBRARY_TREE_REORDER_MIME = 'application/x-library-tree-reorder';

export const setLibraryTreeDragMeta = (
  event: React.DragEvent,
  treeMeta: LibraryTreeDragMeta
) => {
  event.dataTransfer.setData(LIBRARY_TREE_REORDER_MIME, JSON.stringify(treeMeta));
};

export const hasLibraryTreeDragType = (event: React.DragEvent) => {
  const types = Array.from(event.dataTransfer.types || []);
  return types.some((type) => String(type).toLowerCase() === LIBRARY_TREE_REORDER_MIME);
};

export const parseLibraryTreeDragMeta = (
  event: React.DragEvent
): LibraryTreeDragMeta | null => {
  const raw = event.dataTransfer.getData(LIBRARY_TREE_REORDER_MIME);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type !== 'library-tree') return null;
    if (parsed?.itemType !== 'author' && parsed?.itemType !== 'book') return null;
    if (!parsed?.id) return null;
    return parsed as LibraryTreeDragMeta;
  } catch {
    return null;
  }
};

export const resolveLibraryTreeDragMeta = (
  event: React.DragEvent,
  activeTreeDragMeta: LibraryTreeDragMeta | null
) => parseLibraryTreeDragMeta(event) ?? activeTreeDragMeta;

export const canDropInLibraryTreeList = (
  dragMeta: LibraryTreeDragMeta,
  listType: 'author' | 'book',
  parentAuthorId?: string
) => {
  if (listType === 'author') return dragMeta.itemType === 'author';
  return dragMeta.itemType === 'book' && dragMeta.authorId === parentAuthorId;
};

export const calcLibraryTreeDropPosition = (
  event: React.DragEvent,
  target: HTMLElement,
  dragCenterOffsetY: number
) => {
  const rect = target.getBoundingClientRect();
  const projectedCenterY = event.clientY + dragCenterOffsetY;
  const midY = rect.top + rect.height / 2;
  return projectedCenterY < midY ? 'before' : 'after';
};

export const buildLibraryTreeBoundaryIndicator = (
  items: SidebarItem[],
  listType: 'author' | 'book',
  boundary: 'start' | 'end',
  parentAuthor?: string
): LibraryTreeDropIndicator | null => {
  if (items.length === 0) return null;

  if (boundary === 'start') {
    return {
      itemId: items[0].id,
      position: 'before',
      dropIndex: 0,
      listType,
      parentAuthor,
    };
  }

  return {
    itemId: items[items.length - 1].id,
    position: 'after',
    dropIndex: items.length,
    listType,
    parentAuthor,
  };
};

export const buildLibraryTreeListIndicator = (
  event: React.DragEvent,
  list: LibraryTreeListMeta,
  dragCenterOffsetY: number
): LibraryTreeDropIndicator | null => {
  if (list.items.length === 0) return null;

  const container = event.currentTarget as HTMLElement;
  const rowElements = Array.from(container.children).filter(
    (node): node is HTMLElement =>
      node instanceof HTMLElement && node.dataset.treeRowIndex !== undefined
  );
  if (rowElements.length === 0) return null;

  const projectedCenterY = event.clientY + dragCenterOffsetY;
  for (let index = 0; index < rowElements.length; index += 1) {
    const rect = rowElements[index].getBoundingClientRect();
    const rowMidY = rect.top + rect.height / 2;
    if (projectedCenterY < rowMidY) {
      return {
        itemId: list.items[index].id,
        position: 'before',
        dropIndex: index,
        listType: list.listType,
        parentAuthor: list.parentAuthor,
      };
    }
  }

  return {
    itemId: list.items[list.items.length - 1].id,
    position: 'after',
    dropIndex: list.items.length,
    listType: list.listType,
    parentAuthor: list.parentAuthor,
  };
};
