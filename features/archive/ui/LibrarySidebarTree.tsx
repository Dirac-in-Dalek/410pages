import { useLibraryTreeDrag } from '../logic/useLibraryTreeDrag';
import React, { useEffect, useRef, useState } from 'react';
import { Book, Edit2, Folder, MoreHorizontal, Trash2, User } from 'lucide-react';
import type { SidebarItem } from '../../../types';
import {
  createDefaultExpandedLibraryNodes,
  ensureExpandedLibraryNode,
  isLibraryTreeItemActive,
  toggleExpandedLibraryNode,
} from '../../../shared/lib/libraryTree';
import { LibraryTreeRow } from '../../../shared/ui/sidebar/LibraryTreeRow';
import type {
  LibrarySidebarTreeContract,
  LibraryTreeDragMeta,
  LibraryTreeRowMeta,
} from '../contract/librarySidebarContract';

import {
  EditorialIconActionButton,
  EditorialInlineRenameField,
  handleMenuKeyboardNavigation,
} from '../../../shared/ui/sidebar/SidebarControls';
import { AuthorDeleteDialog } from './AuthorDeleteDialog';

type LibrarySidebarTreeProps = LibrarySidebarTreeContract & {
  embedded?: boolean;
  mobile?: boolean;
  onItemSelected?: () => void;
};

