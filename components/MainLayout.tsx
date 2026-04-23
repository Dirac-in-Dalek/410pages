import React from 'react';
import { Project, SidebarItem } from '../types';
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
  onReorderAuthorAt?: (dragAuthor: string, dropIndex: number) => void;
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
  onReorderProjects,
  treeData,
  onTreeItemClick,
  username = 'Researcher',
  avatarUrl = null,
  onUpdateUsername,
  onSignOut,
  onSearch,
  searchTerm = '',
  selectedFilter = null,
  onReorderAuthorAt,
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
    <div className="font-size-app flex h-screen w-full bg-[var(--bg-main)] overflow-hidden font-sans text-[var(--text-main)] transition-colors duration-200">
      <ProjectSidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectSelect={onProjectSelect}
        onDropCitationToProject={onDropCitationToProject}
        onCreateProject={onCreateProject}
        onRenameProject={onRenameProject}
        onDeleteProject={onDeleteProject}
        onReorderProjects={onReorderProjects}
        username={username}
        avatarUrl={avatarUrl}
        onUpdateUsername={onUpdateUsername}
        onSignOut={onSignOut}
        onOpenPdfReader={onOpenPdfReader}
        onOpenSettings={onOpenSettings}
        width={leftWidth}
        isResizing={isResizingLeft}
        onStartResize={startLeftResize}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[var(--bg-main)] transition-colors duration-200">
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
        onRenameAuthor={onRenameAuthor}
        onRenameBook={onRenameBook}
        onReorderAuthorAt={onReorderAuthorAt}
        onReorderBookAt={onReorderBookAt}
        width={rightWidth}
        isResizing={isResizingRight}
        onStartResize={startRightResize}
      />
    </div>
  );
};
