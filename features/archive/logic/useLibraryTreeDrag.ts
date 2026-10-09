import React, { useEffect, useRef, useState } from 'react';
import type { SidebarItem } from '../../../types';
import type {
  LibrarySidebarTreeContract,
  LibraryTreeDragMeta,
  LibraryTreeDropIndicator,
  LibraryTreeListMeta,
  LibraryTreeRowMeta,
} from '../contract/librarySidebarContract';
import {
  buildLibraryTreeBoundaryIndicator,
  buildLibraryTreeListIndicator,
  calcLibraryTreeDropPosition,
  canDropInLibraryTreeList,
  hasLibraryTreeDragType,
  resolveLibraryTreeDragMeta,
  setLibraryTreeDragMeta,
} from './librarySidebarDnd';

type AuthorDropTarget = { folderId: string } | { outside: true };

const resolveAuthorDropTarget = (target: HTMLElement | null): AuthorDropTarget | null => {
  const folderId = target?.closest<HTMLElement>('[data-author-folder-drop]')?.dataset.authorFolderDrop;
  if (folderId) return { folderId };
  return target?.closest('[data-author-outside-drop]') ? { outside: true } : null;
};

type Options = Pick<
  LibrarySidebarTreeContract,
  'treeData' | 'onReorderAuthorAt' | 'onReorderBookAt' | 'onMoveAuthorToFolder' | 'onRemoveAuthorFromFolder'
