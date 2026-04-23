import React from 'react';
import { FolderOpen } from 'lucide-react';
import type { LibrarySidebarProps } from '../contract/librarySidebarContract';
import { LibrarySidebarTree } from './LibrarySidebarTree';
import {
  EditorialListButton,
  EditorialSearchField,
  EditorialSectionLabel,
} from '../../../shared/ui/sidebar/SidebarPrimitives';

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
      className="border-l border-[var(--border-main)] bg-[var(--bg-card)] flex flex-col h-full sticky top-0 overflow-hidden shadow-[var(--shadow-sidebar)] transition-colors duration-200 relative"
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

      <div className="border-b border-[var(--border-main)] p-3.5">
        <span className="type-title-bounded mb-3 block font-semibold text-[var(--text-main)]">
          Library
        </span>

        <EditorialSearchField
          value={searchTerm}
          onChange={onSearch}
          placeholder="Search everything..."
        />
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
          <>
            <EditorialSectionLabel>Scope</EditorialSectionLabel>
            <EditorialListButton
              active={selectedProjectId === null}
              className="mb-3 flex items-center gap-2 font-medium"
              onClick={() => onProjectSelect(null)}
            >
              <FolderOpen size={16} className="shrink-0" />
              <span>All Citations</span>
            </EditorialListButton>
          </>
        }
      />
    </aside>
  );
};