export const LibrarySidebarTree: React.FC<LibrarySidebarTreeProps> = ({
  treeData,
  onTreeItemClick,
  selectedFilter = null,
  onReorderBookAt,
  onReorderAuthorAt,
  orderSaving = false,
  onRenameAuthor,
  onRenameBook,
  books = [],
  citations = [],
  onRenameAuthorFolder,
  onDeleteAuthorFolder,
  onMoveAuthorToFolder,
  onRemoveAuthorFromFolder,
  onDeleteAuthor,
  onPreviewAuthorDelete,
  embedded = false,
  mobile = false,
  onItemSelected,
}) => {
  const [expandedNodes, setExpandedNodes] = useState(createDefaultExpandedLibraryNodes);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [actionMenuItemId, setActionMenuItemId] = useState<string | null>(null);
  const [deletingAuthorItem, setDeletingAuthorItem] = useState<SidebarItem | null>(null);
  const [deletingAuthorPreview, setDeletingAuthorPreview] = useState<{ bookCount: number; citationCount: number } | null>(null);
  const { treeDropIndicator, setTreeDropIndicator, suppressClickTimerRef, isTreeDragging, activeTreeDragMeta, touchDropTarget, suppressClickAuthorIdRef, isAuthorDragging, handleTreeDragStart, handleKeyboardReorder, handleTreeRowDragOver, handleTreeRowDrop, handleTreeListDragOver, handleTreeListDrop, handleTreePanelDragOver, handleTreePanelDrop, resetTreeDragState, beginMobileAuthorTouchDrag, handleAuthorGroupDragOver, handleAuthorGroupDrop, handleAuthorListDragOver, handleAuthorListDrop } = useLibraryTreeDrag({ treeData, mobile, onReorderAuthorAt, onReorderBookAt, onMoveAuthorToFolder, onRemoveAuthorFromFolder });
  const savingNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!actionMenuItemId) return;
    const firstMenuItem = document
      .getElementById(`author-actions-menu-${actionMenuItemId}`)
      ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
    firstMenuItem?.focus();
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest(`[data-author-actions-menu="${actionMenuItemId}"]`)) {
        setActionMenuItemId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const menuButton = document.querySelector<HTMLButtonElement>(
          `button[data-author-actions-menu="${actionMenuItemId}"]`
        );
        setActionMenuItemId(null);
        menuButton?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [actionMenuItemId]);

  const beginNodeEdit = (item: SidebarItem) => {
    if (item.type !== 'author' && item.type !== 'book' && item.type !== 'author_folder') return;
    setEditingNodeId(item.id);
    setEditingValue(item.label);
    setActionMenuItemId(null);
  };

  const startNodeEdit = (item: SidebarItem, event: React.MouseEvent) => {
    event.stopPropagation();
    beginNodeEdit(item);
  };

  const cancelNodeEdit = () => {
    setEditingNodeId(null);
    setEditingValue('');
  };

  const saveNodeEdit = async (item: SidebarItem) => {
    if (savingNodeIdRef.current === item.id) return;
    const trimmed = editingValue.trim();
    if (!trimmed || trimmed === item.label) {
      cancelNodeEdit();
      return;
    }

    savingNodeIdRef.current = item.id;
    try {
      if (item.type === 'author' && item.data?.authorId) {
        const didRename = await Promise.resolve(onRenameAuthor?.(item.data.authorId, trimmed));
        if (didRename === false) return;
      }
      if (item.type === 'book' && item.data?.bookId) {
        const didRename = await Promise.resolve(onRenameBook?.(item.data.bookId, trimmed));
        if (didRename === false) return;
      }
      if (item.type === 'author_folder' && item.data?.folderId) {
        const didRename = await Promise.resolve(onRenameAuthorFolder?.(item.data.folderId, trimmed));
        if (didRename === false) return;
      }

      cancelNodeEdit();
    } finally {
      if (savingNodeIdRef.current === item.id) savingNodeIdRef.current = null;
    }
  };

  const toggleNode = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExpandedNodes((prev) => toggleExpandedLibraryNode(prev, id));
  };

  const requestDeleteFolder = (item: SidebarItem) => {
    if (!item.data?.folderId) return;
    if (!window.confirm(`‘${item.label}’ 폴더를 삭제할까요? 저자는 폴더 밖에 그대로 남습니다.`)) return;
    void Promise.resolve(onDeleteAuthorFolder?.(item.data.folderId));
    setActionMenuItemId(null);
  };

  const requestDeleteAuthor = async (item: SidebarItem) => {
    const authorId = item.data?.authorId;
    if (!authorId) return;
    const localBookIds = books.filter((book) => book.authorId === authorId).map((book) => book.id);
    const localBookIdSet = new Set(localBookIds);
    const preview = onPreviewAuthorDelete
      ? await onPreviewAuthorDelete(authorId)
      : {
          bookCount: localBookIds.length,
          citationCount: citations.filter((citation) =>
            citation.authorId === authorId || (citation.bookId ? localBookIdSet.has(citation.bookId) : false)
          ).length,
        };
    if (!preview) return;
    setDeletingAuthorPreview({ bookCount: preview.bookCount, citationCount: preview.citationCount });
    setDeletingAuthorItem(item);
    setActionMenuItemId(null);
  };

  const renderTreeRow = (
    item: SidebarItem,
    depth: number,
    rowMeta?: LibraryTreeRowMeta
  ) => {
    const isExpanded = expandedNodes.has(item.id);
    const isActive = isLibraryTreeItemActive(item, selectedFilter);
    const treeMeta: LibraryTreeDragMeta | undefined =
      item.type === 'book' && item.data?.bookId && item.data?.authorId
        ? {
            type: 'library-tree',
            itemType: 'book',
            id: item.data.bookId,
            authorId: item.data.authorId,
          }
        : item.type === 'author' && item.data?.authorId
          ? {
              type: 'library-tree',
              itemType: 'author',
              id: item.data.authorId,
              authorGroupId: rowMeta?.authorGroupId,
            }
        : undefined;

    const showBefore =
      isTreeDragging &&
      treeDropIndicator?.itemId === item.id &&
      treeDropIndicator.position === 'before';
    const showAfter =
      isTreeDragging &&
      treeDropIndicator?.itemId === item.id &&
      treeDropIndicator.position === 'after';
    const canReorder = !mobile && !orderSaving && (
      (treeMeta?.itemType === 'book' && Boolean(onReorderBookAt)) ||
      (treeMeta?.itemType === 'author' && Boolean(onReorderAuthorAt))
    );
    const rowTypeLabel =
      item.type === 'author' ? 'author' : item.type === 'book' ? 'book' : 'section';
    const rowTitle = canReorder
      ? `${item.label} — 드래그 또는 Alt+위아래 화살표로 ${rowTypeLabel === 'author' ? '저자' : '책'} 순서 변경. 더블클릭하여 이름 변경.`
      : item.label;
    const isBookRow = item.type === 'book';
    const isRootRow = item.type === 'root';
    const isFolderRow = item.type === 'author_folder';
    const isTouchDropFolder = isFolderRow && touchDropTarget === item.data?.folderId;

    return (
      <div
        key={item.id}
        className="relative"
        data-author-folder-drop={isFolderRow ? item.data?.folderId : undefined}
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
          activeClassName={
            isBookRow
              ? 'bg-[var(--sidebar-hover)] text-[var(--text-main)]'
              : 'bg-[var(--sidebar-active)] text-[var(--text-main)] shadow-[0_1px_2px_rgba(31,29,27,0.05)]'
          }
          inactiveClassName={
            isBookRow
              ? 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]'
          }
          indicatorOffset={18}
          baseClassName={[
            isRootRow ? 'mb-1.5 rounded-[0.85rem] bg-[var(--bg-main)] font-medium' : '',
            item.type === 'author'
              ? 'min-h-[2.35rem] font-medium tracking-[-0.01em]'
              : '',
            isFolderRow ? 'min-h-[2.5rem] font-semibold' : '',
            isTouchDropFolder ? 'bg-[var(--sidebar-hover)] shadow-[inset_0_0_0_1px_var(--accent-border)]' : '',
            item.type === 'author' && isAuthorDragging && activeTreeDragMeta?.id === item.data?.authorId ? 'opacity-60' : '',
            isBookRow
              ? 'min-h-[1.95rem] rounded-[0.8rem] py-1 text-[13.5px] font-normal text-[var(--text-muted)]'
              : '',
            editingNodeId === item.id ? (isFolderRow ? 'items-center py-1.5' : 'items-start py-2') : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onToggle={(event) => toggleNode(item.id, event)}
          onClick={() => {
            if (editingNodeId === item.id) return;
            if (item.type === 'author' && suppressClickAuthorIdRef.current === item.data?.authorId) {
              suppressClickAuthorIdRef.current = null;
              if (suppressClickTimerRef.current !== null) window.clearTimeout(suppressClickTimerRef.current);
              suppressClickTimerRef.current = null;
              return;
            }
            onTreeItemClick(item);
            if (item.children?.length) {
              setExpandedNodes((prev) => ensureExpandedLibraryNode(prev, item.id));
            }
            if (item.type === 'author' || item.type === 'book') onItemSelected?.();
          }}
          onDoubleClick={(event) => {
            if (item.type === 'author' || item.type === 'book' || item.type === 'author_folder') {
              startNodeEdit(item, event);
            }
          }}
          draggable={!mobile && !orderSaving && Boolean(treeMeta) && editingNodeId !== item.id}
          onDragStart={(event) => handleTreeDragStart(event, item.data, treeMeta)}
          onDragOver={(event) => {
            if (isFolderRow) {
              handleAuthorGroupDragOver(event);
              return;
            }
            if (!rowMeta) return;
            handleTreeRowDragOver(event, { itemId: item.id, ...rowMeta });
          }}
          onDrop={(event) => {
            if (isFolderRow) {
              handleAuthorGroupDrop(event, item.data?.folderId);
              return;
            }
            if (!rowMeta) return;
            handleTreeRowDrop(event, { itemId: item.id, ...rowMeta });
          }}
          onDragLeave={() => {
            if (treeDropIndicator?.itemId === item.id) {
              setTreeDropIndicator(null);
            }
          }}
          onDragEnd={resetTreeDragState}
          onTouchStart={(event) => beginMobileAuthorTouchDrag(event, item)}
          onReorderByKeyboard={canReorder && rowMeta
            ? (direction) => handleKeyboardReorder(item, rowMeta, direction)
            : undefined}
        >
          {item.type === 'root' && (
            <User className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--text-secondary)]" />
          )}
          {item.type === 'author' && (
            <User className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--text-muted)]" />
          )}
          {item.type === 'book' && (
            <Book className="mr-1.5 h-[0.8125rem] w-[0.8125rem] flex-shrink-0 text-[var(--text-muted)]" />
          )}
          {isFolderRow && (
            <Folder className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--accent)]" />
          )}
          {editingNodeId === item.id ? (
            <EditorialInlineRenameField
              value={editingValue}
              onChange={setEditingValue}
              onSubmit={() => saveNodeEdit(item)}
              onCancel={cancelNodeEdit}
              onBlur={() => saveNodeEdit(item)}
              placeholder={item.type === 'author' ? '저자 이름' : item.type === 'author_folder' ? '폴더 이름' : '책 이름'}
              actionsPlacement={isFolderRow ? 'inline' : 'below'}
            />
          ) : (
            <>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.type === 'book' ? (
                <EditorialIconActionButton onClick={(event) => startNodeEdit(item, event)} className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" ariaLabel="책 이름 변경">
                  <Edit2 size={12} />
                </EditorialIconActionButton>
              ) : null}
              {item.type === 'author' && item.data?.authorId ? (
                mobile ? (
                  <EditorialIconActionButton menuId={item.id} menuOpen={actionMenuItemId === item.id} onClick={(event) => { event.stopPropagation(); setActionMenuItemId((current) => current === item.id ? null : item.id); }} className="h-11 w-11" ariaLabel={`${item.label} 관리`}>
                    <MoreHorizontal size={17} />
                  </EditorialIconActionButton>
                ) : (
                  <span className="flex opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <EditorialIconActionButton menuId={item.id} menuOpen={actionMenuItemId === item.id} onClick={(event) => { event.stopPropagation(); setActionMenuItemId((current) => current === item.id ? null : item.id); }} ariaLabel={`${item.label} 관리`}><MoreHorizontal size={14} /></EditorialIconActionButton>
                  </span>
                )
              ) : null}
              {isFolderRow ? (
                mobile ? (
                  <EditorialIconActionButton menuId={item.id} menuOpen={actionMenuItemId === item.id} onClick={(event) => { event.stopPropagation(); setActionMenuItemId((current) => current === item.id ? null : item.id); }} className="h-11 w-11" ariaLabel={`${item.label} 폴더 관리`}><MoreHorizontal size={17} /></EditorialIconActionButton>
                ) : (
                  <span className="flex opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <EditorialIconActionButton onClick={(event) => startNodeEdit(item, event)} ariaLabel="저자 폴더 이름 변경"><Edit2 size={12} /></EditorialIconActionButton>
                    <EditorialIconActionButton onClick={(event) => { event.stopPropagation(); requestDeleteFolder(item); }} ariaLabel="저자 폴더 삭제"><Trash2 size={12} /></EditorialIconActionButton>
                  </span>
                )
              ) : null}
            </>
          )}
        </LibraryTreeRow>

        {actionMenuItemId === item.id && (item.type === 'author' || item.type === 'author_folder') ? (
          <div id={`author-actions-menu-${item.id}`} data-author-actions-menu={item.id} role="menu" onKeyDown={handleMenuKeyboardNavigation} className="absolute right-2 z-50 mt-1 w-52 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-1.5 shadow-[var(--shadow-popover)]">
            {item.type === 'author' && item.data?.authorId ? (
              <>
                <button type="button" role="menuitem" onClick={() => beginNodeEdit(item)} className="min-h-10 w-full rounded-lg px-3 text-left text-sm hover:bg-[var(--sidebar-hover)]">이름 변경</button>
                <button type="button" role="menuitem" onClick={() => void requestDeleteAuthor(item)} className="mt-1 min-h-10 w-full rounded-lg px-3 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">삭제</button>
              </>
            ) : item.type === 'author_folder' ? (
              <>
                <button type="button" role="menuitem" onClick={() => beginNodeEdit(item)} className="min-h-10 w-full rounded-lg px-3 text-left text-sm hover:bg-[var(--sidebar-hover)]">이름 변경</button>
                <button type="button" role="menuitem" onClick={() => requestDeleteFolder(item)} className="min-h-10 w-full rounded-lg px-3 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">폴더 삭제</button>
              </>
            ) : null}
          </div>
        ) : null}

        {isFolderRow && isExpanded ? (
          <div
            aria-label={`${item.label} 저자 놓기 영역`}
            data-author-folder-drop={item.data?.folderId}
            className={[
              'ml-5 min-h-10 rounded-xl px-1 py-1 transition-[background-color,box-shadow]',
              isAuthorDragging || touchDropTarget === item.data?.folderId
                ? 'bg-[var(--sidebar-hover)] shadow-[inset_0_0_0_1px_var(--accent-border)]'
                : 'bg-[var(--bg-main)]',
            ].join(' ')}
            onDragOver={(event) => handleAuthorListDragOver(event, {
              items: item.children || [],
              listType: 'author',
              authorGroupId: item.data?.folderId,
            })}
            onDrop={(event) => handleAuthorListDrop(event, {
              items: item.children || [],
              listType: 'author',
              authorGroupId: item.data?.folderId,
            }, item.data?.folderId)}
          >
            {item.children?.length ? (
              renderTree(item.children, depth + 1, undefined, item.data?.folderId)
            ) : (
              <p className="flex min-h-8 items-center px-3 text-xs text-[var(--text-muted)]">
                저자를 여기에 놓으세요
              </p>
            )}
          </div>
        ) : item.type !== 'root' && Boolean(item.children?.length) && isExpanded ? (
          <div>{renderTree(item.children ?? [], depth + 1, item.data?.authorId)}</div>
        ) : null}
      </div>
    );
  };

  const renderTree = (
    items: SidebarItem[],
    depth = 0,
    parentAuthor?: string,
    authorGroupId?: string
  ): React.ReactNode => {
    if (depth === 0) {
      const roots = items.filter((item) => item.type === 'root');
      const authors = items.filter((item) => item.type === 'author');
      const authorGroups = items.filter((item) => item.type === 'author_folder');

      return (
        <>
          {roots.map((item) => renderTreeRow(item, depth))}
          {roots.length > 0 && (authors.length > 0 || authorGroups.length > 0) ? (
            <div
              aria-hidden="true"
              className="mx-2 my-3 h-px rounded-full bg-[var(--border-main)]"
            />
          ) : null}
          <div>{authorGroups.map((item) => renderTreeRow(item, depth))}</div>
          <div
            aria-label="폴더 밖 저자 영역"
            data-author-outside-drop="true"
            className="min-h-2"
            onDragOver={(event) => handleAuthorListDragOver(event, {
              items: authors,
              listType: 'author',
              authorGroupId: 'outside',
            })}
            onDrop={(event) => handleAuthorListDrop(event, {
              items: authors,
              listType: 'author',
              authorGroupId: 'outside',
            })}
          >
            {authors.map((item, index) =>
              renderTreeRow(item, depth, { index, listType: 'author', authorGroupId: 'outside' })
            )}
            {isAuthorDragging && authors.length === 0 ? (
              <p className="flex min-h-10 items-center px-3 text-xs text-[var(--text-muted)]">
                여기에 놓으면 폴더에서 빠집니다
              </p>
            ) : null}
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

    const areAuthors = items.every((item) => item.type === 'author');
    if (areAuthors && authorGroupId) {
      return items.map((item, index) => renderTreeRow(item, depth, {
        index,
        listType: 'author',
        authorGroupId,
      }));
    }

    return items.map((item) => renderTreeRow(item, depth));
  };

  const authorTreeItems = treeData.filter((item) => item.type === 'author');

  return (
    <div
      className={`library-sidebar-tree ${embedded ? 'px-0 pb-2' : 'flex-1 overflow-y-auto px-4 pb-5 pt-3'}`}
      onDragOver={(event) => handleTreePanelDragOver(event, authorTreeItems)}
      onDrop={(event) => handleTreePanelDrop(event, authorTreeItems)}
    >
      {!embedded ? (
        <div className="mb-2.5 px-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          저자와 책
        </div>
      ) : null}
      {renderTree(treeData)}
      {deletingAuthorItem?.data?.authorId && deletingAuthorPreview && onDeleteAuthor ? (
        <AuthorDeleteDialog
          authorId={deletingAuthorItem.data.authorId}
          authorName={deletingAuthorItem.label}
          bookCount={deletingAuthorPreview.bookCount}
          citationCount={deletingAuthorPreview.citationCount}
          onClose={() => { setDeletingAuthorItem(null); setDeletingAuthorPreview(null); }}
          onDelete={onDeleteAuthor}
        />
      ) : null}
    </div>
  );
};
