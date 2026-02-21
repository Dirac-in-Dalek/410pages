import React, { useState } from 'react';
import {
  Book,
  ChevronDown,
  ChevronRight,
  Edit2,
  FolderOpen,
  Search,
  User,
  X
} from 'lucide-react';
import { SidebarItem } from '../../types';

type SelectedFilter = { type: 'author' | 'book'; value: string; author?: string } | null;

type TreeDragMeta = {
  type: 'library-tree';
  itemType: 'author' | 'book';
  id: string;
  authorId?: string;
};

type TreeDropIndicator = {
  itemId: string;
  position: 'before' | 'after';
  dropIndex: number;
  listType: 'author' | 'book';
  parentAuthor?: string;
};

type TreeListMeta = {
  items: SidebarItem[];
  listType: 'author' | 'book';
  parentAuthor?: string;
};

interface LibrarySidebarProps {
  treeData: SidebarItem[];
  onTreeItemClick: (item: SidebarItem) => void;
  onProjectSelect: (projectId: string | null) => void;
  selectedProjectId: string | null;
  onSearch?: (term: string) => void;
  searchTerm?: string;
  selectedFilter?: SelectedFilter;
  onReorderAuthorAt?: (dragAuthor: string, dropIndex: number) => void;
  onReorderBookAt?: (author: string, dragBook: string, dropIndex: number) => void;
  onRenameAuthor?: (authorId: string, name: string) => void;
  onRenameBook?: (bookId: string, name: string) => void;
  width: number;
  isResizing: boolean;
  onStartResize: () => void;
}

