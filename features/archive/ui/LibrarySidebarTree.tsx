import React, { useState } from 'react';
import { Book, Edit2, User } from 'lucide-react';
import type { SidebarItem } from '../../../types';
import {
  createDefaultExpandedLibraryNodes,
  ensureExpandedLibraryNode,
  isLibraryTreeItemActive,
  toggleExpandedLibraryNode,
} from '../../../shared/lib/libraryTree';
import { LibraryTreeRow } from '../../../shared/ui/sidebar/LibraryTreeRow';
import type {
  LibrarySidebarProps,
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
import {
  EditorialIconActionButton,
  EditorialInlineRenameField,
} from '../../../shared/ui/sidebar/SidebarControls';

type LibrarySidebarTreeProps = Pick<
  LibrarySidebarProps,
  | 'treeData'
  | 'onTreeItemClick'
  | 'selectedFilter'
  | 'onReorderAuthorAt'
  | 'onReorderBookAt'
  | 'onRenameAuthor'
  | 'onRenameBook'
> & {
  headerContent?: React.ReactNode;
};

export const LibrarySidebarTree: React.FC<LibrarySidebarTreeProps> = ({
  treeData,
  onTreeItemClick,
  selectedFilter = null,
  onReorderAuthorAt,
  onReorderBookAt,
  onRenameAuthor,
  onRenameBook,
  headerContent,
}) => {
  const [expandedNodes, setExpandedNodes] = useState(createDefaultExpandedLibraryNodes);
  const [treeDropIndicator, setTreeDropIndicator] = useState<LibraryTreeDropIndicator | null>(null);
  const [isTreeDragging, setIsTreeDragging] = useState(false);
  const [activeTreeDragMeta, setActiveTreeDragMeta] = useState<LibraryTreeDragMeta | null>(null);
  const [dragCenterOffsetY, setDragCenterOffsetY] = useState(0);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const startNodeEdit = (item: SidebarItem, event: React.MouseEvent) => {
    event.stopPropagation();
    if (item.type !== 'author' && item.type !== 'book') return;
    setEditingNodeId(item.id);
    setEditingValue(item.label);
  };

  const cancelNodeEdit = () => {
    setEditingNodeId(null);
    setEditingValue('');
  };

  const saveNodeEdit = (item: SidebarItem) => {
    const trimmed = editingValue.trim();
    if (!trimmed || trimmed === item.label) {
      cancelNodeEdit();
      return;
    }

    if (item.type === 'author' && item.data?.authorId) {
      onRenameAuthor?.(item.data.authorId, trimmed);
    }
    if (item.type === 'book' && item.data?.bookId) {
      onRenameBook?.(item.data.bookId, trimmed);
    }

    cancelNodeEdit();
  };

  const toggleNode = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExpandedNodes((prev) => toggleExpandedLibraryNode(prev, id));
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

  const applyTreeReorder = (
    dragMeta: LibraryTreeDragMeta,
    indicator: LibraryTreeDropIndicator
  ) => {
    if (indicator.listType === 'author') {
      onReorderAuthorAt?.(dragMeta.id, indicator.dropIndex);
      return;
    }

    if (indicator.parentAuthor) {
      onReorderBookAt?.(indicator.parentAuthor, dragMeta.id, indicator.dropIndex);
    }
  };

  const getBookItemsForAuthor = (authorId: string) => {
    const ownerNode = treeData.find(
      (item) =>
        (item.type === 'author' || item.type === 'root') &&
        item.data?.authorId === authorId
    );
    return (ownerNode?.children || []).filter((child) => child.type === 'book');
  };

  const getPanelBoundaryIndicator = (
    dragMeta: LibraryTreeDragMeta,
    authorItems: SidebarItem[],
    boundary: 'start' | 'end'
  ) => {
    if (dragMeta.itemType === 'author') {
      return buildLibraryTreeBoundaryIndicator(authorItems, 'author', boundary);
    }

    if (dragMeta.itemType === 'book' && dragMeta.authorId) {
      const books = getBookItemsForAuthor(dragMeta.authorId);
      return buildLibraryTreeBoundaryIndicator(
        books,
        'book',
        boundary,
        dragMeta.authorId
      );
    }

    return null;
  };

  const handleTreeRowDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    row: LibraryTreeRowMeta & { itemId: string }
  ) => {
    if (!hasLibraryTreeDragType(event) && !activeTreeDragMeta) return;

    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (!dragMeta || !canDropInLibraryTreeList(dragMeta, row.listType, row.parentAuthor)) {
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
    });
  };

  const handleTreeRowDrop = (
    event: React.DragEvent<HTMLDivElement>,
    row: LibraryTreeRowMeta & { itemId: string }
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (!dragMeta || !canDropInLibraryTreeList(dragMeta, row.listType, row.parentAuthor)) {
      setTreeDropIndicator(null);
      return;
    }

    const position = calcLibraryTreeDropPosition(
      event,
      event.currentTarget as HTMLElement,
      dragCenterOffsetY
    );
    const dropIndex = position === 'before' ? row.index : row.index + 1;

    if (row.listType === 'author') {
      onReorderAuthorAt?.(dragMeta.id, dropIndex);
    } else if (row.parentAuthor) {
      onReorderBookAt?.(row.parentAuthor, dragMeta.id, dropIndex);
    }

    setTreeDropIndicator(null);
  };

  const handleTreeListDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    list: LibraryTreeListMeta
  ) => {
    if (!hasLibraryTreeDragType(event) && !activeTreeDragMeta) return;

    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (!dragMeta || !canDropInLibraryTreeList(dragMeta, list.listType, list.parentAuthor)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const indicator = buildLibraryTreeListIndicator(event, list, dragCenterOffsetY);
    if (indicator) {
      setTreeDropIndicator(indicator);
    }
  };

  const handleTreeListDrop = (
    event: React.DragEvent<HTMLDivElement>,
    list: LibraryTreeListMeta
  ) => {
    if (!hasLibraryTreeDragType(event) && !activeTreeDragMeta) return;

    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (!dragMeta || !canDropInLibraryTreeList(dragMeta, list.listType, list.parentAuthor)) {
      return;
    }

    event.preventDefault();

    const indicator =
      treeDropIndicator ?? buildLibraryTreeListIndicator(event, list, dragCenterOffsetY);
    if (!indicator) {
      setTreeDropIndicator(null);
      return;
    }

    applyTreeReorder(dragMeta, indicator);
    setTreeDropIndicator(null);
  };

  const handleTreePanelDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    authorItems: SidebarItem[]
  ) => {
    if (!hasLibraryTreeDragType(event) && !activeTreeDragMeta) return;

    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (!dragMeta) return;

    const target = event.target as HTMLElement;
    if (target?.closest?.('[data-tree-row-index]')) return;

    const panelRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const projectedCenterY = event.clientY + dragCenterOffsetY;
    const boundary =
      projectedCenterY <= panelRect.top + panelRect.height / 2 ? 'start' : 'end';
    const nextIndicator = getPanelBoundaryIndicator(dragMeta, authorItems, boundary);

    if (nextIndicator) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setTreeDropIndicator(nextIndicator);
    }
  };

  const handleTreePanelDrop = (
    event: React.DragEvent<HTMLDivElement>,
    authorItems: SidebarItem[]
  ) => {
    if (!hasLibraryTreeDragType(event) && !activeTreeDragMeta) return;

    const dragMeta = resolveLibraryTreeDragMeta(event, activeTreeDragMeta);
    if (!dragMeta) return;

    const target = event.target as HTMLElement;
    if (target?.closest?.('[data-tree-row-index]')) return;

    const panelRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const projectedCenterY = event.clientY + dragCenterOffsetY;
    const boundary =
      projectedCenterY <= panelRect.top + panelRect.height / 2 ? 'start' : 'end';
    const indicator = getPanelBoundaryIndicator(dragMeta, authorItems, boundary);

    if (indicator) {
      event.preventDefault();
      applyTreeReorder(dragMeta, indicator);
    }

    setTreeDropIndicator(null);
  };

  const resetTreeDragState = () => {
    setTreeDropIndicator(null);
    setIsTreeDragging(false);
    setActiveTreeDragMeta(null);
    setDragCenterOffsetY(0);
  };

  const renderTreeRow = (
    item: SidebarItem,
    depth: number,
    rowMeta?: LibraryTreeRowMeta
  ) => {
    const isExpanded = expandedNodes.has(item.id);
    const isActive = isLibraryTreeItemActive(item, selectedFilter);
    const treeMeta: LibraryTreeDragMeta | undefined =
      item.type === 'author'
        ? item.data?.authorId
          ? { type: 'library-tree', itemType: 'author', id: item.data.authorId }
          : undefined
        : item.type === 'book'
          ? item.data?.bookId && item.data?.authorId
            ? {
                type: 'library-tree',
                itemType: 'book',
                id: item.data.bookId,
                authorId: item.data.authorId,
              }
            : undefined
          : undefined;

    const showBefore =
      isTreeDragging &&
      treeDropIndicator?.itemId === item.id &&
      treeDropIndicator.position === 'before';
    const showAfter =
      isTreeDragging &&
      treeDropIndicator?.itemId === item.id &&
      treeDropIndicator.position === 'after';
    const canReorder = Boolean(treeMeta);
    const rowTypeLabel =
      item.type === 'author' ? 'author' : item.type === 'book' ? 'book' : 'section';
    const rowTitle = canReorder
      ? `Drag to reorder ${rowTypeLabel}. Double-click to rename.`
      : item.label;

    return (
      <div
        key={item.id}
        data-tree-row-index={rowMeta?.index}
        data-tree-row-id={rowMeta ? item.id : undefined}
      >
        <LibraryTreeRow
          item={item}
          depth={depth}
          isActive={isActive}
          isExpanded={isExpanded}
          title={rowTitle}
          showBefore={showBefore}
          showAfter={showAfter}
          activeClassName="bg-[var(--sidebar-active)] text-[var(--text-main)] font-medium shadow-sm"
          inactiveClassName="hover:bg-[var(--sidebar-hover)] text-[var(--text-muted)]"
          onToggle={(event) => toggleNode(item.id, event)}
          onClick={() => {
            if (editingNodeId === item.id) return;
            onTreeItemClick(item);
            if (item.children?.length) {
              setExpandedNodes((prev) => ensureExpandedLibraryNode(prev, item.id));
            }
          }}
          onDoubleClick={(event) => {
            if (item.type === 'author' || item.type === 'book') {
              startNodeEdit(item, event);
            }
          }}
          draggable={Boolean(item.data) && editingNodeId !== item.id}
          onDragStart={(event) => handleTreeDragStart(event, item.data, treeMeta)}
          onDragOver={(event) => {
            if (!rowMeta) return;
            handleTreeRowDragOver(event, { itemId: item.id, ...rowMeta });
          }}
          onDrop={(event) => {
            if (!rowMeta) return;
            handleTreeRowDrop(event, { itemId: item.id, ...rowMeta });
          }}
          onDragLeave={() => {
            if (treeDropIndicator?.itemId === item.id) {
              setTreeDropIndicator(null);
            }
          }}
          onDragEnd={resetTreeDragState}
        >
          {item.type === 'root' && (
            <User className="mr-2 h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
          )}
          {item.type === 'author' && (
            <User className="mr-2 h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
          )}
          {item.type === 'book' && (
            <Book className="mr-2 h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
          )}

          {editingNodeId === item.id ? (
            <EditorialInlineRenameField
              value={editingValue}
              onChange={setEditingValue}
              onSubmit={() => saveNodeEdit(item)}
              onCancel={cancelNodeEdit}
              onBlur={() => saveNodeEdit(item)}
              placeholder={item.type === 'author' ? 'Author name' : 'Book name'}
            />
          ) : (
            <>
              <span className="truncate flex-1 min-w-0">{item.label}</span>
              {(item.type === 'author' || item.type === 'book') && (
                <EditorialIconActionButton
                  onClick={(event) => startNodeEdit(item, event)}
                  className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  ariaLabel={`Rename ${item.type}`}
                >
                  <Edit2 size={13} />
                </EditorialIconActionButton>
              )}
            </>
          )}
        </LibraryTreeRow>

        {item.children?.length && isExpanded && (
          <div>{renderTree(item.children, depth + 1, item.data?.authorId)}</div>
        )}
      </div>
    );
  };

  const renderTree = (
    items: SidebarItem[],
    depth = 0,
    parentAuthor?: string
  ): React.ReactNode => {
    if (depth === 0) {
      const roots = items.filter((item) => item.type === 'root');
      const authors = items.filter((item) => item.type === 'author');

      return (
        <>
          {roots.map((item) => renderTreeRow(item, depth))}
          <div
            onDragOver={(event) =>
              handleTreeListDragOver(event, { items: authors, listType: 'author' })
            }
            onDrop={(event) =>
              handleTreeListDrop(event, { items: authors, listType: 'author' })
            }
          >
            {authors.map((item, index) =>
              renderTreeRow(item, depth, { index, listType: 'author' })
            )}
          </div>
        </>
      );
    }

    const areBooks = items.every((item) => item.type === 'book');
    if (areBooks && parentAuthor) {
      return (
        <div
          onDragOver={(event) =>
            handleTreeListDragOver(event, {
              items,
              listType: 'book',
              parentAuthor,
            })
          }
          onDrop={(event) =>
            handleTreeListDrop(event, { items, listType: 'book', parentAuthor })
          }
        >
          {items.map((item, index) =>
            renderTreeRow(item, depth, { index, listType: 'book', parentAuthor })
          )}
        </div>
      );
    }

    return items.map((item) => renderTreeRow(item, depth));
  };

  const authorTreeItems = treeData.filter((item) => item.type === 'author');

  return (
    <div
      className="flex-1 overflow-y-auto p-2.5"
      onDragOver={(event) => handleTreePanelDragOver(event, authorTreeItems)}
      onDrop={(event) => handleTreePanelDrop(event, authorTreeItems)}
    >
      {headerContent}
      <div className="type-section-bounded mb-2 px-2 font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        Authors & Books
      </div>
      {renderTree(treeData)}
    </div>
  );
};