> & { mobile: boolean };
export function useLibraryTreeDrag({
  treeData,
  mobile,
  onReorderAuthorAt,
  onReorderBookAt,
  onMoveAuthorToFolder,
  onRemoveAuthorFromFolder,
}: Options) {
  const [treeDropIndicator, setTreeDropIndicator] = useState<LibraryTreeDropIndicator | null>(null);
  const [isTreeDragging, setIsTreeDragging] = useState(false);
  const [activeTreeDragMeta, setActiveTreeDragMeta] = useState<LibraryTreeDragMeta | null>(null);
  const [dragCenterOffsetY, setDragCenterOffsetY] = useState(0);
  const [touchDropTarget, setTouchDropTarget] = useState<string | 'outside' | null>(null);
  const touchDragCleanupRef = useRef<(() => void) | null>(null);
  const suppressClickAuthorIdRef = useRef<string | null>(null);
  const suppressClickTimerRef = useRef<number | null>(null);
  const isAuthorDragging = isTreeDragging && activeTreeDragMeta?.itemType === 'author';
  useEffect(
    () => () => {
      touchDragCleanupRef.current?.();
      if (suppressClickTimerRef.current !== null) window.clearTimeout(suppressClickTimerRef.current);
    },
    []
  );

  const suppressAuthorClickBriefly = (authorId: string) => {
    if (suppressClickTimerRef.current !== null) window.clearTimeout(suppressClickTimerRef.current);
    suppressClickAuthorIdRef.current = authorId;
    suppressClickTimerRef.current = window.setTimeout(() => {
      if (suppressClickAuthorIdRef.current === authorId) suppressClickAuthorIdRef.current = null;
      suppressClickTimerRef.current = null;
    }, 700);
  };

  const handleTreeDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    data: SidebarItem['data'],
    treeMeta?: LibraryTreeDragMeta
  ) => {
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'reference',
        ...data,
      })
    );

    if (treeMeta) {
      const row = event.currentTarget as HTMLElement;
      const rect = row.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      setLibraryTreeDragMeta(event, treeMeta);
      setIsTreeDragging(true);
      setTreeDropIndicator(null);
      setActiveTreeDragMeta(treeMeta);
      setDragCenterOffsetY(centerY - event.clientY);
    }

    event.dataTransfer.effectAllowed = treeMeta ? 'copyMove' : 'copy';
  };

  const commitAuthorDrop = (authorId: string, target: AuthorDropTarget | null) => {
    if (!target) return;
    if ('folderId' in target) void Promise.resolve(onMoveAuthorToFolder?.(authorId, target.folderId));
    else void Promise.resolve(onRemoveAuthorFromFolder?.(authorId));
  };

  const getAuthorGroupItems = (authorGroupId?: string) =>
    authorGroupId === 'outside'
      ? treeData.filter((item) => item.type === 'author')
      : treeData
          .find((item) => item.type === 'author_folder' && item.data?.folderId === authorGroupId)
          ?.children?.filter((item) => item.type === 'author') || [];

  const applyTreeReorder = (dragMeta: LibraryTreeDragMeta, indicator: LibraryTreeDropIndicator) => {
    if (indicator.listType === 'author') {
      const groupItems = getAuthorGroupItems(indicator.authorGroupId);
      onReorderAuthorAt?.(
        groupItems.map((item) => item.data?.authorId).filter((id): id is string => Boolean(id)),
        dragMeta.id,
        indicator.dropIndex
      );
      return;
    }

    if (indicator.parentAuthor) {
      onReorderBookAt?.(indicator.parentAuthor, dragMeta.id, indicator.dropIndex);
    }
  };

  const getBookItemsForAuthor = (authorId: string) => {
    const ownerNode = treeData
      .flatMap((item) => (item.type === 'author_folder' ? item.children || [] : [item]))
      .find((item) => (item.type === 'author' || item.type === 'root') && item.data?.authorId === authorId);
    return (ownerNode?.children || []).filter((child) => child.type === 'book');
  };

  const handleKeyboardReorder = (item: SidebarItem, rowMeta: LibraryTreeRowMeta, direction: -1 | 1) => {
    const items =
      rowMeta.listType === 'author'
        ? getAuthorGroupItems(rowMeta.authorGroupId)
        : rowMeta.parentAuthor
          ? getBookItemsForAuthor(rowMeta.parentAuthor)
          : [];
    if ((direction === -1 && rowMeta.index === 0) || (direction === 1 && rowMeta.index === items.length - 1))
      return;
    const dropIndex = direction === -1 ? rowMeta.index - 1 : rowMeta.index + 2;
    if (rowMeta.listType === 'author' && item.data?.authorId) {
      onReorderAuthorAt?.(
        items.map((entry) => entry.data?.authorId).filter((id): id is string => Boolean(id)),
        item.data.authorId,
        dropIndex
      );
    } else if (rowMeta.parentAuthor && item.data?.bookId) {
      onReorderBookAt?.(rowMeta.parentAuthor, item.data.bookId, dropIndex);
    }
  };

  const getPanelBoundaryIndicator = (
    dragMeta: LibraryTreeDragMeta,
    authorItems: SidebarItem[],
    boundary: 'start' | 'end'
  ) => {
    if (dragMeta.itemType === 'author') {
      if (dragMeta.authorGroupId !== 'outside') return null;
      return buildLibraryTreeBoundaryIndicator(authorItems, 'author', boundary, undefined, 'outside');
    }

    if (dragMeta.itemType === 'book' && dragMeta.authorId) {
      const books = getBookItemsForAuthor(dragMeta.authorId);
      return buildLibraryTreeBoundaryIndicator(books, 'book', boundary, dragMeta.authorId);
    }

    return null;
  };

  const resolveTreePanelIndicator = (event: React.DragEvent<HTMLDivElement>, authorItems: SidebarItem[]) => {
    if (!hasLibraryTreeDragType(event) && !activeTreeDragMeta) return null;

    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (!dragMeta) return null;

    const target = event.target as HTMLElement;
    if (target?.closest?.('[data-tree-row-index]')) return null;

    const panelRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const projectedCenterY = event.clientY + dragCenterOffsetY;
    const boundary = projectedCenterY <= panelRect.top + panelRect.height / 2 ? 'start' : 'end';
    const indicator = getPanelBoundaryIndicator(dragMeta, authorItems, boundary);

    return indicator ? { dragMeta, indicator } : null;
  };

  const handleTreeRowDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    row: LibraryTreeRowMeta & { itemId: string }
  ) => {
    if (!hasLibraryTreeDragType(event) && !activeTreeDragMeta) return;

    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (!dragMeta || !canDropInLibraryTreeList(dragMeta, row.listType, row.parentAuthor, row.authorGroupId)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';

    const position = calcLibraryTreeDropPosition(
      event,
      event.currentTarget as HTMLElement,
      dragCenterOffsetY
    );
    const dropIndex = position === 'before' ? row.index : row.index + 1;

    setTreeDropIndicator({
      itemId: row.itemId,
      position,
      dropIndex,
      listType: row.listType,
      parentAuthor: row.parentAuthor,
      authorGroupId: row.authorGroupId,
    });
  };

  const handleTreeRowDrop = (
    event: React.DragEvent<HTMLDivElement>,
    row: LibraryTreeRowMeta & { itemId: string }
  ) => {
    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (!dragMeta || !canDropInLibraryTreeList(dragMeta, row.listType, row.parentAuthor, row.authorGroupId)) {
      setTreeDropIndicator(null);
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const position = calcLibraryTreeDropPosition(
      event,
      event.currentTarget as HTMLElement,
      dragCenterOffsetY
    );
    const dropIndex = position === 'before' ? row.index : row.index + 1;

    applyTreeReorder(dragMeta, {
      itemId: row.itemId,
      position,
      dropIndex,
      listType: row.listType,
      parentAuthor: row.parentAuthor,
      authorGroupId: row.authorGroupId,
    });

    setTreeDropIndicator(null);
  };

  const handleTreeListDragOver = (event: React.DragEvent<HTMLDivElement>, list: LibraryTreeListMeta) => {
    if (!hasLibraryTreeDragType(event) && !activeTreeDragMeta) return;

    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (
      !dragMeta ||
      !canDropInLibraryTreeList(dragMeta, list.listType, list.parentAuthor, list.authorGroupId)
    ) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const indicator = buildLibraryTreeListIndicator(event, list, dragCenterOffsetY);
    if (indicator) {
      setTreeDropIndicator(indicator);
    }
  };

  const handleTreeListDrop = (event: React.DragEvent<HTMLDivElement>, list: LibraryTreeListMeta) => {
    if (!hasLibraryTreeDragType(event) && !activeTreeDragMeta) return;

    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (
      !dragMeta ||
      !canDropInLibraryTreeList(dragMeta, list.listType, list.parentAuthor, list.authorGroupId)
    ) {
      return;
    }

    event.preventDefault();

    const indicator = treeDropIndicator ?? buildLibraryTreeListIndicator(event, list, dragCenterOffsetY);
    if (!indicator) {
      setTreeDropIndicator(null);
      return;
    }

    applyTreeReorder(dragMeta, indicator);
    setTreeDropIndicator(null);
  };

  const handleTreePanelDragOver = (event: React.DragEvent<HTMLDivElement>, authorItems: SidebarItem[]) => {
    const resolved = resolveTreePanelIndicator(event, authorItems);

    if (resolved) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setTreeDropIndicator(resolved.indicator);
    }
  };

  const handleTreePanelDrop = (event: React.DragEvent<HTMLDivElement>, authorItems: SidebarItem[]) => {
    const resolved = resolveTreePanelIndicator(event, authorItems);

    if (resolved) {
      event.preventDefault();
      applyTreeReorder(resolved.dragMeta, resolved.indicator);
    }

    setTreeDropIndicator(null);
  };

  const resetTreeDragState = () => {
    setTreeDropIndicator(null);
    setIsTreeDragging(false);
    setActiveTreeDragMeta(null);
    setDragCenterOffsetY(0);
    setTouchDropTarget(null);
  };

  const beginMobileAuthorTouchDrag = (event: React.TouchEvent<HTMLDivElement>, item: SidebarItem) => {
    const authorId = item.data?.authorId;
    if (!mobile || item.type !== 'author' || !authorId || event.touches.length !== 1) return;
    if ((event.target as HTMLElement).closest('button, input, textarea, select, label, a')) return;
    touchDragCleanupRef.current?.();

    const initialTouch = event.touches[0];
    const touchId = initialTouch.identifier;
    const startX = initialTouch.clientX;
    const startY = initialTouch.clientY;
    let lastX = startX;
    let lastY = startY;
    let isActive = false;
    let autoScrollTimer: number | null = null;
    let autoScrollDirection = 0;
    const scrollContainer = (event.currentTarget as HTMLElement).closest<HTMLElement>(
      '[data-library-sidebar-scroll]'
    );

    const updateTarget = (clientX: number, clientY: number) => {
      const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      const dropTarget = resolveAuthorDropTarget(target);
      if (dropTarget && 'folderId' in dropTarget) setTouchDropTarget(dropTarget.folderId);
      else if (dropTarget) setTouchDropTarget('outside');
      else setTouchDropTarget(null);
      return dropTarget;
    };

    const cleanup = () => {
      window.clearTimeout(longPressTimer);
      if (autoScrollTimer !== null) window.clearInterval(autoScrollTimer);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
      if (touchDragCleanupRef.current === cleanup) touchDragCleanupRef.current = null;
    };

    const findTouch = (touches: TouchList) =>
      Array.from(touches).find((touch) => touch.identifier === touchId);
    const updateAutoScroll = (clientY: number) => {
      if (!scrollContainer) return;
      const rect = scrollContainer.getBoundingClientRect();
      const direction = clientY < rect.top + 56 ? -1 : clientY > rect.bottom - 56 ? 1 : 0;
      if (direction === autoScrollDirection) return;
      autoScrollDirection = direction;
      if (autoScrollTimer !== null) {
        window.clearInterval(autoScrollTimer);
        autoScrollTimer = null;
      }
      if (direction === 0) return;
      autoScrollTimer = window.setInterval(() => {
        scrollContainer.scrollTop += direction * 14;
        updateTarget(lastX, lastY);
      }, 32);
    };
    const handleTouchMove = (nativeEvent: TouchEvent) => {
      const touch = findTouch(nativeEvent.touches);
      if (!touch) return;
      lastX = touch.clientX;
      lastY = touch.clientY;
      if (!isActive) {
        if (Math.hypot(lastX - startX, lastY - startY) > 8) cleanup();
        return;
      }
      nativeEvent.preventDefault();
      updateAutoScroll(lastY);
      updateTarget(lastX, lastY);
    };
    const finish = (nativeEvent: TouchEvent) => {
      const touch = findTouch(nativeEvent.changedTouches);
      if (touch) {
        lastX = touch.clientX;
        lastY = touch.clientY;
      }
      if (isActive) {
        nativeEvent.preventDefault();
        suppressAuthorClickBriefly(authorId);
        commitAuthorDrop(authorId, updateTarget(lastX, lastY));
      }
      cleanup();
      resetTreeDragState();
    };
    const handleTouchEnd = (nativeEvent: TouchEvent) => finish(nativeEvent);
    const handleTouchCancel = () => {
      if (isActive) suppressAuthorClickBriefly(authorId);
      cleanup();
      resetTreeDragState();
    };
    const longPressTimer = window.setTimeout(() => {
      isActive = true;
      setIsTreeDragging(true);
      setActiveTreeDragMeta({ type: 'library-tree', itemType: 'author', id: authorId });
      updateAutoScroll(lastY);
      updateTarget(lastX, lastY);
    }, 450);

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: false });
    touchDragCleanupRef.current = cleanup;
  };

  const handleAuthorGroupDragOver = (event: React.DragEvent) => {
    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (!dragMeta) return;
    if (dragMeta.itemType !== 'author') {
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleAuthorGroupDrop = (event: React.DragEvent, folderId?: string) => {
    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (!dragMeta) return;
    if (dragMeta.itemType !== 'author') {
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    commitAuthorDrop(dragMeta.id, folderId ? { folderId } : { outside: true });
    resetTreeDragState();
  };

  const handleAuthorListDragOver = (event: React.DragEvent<HTMLDivElement>, list: LibraryTreeListMeta) => {
    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (dragMeta?.authorGroupId === list.authorGroupId) {
      handleTreeListDragOver(event, list);
      return;
    }
    handleAuthorGroupDragOver(event);
  };

  const handleAuthorListDrop = (
    event: React.DragEvent<HTMLDivElement>,
    list: LibraryTreeListMeta,
    folderId?: string
  ) => {
    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (dragMeta?.authorGroupId === list.authorGroupId) {
      handleTreeListDrop(event, list);
      resetTreeDragState();
      return;
    }
    handleAuthorGroupDrop(event, folderId);
  };

  return {
    treeDropIndicator,
    setTreeDropIndicator,
    suppressClickTimerRef,
    isTreeDragging,
    activeTreeDragMeta,
    touchDropTarget,
    suppressClickAuthorIdRef,
    isAuthorDragging,
    handleTreeDragStart,
    handleKeyboardReorder,
    handleTreeRowDragOver,
    handleTreeRowDrop,
    handleTreeListDragOver,
    handleTreeListDrop,
    handleTreePanelDragOver,
    handleTreePanelDrop,
    resetTreeDragState,
    beginMobileAuthorTouchDrag,
    handleAuthorGroupDragOver,
    handleAuthorGroupDrop,
    handleAuthorListDragOver,
    handleAuthorListDrop,
  };
}
