import React from 'react';
import { Search, UserCircle2 } from 'lucide-react';
import { AuthorDeletePreview, BookSource, Citation, DeleteAuthorCascadeResult, Project, SidebarItem } from '../types';
import { useSidebarResize } from './main-layout/useSidebarResize';
import { ProjectSidebar } from '../features/archive/ui/ProjectSidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  rightPanelOpen?: boolean;
  projects: Project[];
  onProjectSelect: (projectId: string | null) => void;
  selectedProjectId: string | null;
  onDropCitationToProject: (projectId: string, citationId: string) => void;
  onCreateProject: (name: string) => boolean | void | Promise<boolean | void>;
  onRenameProject: (id: string, name: string) => boolean | void | Promise<boolean | void>;
  onDeleteProject: (id: string) => void;
  onRenameAuthor: (authorId: string, name: string) => boolean | void | Promise<boolean | void>;
  onRenameBook: (bookId: string, name: string) => boolean | void | Promise<boolean | void>;
  books: BookSource[];
  citations: Citation[];
  isHomeView: boolean;
  selectedBookId: string | null;
  onHomeSelect: () => void;
  onBookSelect: (book: BookSource) => void;
  onReorderProjects: (dragIndex: number, hoverIndex: number) => void;
  treeData: SidebarItem[];
  onTreeItemClick: (item: SidebarItem) => void;
  authorFolderLoading: boolean;
  authorFolderLoadError: string | null;
  onRetryAuthorFolders: () => void | Promise<void>;
  onCreateAuthorFolder: (name: string) => boolean | void | Promise<boolean | void>;
  onRenameAuthorFolder: (folderId: string, name: string) => boolean | void | Promise<boolean | void>;
  onDeleteAuthorFolder: (folderId: string) => boolean | void | Promise<boolean | void>;
  onMoveAuthorToFolder: (authorId: string, folderId: string) => boolean | void | Promise<boolean | void>;
  onRemoveAuthorFromFolder: (authorId: string) => boolean | void | Promise<boolean | void>;
  onDeleteAuthor: (authorId: string) => Promise<DeleteAuthorCascadeResult | undefined>;
  onPreviewAuthorDelete: (authorId: string) => Promise<AuthorDeletePreview | undefined>;
  avatarUrl?: string | null;
  onSearch?: (term: string) => void;
  searchTerm?: string;
  selectedFilter?: { type: 'author' | 'book'; authorId?: string; bookId?: string; value: string; author?: string } | null;
  onReorderBookAt?: (author: string, dragBook: string, dropIndex: number) => void;
  onReorderAuthorAt?: (groupAuthorIds: string[], dragAuthorId: string, dropIndex: number) => void;
  libraryOrderSaving?: boolean;
  onOpenSettings: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  leftPanel,
  rightPanel,
  rightPanelOpen = true,
  projects,
  onProjectSelect,
  selectedProjectId,
  onDropCitationToProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onRenameAuthor,
  onRenameBook,
  books,
  citations,
  isHomeView,
  selectedBookId,
  onHomeSelect,
  onBookSelect,
  onReorderProjects,
  treeData,
  onTreeItemClick,
  authorFolderLoading,
  authorFolderLoadError,
  onRetryAuthorFolders,
  onCreateAuthorFolder,
  onRenameAuthorFolder,
  onDeleteAuthorFolder,
  onMoveAuthorToFolder,
  onRemoveAuthorFromFolder,
  onDeleteAuthor,
  onPreviewAuthorDelete,
  avatarUrl = null,
  onSearch,
  searchTerm = '',
  selectedFilter = null,
  onReorderBookAt,
  onReorderAuthorAt,
  libraryOrderSaving,
  onOpenSettings
}) => {
  const {
    leftWidth,
    isResizingLeft,
    startLeftResize,
  } = useSidebarResize();

  return (
    <div className="font-size-app flex h-screen w-full flex-col overflow-hidden bg-[var(--bg-main)] font-sans text-[var(--text-main)] transition-colors duration-200">
      <header className="border-b border-[var(--border-main)] bg-[var(--bg-card)]">
        <div className="flex h-[3.15rem] items-center gap-4 px-5">
          <div className="shrink-0" style={{ width: `${leftWidth}px` }} />

          <div className="flex min-w-0 flex-1 justify-center">
            <label className="flex h-9 w-full max-w-[34rem] items-center rounded-full border border-transparent bg-[var(--bg-input)] px-4 transition-colors focus-within:border-[var(--accent-border)]">
              <Search size={16} className="mr-2 shrink-0 text-[var(--text-secondary)]" />
              <input
                value={searchTerm}
                onChange={(event) => onSearch?.(event.target.value)}
                aria-label="문장, 저자 또는 책 검색"
                placeholder="문장, 저자 또는 책 검색…"
                className="type-body-bounded h-full w-full border-none bg-transparent p-0 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:ring-0"
              />
            </label>
          </div>

          <div
            className="flex shrink-0 items-center justify-end gap-2"
            style={{ width: `${leftWidth}px` }}
          >
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex h-10 w-10 touch-manipulation items-center justify-center overflow-hidden rounded-full bg-[var(--bg-input)] text-[var(--text-secondary)] transition-[background-color,color,transform] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)] active:scale-95 motion-reduce:transition-none"
              aria-label="계정 및 설정 열기"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserCircle2 size={20} />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {leftPanel ? (
          <div className="relative h-full shrink-0" style={{ width: `${leftWidth}px` }}>
            {leftPanel}
            <div
              onMouseDown={startLeftResize}
              className="absolute inset-y-0 right-0 z-10 w-1 cursor-col-resize"
              aria-hidden="true"
            />
          </div>
        ) : <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectSelect={onProjectSelect}
          onDropCitationToProject={onDropCitationToProject}
          onCreateProject={onCreateProject}
          onRenameProject={onRenameProject}
          onDeleteProject={onDeleteProject}
          onReorderProjects={onReorderProjects}
          books={books}
          citations={citations}
          treeData={treeData}
          selectedBookId={selectedBookId}
          selectedFilter={selectedFilter}
          isHomeView={isHomeView}
          onHomeSelect={onHomeSelect}
          onBookSelect={onBookSelect}
          onTreeItemClick={onTreeItemClick}
          authorFolderLoading={authorFolderLoading}
          authorFolderLoadError={authorFolderLoadError}
          onRetryAuthorFolders={onRetryAuthorFolders}
          onCreateAuthorFolder={onCreateAuthorFolder}
          onRenameAuthorFolder={onRenameAuthorFolder}
          onDeleteAuthorFolder={onDeleteAuthorFolder}
          onMoveAuthorToFolder={onMoveAuthorToFolder}
          onRemoveAuthorFromFolder={onRemoveAuthorFromFolder}
          onDeleteAuthor={onDeleteAuthor}
          onPreviewAuthorDelete={onPreviewAuthorDelete}
          onRenameAuthor={onRenameAuthor}
          onRenameBook={onRenameBook}
          onReorderBookAt={onReorderBookAt}
          onReorderAuthorAt={onReorderAuthorAt}
          libraryOrderSaving={libraryOrderSaving}
          width={leftWidth}
          isResizing={isResizingLeft}
          onStartResize={startLeftResize}
        />}

        <main className="flex min-w-0 flex-1 flex-col bg-[var(--bg-main)] transition-colors duration-200">
          {children}
        </main>
        {rightPanel ? (
          <div
            aria-hidden={!rightPanelOpen}
            className={[
              'h-full shrink-0 overflow-hidden transition-[width,opacity] duration-200 motion-reduce:transition-none',
              rightPanelOpen ? 'visible w-[20rem] opacity-100' : 'invisible w-0 opacity-0 pointer-events-none',
            ].join(' ')}
          >
            {rightPanel}
          </div>
        ) : null}
      </div>
    </div>
  );
};
