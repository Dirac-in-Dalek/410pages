import React from 'react';
import { FolderOpen, Search } from 'lucide-react';
import type { LibrarySidebarProps } from '../contract/librarySidebarContract';
import { LibrarySidebarTree } from './LibrarySidebarTree';

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
  onStartResize,
}) => {
  return (
    <aside
      style={{ width: `${width}px` }}
      className="relative flex h-full flex-col overflow-hidden border-l border-[var(--border-main)] bg-[var(--bg-sidebar)] shadow-[var(--shadow-sidebar)] transition-colors duration-200"
    >
      <div
        onMouseDown={onStartResize}
        className="absolute top-0 -left-1 w-2 h-full cursor-col-resize z-30 group"
      >
        <div
          className={`w-[2px] h-full mx-auto transition-colors ${
            isResizing ? 'bg-[var(--accent)]' : 'group-hover:bg-[var(--accent-border)]'
          }`}
        />
      </div>

      <div className="border-b border-[var(--border-main)] px-3.5 pb-2.5 pt-3.5">
        <div className="mb-2.5">
          <span className="type-title-bounded block text-[1.45rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">
            Library
          </span>
          <p className="mt-0.5 text-[0.88rem] text-[var(--text-secondary)]">Catalog</p>
        </div>

        <label className="flex items-center rounded-full border border-transparent bg-[var(--bg-input)] px-3.5 py-2 transition-colors focus-within:border-[var(--accent-border)]">
          <Search size={15} className="mr-2 shrink-0 text-[var(--text-muted)]" />
          <input
            value={searchTerm}
            onChange={(event) => onSearch?.(event.target.value)}
            placeholder="Filter authors or books..."
            className="type-body-bounded w-full border-none bg-transparent p-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:ring-0"
          />
        </label>
      </div>

      <LibrarySidebarTree
        treeData={treeData}
        onTreeItemClick={onTreeItemClick}
        selectedFilter={selectedFilter}
        onReorderAuthorAt={onReorderAuthorAt}
        onReorderBookAt={onReorderBookAt}
        onRenameAuthor={onRenameAuthor}
        onRenameBook={onRenameBook}
        headerContent={
          <div className="mb-5">
            <div className="mb-2.5 px-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Scope
            </div>
            <button
              type="button"
              onClick={() => onProjectSelect(null)}
              className={[
                'flex w-full items-center gap-2.5 rounded-[0.85rem] px-3 py-[0.55rem] text-left text-[14px] font-medium transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98]',
                selectedProjectId === null
                  ? 'bg-[var(--accent-active)] text-[var(--accent-active-text)] shadow-[var(--shadow-card)]'
                  : 'bg-[var(--sidebar-hover)] text-[var(--text-main)] hover:bg-[var(--sidebar-active)]',
              ].join(' ')}
            >
              <FolderOpen size={15} className="shrink-0" />
              <span>All Citations</span>
            </button>
          </div>
        }
      />
    </aside>
  );
};
