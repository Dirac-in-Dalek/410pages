import React from 'react';
import { Bell, Search, Settings, UserCircle2 } from 'lucide-react';
import { CreateBookInput, Project, SidebarItem } from '../types';
import { useSidebarResize } from './main-layout/useSidebarResize';
import { LibrarySidebar } from '../features/archive/ui/LibrarySidebar';
import { ProjectSidebar } from '../features/archive/ui/ProjectSidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  projects: Project[];
  onProjectSelect: (projectId: string | null) => void;
  selectedProjectId: string | null;
  onDropCitationToProject: (projectId: string, citationId: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameAuthor: (authorId: string, name: string) => void;
  onRenameBook: (bookId: string, name: string) => void;
  onDeleteAuthor: (authorId: string) => void;
  onDeleteBook: (bookId: string) => void;
  onCreateBook: (input: CreateBookInput) => Promise<unknown> | unknown;
  onReorderProjects: (dragIndex: number, hoverIndex: number) => void;
  treeData: SidebarItem[];
  onTreeItemClick: (item: SidebarItem) => void;
  username?: string;
  avatarUrl?: string | null;
  onUpdateUsername?: (name: string) => void;
  onSignOut?: () => void;
  onSearch?: (term: string) => void;
  searchTerm?: string;
  selectedFilter?: { type: 'author' | 'book'; value: string; author?: string } | null;
  onReorderBookAt?: (author: string, dragBook: string, dropIndex: number) => void;
  onOpenPdfReader: () => void;
  onOpenSettings: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  projects,
  onProjectSelect,
  selectedProjectId,
  onDropCitationToProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onRenameAuthor,
  onRenameBook,
  onDeleteAuthor,
  onDeleteBook,
  onCreateBook,
  onReorderProjects,
  treeData,
  onTreeItemClick,
  avatarUrl = null,
  onSearch,
  searchTerm = '',
  selectedFilter = null,
  onReorderBookAt,
  onOpenPdfReader,
  onOpenSettings
}) => {
  const {
    leftWidth,
    rightWidth,
    isResizingLeft,
    isResizingRight,
    startLeftResize,
    startRightResize
  } = useSidebarResize();

  return (
    <div className="font-size-app flex h-screen w-full flex-col overflow-hidden bg-[var(--bg-main)] font-sans text-[var(--text-main)] transition-colors duration-200">
      <header className="border-b border-[var(--border-main)] bg-[var(--bg-card)]">
        <div className="flex h-[3.15rem] items-center gap-4 px-5">
          <div
            className="flex shrink-0 items-center gap-2.5"
            style={{ width: `${leftWidth}px` }}
          >
            <div className="text-[var(--accent)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 6 L12 3 H18 V18 L13 21 H7 V6" />
              </svg>
            </div>
            <div className="brand-wordmark text-[1.05rem] text-[var(--accent)]">
              <span className="brand-number">410</span>
              <span className="brand-text">pages</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 justify-center">
            <label className="flex h-9 w-full max-w-[34rem] items-center rounded-full border border-transparent bg-[var(--bg-input)] px-4 transition-colors focus-within:border-[var(--accent-border)]">
              <Search size={16} className="mr-2 shrink-0 text-[var(--text-secondary)]" />
              <input
                value={searchTerm}
                onChange={(event) => onSearch?.(event.target.value)}
                placeholder="Search citations, authors, or books..."
                className="type-body-bounded h-full w-full border-none bg-transparent p-0 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:ring-0"
              />
            </label>
          </div>

          <div
            className="flex shrink-0 items-center justify-end gap-2"
            style={{ width: `${rightWidth}px` }}
          >
            <button
              type="button"
              className="ui-btn ui-btn-icon h-8 w-8 min-h-0 rounded-full border-transparent bg-transparent text-[var(--text-secondary)]"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="ui-btn ui-btn-icon h-8 w-8 min-h-0 rounded-full border-transparent bg-transparent text-[var(--text-secondary)]"
              aria-label="Open settings"
            >
              <Settings size={18} />
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--sidebar-hover)]"
              aria-label="Open account settings"
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
        <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectSelect={onProjectSelect}
          onDropCitationToProject={onDropCitationToProject}
          onCreateProject={onCreateProject}
          onRenameProject={onRenameProject}
          onDeleteProject={onDeleteProject}
          onReorderProjects={onReorderProjects}
          onOpenPdfReader={onOpenPdfReader}
          width={leftWidth}
          isResizing={isResizingLeft}
          onStartResize={startLeftResize}
        />

        <main className="flex min-w-0 flex-1 flex-col bg-[var(--bg-main)] transition-colors duration-200">
          {children}
        </main>

        <LibrarySidebar
          treeData={treeData}
          onTreeItemClick={onTreeItemClick}
          onProjectSelect={onProjectSelect}
          selectedProjectId={selectedProjectId}
          onSearch={onSearch}
          searchTerm={searchTerm}
          selectedFilter={selectedFilter}
          onCreateBook={onCreateBook}
          onRenameAuthor={onRenameAuthor}
          onRenameBook={onRenameBook}
          onDeleteAuthor={onDeleteAuthor}
          onDeleteBook={onDeleteBook}
          onReorderBookAt={onReorderBookAt}
          width={rightWidth}
          isResizing={isResizingRight}
          onStartResize={startRightResize}
        />
      </div>
    </div>
  );
};
