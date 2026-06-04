import React, { useState } from 'react';
import { BookPlus, FolderOpen } from 'lucide-react';
import type { LibrarySidebarProps } from '../contract/librarySidebarContract';
import { LibrarySidebarTree } from './LibrarySidebarTree';
import { NewBookDialog } from './NewBookDialog';

export const LibrarySidebar: React.FC<LibrarySidebarProps> = ({
  treeData,
  onTreeItemClick,
  onProjectSelect,
  selectedProjectId,
  selectedFilter = null,
  onCreateBook,
  onReorderBookAt,
  onRenameAuthor,
  onRenameBook,
  width,
  isResizing,
  onStartResize,
}) => {
  const [isNewBookOpen, setIsNewBookOpen] = useState(false);

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

      <div className="border-b border-[var(--border-main)] px-3.5 pb-3 pt-3.5">
        <div>
          <span className="type-title-bounded block text-[1.45rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">
            Library
          </span>
        </div>
      </div>

      <LibrarySidebarTree
        treeData={treeData}
        onTreeItemClick={onTreeItemClick}
        selectedFilter={selectedFilter}
        onReorderBookAt={onReorderBookAt}
        onRenameAuthor={onRenameAuthor}
        onRenameBook={onRenameBook}
        headerContent={
          <div className="mb-5">
            {onCreateBook && (
              <button
                type="button"
                onClick={() => setIsNewBookOpen(true)}
                className="mb-2 flex w-full items-center gap-2.5 rounded-[0.85rem] bg-[var(--bg-card)] px-3 py-[0.55rem] text-left text-[14px] font-medium text-[var(--text-main)] shadow-[var(--shadow-card)] transition-[background-color,color,box-shadow,transform] duration-150 hover:bg-[var(--sidebar-hover)] active:scale-[0.98]"
              >
                <BookPlus size={15} className="shrink-0 text-[var(--accent)]" />
                <span>새 책 읽기</span>
              </button>
            )}
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
      {onCreateBook && (
        <NewBookDialog
          isOpen={isNewBookOpen}
          onClose={() => setIsNewBookOpen(false)}
          onCreateBook={onCreateBook}
        />
      )}
    </aside>
  );
};