export const LibrarySidebar: React.FC<LibrarySidebarProps> = ({
  treeData,
  onTreeItemClick,
  onProjectSelect,
  selectedProjectId,
  onSearch,
  searchTerm = '',
  selectedFilter = null,
  onReorderAuthorAt,
  onReorderBookAt,
  onRenameAuthor,
  onRenameBook,
  width,
  isResizing,
  onStartResize
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root-user']));
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [treeDropIndicator, setTreeDropIndicator] = useState<TreeDropIndicator | null>(null);
  const [isTreeDragging, setIsTreeDragging] = useState(false);
  const [activeTreeDragMeta, setActiveTreeDragMeta] = useState<TreeDragMeta | null>(null);
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

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedNodes);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedNodes(next);
  };

  const handleDragStartRef = (e: React.DragEvent, data: any, treeMeta?: TreeDragMeta) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'reference',
      ...data
    }));

    if (treeMeta) {
      const row = e.currentTarget as HTMLElement;
      const rect = row.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      e.dataTransfer.setData('application/x-library-tree-reorder', JSON.stringify(treeMeta));
      setIsTreeDragging(true);
      setTreeDropIndicator(null);
      setActiveTreeDragMeta(treeMeta);
      setDragCenterOffsetY(centerY - e.clientY);
    }

    e.dataTransfer.effectAllowed = treeMeta ? 'copyMove' : 'copy';
  };

  const hasTreeDragType = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types || []);
    return types.some(type => type.toLowerCase() === 'application/x-library-tree-reorder');
  };

  const parseTreeDragMeta = (e: React.DragEvent): TreeDragMeta | null => {
    const raw = e.dataTransfer.getData('application/x-library-tree-reorder');
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.type !== 'library-tree') return null;
      if (parsed?.itemType !== 'author' && parsed?.itemType !== 'book') return null;
      if (!parsed?.id) return null;
      return parsed as TreeDragMeta;
    } catch {
      return null;
    }
  };

  const resolveTreeDragMeta = (e: React.DragEvent): TreeDragMeta | null => {
    const parsed = parseTreeDragMeta(e);
    if (parsed) return parsed;
    return activeTreeDragMeta;
  };

  const canDropInTreeList = (
    dragMeta: TreeDragMeta,
    listType: 'author' | 'book',
    parentAuthorId?: string
  ) => {
    if (listType === 'author') return dragMeta.itemType === 'author';
    if (listType === 'book') return dragMeta.itemType === 'book' && dragMeta.authorId === parentAuthorId;
    return false;
  };

  const calcDropPosition = (e: React.DragEvent, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const projectedCenterY = e.clientY + dragCenterOffsetY;
    const midY = rect.top + rect.height / 2;
    return projectedCenterY < midY ? 'before' : 'after';
  };

  const buildListIndicator = (e: React.DragEvent, list: TreeListMeta): TreeDropIndicator | null => {
    if (list.items.length === 0) return null;

    const container = e.currentTarget as HTMLElement;
    const rowElements = Array.from(container.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node.dataset.treeRowIndex !== undefined
    );
    if (rowElements.length === 0) return null;

    const projectedCenterY = e.clientY + dragCenterOffsetY;
    for (let i = 0; i < rowElements.length; i += 1) {
      const rect = rowElements[i].getBoundingClientRect();
      const rowMidY = rect.top + rect.height / 2;
      if (projectedCenterY < rowMidY) {
        return {
          itemId: list.items[i].id,
          position: 'before',
          dropIndex: i,
          listType: list.listType,
          parentAuthor: list.parentAuthor
        };
      }
    }

    return {
      itemId: list.items[list.items.length - 1].id,
      position: 'after',
      dropIndex: list.items.length,
      listType: list.listType,
      parentAuthor: list.parentAuthor
    };
  };

  const handleTreeRowDragOver = (
    e: React.DragEvent,
    row: { itemId: string; index: number; listType: 'author' | 'book'; parentAuthor?: string }
  ) => {
    if (!hasTreeDragType(e) && !activeTreeDragMeta) return;

    const dragMeta = resolveTreeDragMeta(e);
    if (!dragMeta || !canDropInTreeList(dragMeta, row.listType, row.parentAuthor)) return;

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const position = calcDropPosition(e, e.currentTarget as HTMLElement);
    const dropIndex = position === 'before' ? row.index : row.index + 1;

    setTreeDropIndicator({
      itemId: row.itemId,
      position,
      dropIndex,
      listType: row.listType,
      parentAuthor: row.parentAuthor
    });
  };

  const handleTreeRowDrop = (
    e: React.DragEvent,
    row: { itemId: string; index: number; listType: 'author' | 'book'; parentAuthor?: string }
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const dragMeta = resolveTreeDragMeta(e);
    if (!dragMeta || !canDropInTreeList(dragMeta, row.listType, row.parentAuthor)) {
      setTreeDropIndicator(null);
      return;
    }

    const position = calcDropPosition(e, e.currentTarget as HTMLElement);
    const dropIndex = position === 'before' ? row.index : row.index + 1;

    if (row.listType === 'author') {
      onReorderAuthorAt?.(dragMeta.id, dropIndex);
    } else if (row.listType === 'book' && row.parentAuthor) {
      onReorderBookAt?.(row.parentAuthor, dragMeta.id, dropIndex);
    }

    setTreeDropIndicator(null);
  };

  const getBoundaryIndicator = (
    items: SidebarItem[],
    listType: 'author' | 'book',
    boundary: 'start' | 'end',
    parentAuthor?: string
  ): TreeDropIndicator | null => {
    if (items.length === 0) return null;

    if (boundary === 'start') {
      return {
        itemId: items[0].id,
        position: 'before',
        dropIndex: 0,
        listType,
        parentAuthor
      };
    }

    return {
      itemId: items[items.length - 1].id,
      position: 'after',
      dropIndex: items.length,
      listType,
      parentAuthor
    };
  };

  const applyTreeReorder = (dragMeta: TreeDragMeta, indicator: TreeDropIndicator) => {
    if (indicator.listType === 'author') {
      onReorderAuthorAt?.(dragMeta.id, indicator.dropIndex);
      return;
    }

    if (indicator.listType === 'book' && indicator.parentAuthor) {
      onReorderBookAt?.(indicator.parentAuthor, dragMeta.id, indicator.dropIndex);
    }
  };

  const getBookItemsForAuthor = (authorId: string): SidebarItem[] => {
    const ownerNode = treeData.find(
      item =>
        (item.type === 'author' || item.type === 'root') &&
        item.data?.authorId === authorId
    );
    return (ownerNode?.children || []).filter(child => child.type === 'book');
  };

  const getPanelBoundaryIndicator = (
    dragMeta: TreeDragMeta,
    authorItems: SidebarItem[],
    boundary: 'start' | 'end'
  ): TreeDropIndicator | null => {
    if (dragMeta.itemType === 'author') {
      return getBoundaryIndicator(authorItems, 'author', boundary);
    }

    if (dragMeta.itemType === 'book' && dragMeta.authorId) {
      const books = getBookItemsForAuthor(dragMeta.authorId);
      if (books.length === 0) return null;
      return getBoundaryIndicator(books, 'book', boundary, dragMeta.authorId);
    }

    return null;
  };

  const handleTreePanelDragOver = (e: React.DragEvent, authorItems: SidebarItem[]) => {
    if (!hasTreeDragType(e) && !activeTreeDragMeta) return;

    const dragMeta = resolveTreeDragMeta(e);
    if (!dragMeta) return;
    const target = e.target as HTMLElement;
    if (target?.closest?.('[data-tree-row-index]')) return;

    const panelRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const projectedCenterY = e.clientY + dragCenterOffsetY;
    const boundary: 'start' | 'end' =
      projectedCenterY <= panelRect.top + panelRect.height / 2 ? 'start' : 'end';

    const nextIndicator = getPanelBoundaryIndicator(dragMeta, authorItems, boundary);

    if (nextIndicator) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setTreeDropIndicator(nextIndicator);
    }
  };

  const handleTreePanelDrop = (e: React.DragEvent, authorItems: SidebarItem[]) => {
    if (!hasTreeDragType(e) && !activeTreeDragMeta) return;

    const dragMeta = resolveTreeDragMeta(e);
    if (!dragMeta) return;
    const target = e.target as HTMLElement;
    if (target?.closest?.('[data-tree-row-index]')) return;

    const panelRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const projectedCenterY = e.clientY + dragCenterOffsetY;
    const boundary: 'start' | 'end' =
      projectedCenterY <= panelRect.top + panelRect.height / 2 ? 'start' : 'end';
    const indicator = getPanelBoundaryIndicator(dragMeta, authorItems, boundary);

    if (indicator) {
      e.preventDefault();
      applyTreeReorder(dragMeta, indicator);
    }
    setTreeDropIndicator(null);
  };

  const handleTreeListDragOver = (e: React.DragEvent, list: TreeListMeta) => {
    if (!hasTreeDragType(e) && !activeTreeDragMeta) return;

    const dragMeta = resolveTreeDragMeta(e);
    if (!dragMeta || !canDropInTreeList(dragMeta, list.listType, list.parentAuthor)) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const indicator = buildListIndicator(e, list);
    if (indicator) {
      setTreeDropIndicator(indicator);
    }
  };

  const handleTreeListDrop = (e: React.DragEvent, list: TreeListMeta) => {
    if (!hasTreeDragType(e) && !activeTreeDragMeta) return;

    const dragMeta = resolveTreeDragMeta(e);
    if (!dragMeta || !canDropInTreeList(dragMeta, list.listType, list.parentAuthor)) return;

    e.preventDefault();

    const indicator = treeDropIndicator ?? buildListIndicator(e, list);
    if (!indicator) {
      setTreeDropIndicator(null);
      return;
    }

    if (indicator.listType === 'author') {
      onReorderAuthorAt?.(dragMeta.id, indicator.dropIndex);
    } else if (indicator.listType === 'book' && indicator.parentAuthor) {
      onReorderBookAt?.(indicator.parentAuthor, dragMeta.id, indicator.dropIndex);
    }

    setTreeDropIndicator(null);
  };

  const renderTreeRow = (
    item: SidebarItem,
    depth: number,
    rowMeta?: { index: number; listType: 'author' | 'book'; parentAuthor?: string }
  ) => {
    const isExpanded = expandedNodes.has(item.id);
    const paddingLeft = depth * 12 + 12;
    const treeMeta: TreeDragMeta | undefined = item.type === 'author'
      ? (item.data?.authorId ? { type: 'library-tree', itemType: 'author', id: item.data.authorId } : undefined)
      : item.type === 'book'
        ? (item.data?.bookId && item.data?.authorId
          ? { type: 'library-tree', itemType: 'book', id: item.data.bookId, authorId: item.data.authorId }
          : undefined)
        : undefined;

    const showBefore =
      isTreeDragging &&
      treeDropIndicator?.itemId === item.id &&
      treeDropIndicator?.position === 'before';

    const showAfter =
      isTreeDragging &&
      treeDropIndicator?.itemId === item.id &&
      treeDropIndicator?.position === 'after';
    const canReorder = Boolean(treeMeta);
    const rowTypeLabel = item.type === 'author'
      ? 'author'
      : item.type === 'book'
        ? 'book'
        : 'section';
    const rowTitle = canReorder
      ? `Drag to reorder ${rowTypeLabel}. Double-click to rename.`
      : item.label;

    return (
      <div
        key={item.id}
        data-tree-row-index={rowMeta?.index}
        data-tree-row-id={rowMeta ? item.id : undefined}
      >
        {showBefore && (
          <div
            className="h-[2px] mb-0.5 rounded-full bg-[var(--accent)]"
            style={{ marginLeft: `${paddingLeft + 22}px` }}
          />
        )}

        <div
          className={`
            flex items-center py-1.5 px-2 text-sm cursor-pointer select-none
            ${(selectedFilter?.type === item.type && selectedFilter?.value === (item.type === 'book' ? item.data?.book : item.data?.author) && (item.type !== 'book' || selectedFilter?.author === item.data?.author))
              ? 'bg-[var(--sidebar-active)] text-[var(--text-main)] font-medium shadow-sm'
              : 'hover:bg-[var(--sidebar-hover)] text-[var(--text-muted)]'}
            rounded-md my-0.5
            transition-colors duration-150 group
          `}
          style={{ paddingLeft: `${paddingLeft}px` }}
          title={rowTitle}
          aria-label={rowTitle}
          onClick={() => {
            if (editingNodeId === item.id) return;
            onTreeItemClick(item);
            if (item.children && !expandedNodes.has(item.id)) {
              setExpandedNodes(prev => new Set([...prev, item.id]));
            }
          }}
          onDoubleClick={(event) => {
            if (item.type === 'author' || item.type === 'book') {
              startNodeEdit(item, event);
            }
          }}
          draggable={Boolean(item.data) && editingNodeId !== item.id}
          onDragStart={(e) => handleDragStartRef(e, item.data, treeMeta)}
          onDragOver={(e) => {
            if (!rowMeta) return;
            handleTreeRowDragOver(e, { itemId: item.id, ...rowMeta });
          }}
          onDrop={(e) => {
            if (!rowMeta) return;
            handleTreeRowDrop(e, { itemId: item.id, ...rowMeta });
          }}
          onDragLeave={() => {
            if (treeDropIndicator?.itemId === item.id) setTreeDropIndicator(null);
          }}
          onDragEnd={() => {
            setTreeDropIndicator(null);
            setIsTreeDragging(false);
            setActiveTreeDragMeta(null);
            setDragCenterOffsetY(0);
          }}
        >
          <span
            className="mr-1 text-[var(--text-muted)] hover:text-[var(--text-main)] p-0.5 rounded cursor-pointer"
            onClick={(e) => item.children ? toggleNode(item.id, e) : undefined}
          >
            {item.children ? (
              isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : (
              <span className="w-[14px] inline-block" />
            )}
          </span>

          {item.type === 'root' && <User className="mr-2 h-4 w-4 flex-shrink-0 text-[var(--accent)]" />}
          {item.type === 'author' && <User className="mr-2 h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />}
          {item.type === 'book' && <Book className="mr-2 h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />}

          {editingNodeId === item.id ? (
            <div className="flex-1 min-w-0 flex items-center">
              <input
                autoFocus
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => cancelNodeEdit()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveNodeEdit(item);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelNodeEdit();
                  }
                }}
                className="flex-1 min-w-0 text-sm bg-transparent border border-[var(--border-main)] rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent-ring)]"
              />
            </div>
          ) : (
            <>
              <span className="truncate flex-1 min-w-0">{item.label}</span>
              {(item.type === 'author' || item.type === 'book') && (
                <button
                  onClick={(event) => startNodeEdit(item, event)}
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--sidebar-hover)] text-[var(--text-muted)]"
                  aria-label={`Rename ${item.type}`}
                  title={item.type === 'author' ? 'Rename author' : 'Rename book'}
                >
                  <Edit2 size={13} />
                </button>
              )}
            </>
          )}
        </div>

        {item.children && isExpanded && (
          <div>
            {renderTree(item.children, depth + 1, item.data?.authorId)}
          </div>
        )}

        {showAfter && (
          <div
            className="h-[2px] mt-0.5 rounded-full bg-[var(--accent)]"
            style={{ marginLeft: `${paddingLeft + 22}px` }}
          />
        )}
      </div>
    );
  };

  const renderTree = (items: SidebarItem[], depth = 0, parentAuthor?: string): React.ReactNode => {
    if (depth === 0) {
      const roots = items.filter(item => item.type === 'root');
      const authors = items.filter(item => item.type === 'author');
      return (
        <>
          {roots.map(item => renderTreeRow(item, depth))}
          <div
            onDragOver={(e) => handleTreeListDragOver(e, { items: authors, listType: 'author' })}
            onDrop={(e) => handleTreeListDrop(e, { items: authors, listType: 'author' })}
          >
            {authors.map((item, index) => renderTreeRow(item, depth, { index, listType: 'author' }))}
          </div>
        </>
      );
    }

    const areBooks = items.every(item => item.type === 'book');
    if (areBooks && parentAuthor) {
      return (
        <div
          onDragOver={(e) => handleTreeListDragOver(e, { items, listType: 'book', parentAuthor })}
          onDrop={(e) => handleTreeListDrop(e, { items, listType: 'book', parentAuthor })}
        >
          {items.map((item, index) => renderTreeRow(item, depth, { index, listType: 'book', parentAuthor }))}
        </div>
      );
    }

    return items.map(item => renderTreeRow(item, depth));
  };

  const authorTreeItems = treeData.filter(item => item.type === 'author');

  return (
    <aside
      style={{ width: `${width}px` }}
      className="border-l border-[var(--border-main)] bg-[var(--bg-card)] flex flex-col h-full sticky top-0 overflow-hidden transition-colors duration-200 relative"
    >
      <div
        onMouseDown={onStartResize}
        className="absolute top-0 -left-1 w-2 h-full cursor-col-resize z-30 group"
      >
        <div className={`w-[2px] h-full mx-auto transition-colors ${isResizing ? 'bg-[var(--accent)]' : 'group-hover:bg-[var(--accent-border)]'}`} />
      </div>

      <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--text-main)]">Library</span>
        </div>
        {!isSearchExpanded ? (
          <button
            onClick={() => setIsSearchExpanded(true)}
            className="p-1.5 hover:bg-[var(--sidebar-hover)] rounded-md text-[var(--text-muted)] transition-colors"
            title="Search Library"
          >
            <Search size={16} />
          </button>
        ) : (
          <div className="flex items-center w-full bg-[var(--sidebar-hover)] rounded-md px-2 py-1.5 animate-in slide-in-from-right-4 duration-300">
            <Search size={14} className="text-[var(--text-muted)] mr-2 flex-shrink-0" />
            <input
              autoFocus
              className="bg-transparent border-none p-0 text-sm focus:ring-0 w-full placeholder:text-[var(--text-muted)]"
              placeholder="Search everything..."
              value={searchTerm}
              onChange={(e) => onSearch?.(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && (setIsSearchExpanded(false), onSearch?.(''))}
            />
            <button
              onClick={() => {
                setIsSearchExpanded(false);
                onSearch?.('');
              }}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto p-3"
        onDragOver={(e) => handleTreePanelDragOver(e, authorTreeItems)}
        onDrop={(e) => handleTreePanelDrop(e, authorTreeItems)}
      >
        <div
          className={`
            flex items-center p-2 rounded-md cursor-pointer mb-4 text-sm font-medium
            ${selectedProjectId === null ? 'bg-[var(--accent-active)] text-[var(--accent-active-text)] shadow-md border-transparent' : 'text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]'}
          `}
          title="Show all citations"
          aria-label="Show all citations"
          onClick={() => onProjectSelect(null)}
        >
          <FolderOpen size={16} className="mr-2" />
          All Citations
        </div>

        <div className="mb-2 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Authors & Books
        </div>
        {renderTree(treeData)}
      </div>

    </aside>
  );
};
