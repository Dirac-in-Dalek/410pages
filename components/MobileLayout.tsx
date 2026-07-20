import React, { useEffect, useState } from 'react';
import {
  Book,
  BookPlus,
  Folder,
  Library,
  LogOut,
  Settings,
  User,
} from 'lucide-react';
import { CreateBookInput, Project, SidebarItem } from '../types';
import { NewBookDialog } from '../features/archive/ui/NewBookDialog';
import {
  createDefaultExpandedLibraryNodes,
  ensureExpandedLibraryNode,
  isLibraryTreeItemActive,
  toggleExpandedLibraryNode,
} from '../shared/lib/libraryTree';
import {
  EditorialListButton,
  EditorialProfileCard,
  EditorialSearchField,
  EditorialSectionLabel,
  EditorialSheet,
  EditorialSheetHeader,
  EditorialToolbarButton,
} from '../shared/ui/sidebar/SidebarPrimitives';
import { LibraryTreeRow } from '../shared/ui/sidebar/LibraryTreeRow';
import { ProjectCreateComposer } from '../shared/ui/project/ProjectCreateComposer';

interface MobileLayoutProps {
  children: React.ReactNode;
  title: string;
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onCreateProject: (name: string) => void;
  onCreateBook?: (input: CreateBookInput) => Promise<unknown> | unknown;
  treeData: SidebarItem[];
  onTreeItemClick: (item: SidebarItem) => void;
  onSearch?: (term: string) => void;
  searchTerm?: string;
  selectedFilter?: { type: 'author' | 'book'; value: string; author?: string } | null;
  username?: string;
  avatarUrl?: string | null;
  onSignOut?: () => void;
  onOpenSettings: () => void;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  projects,
  selectedProjectId,
  onProjectSelect,
  onCreateProject,
  onCreateBook,
  treeData,
  onTreeItemClick,
  onSearch,
  searchTerm = '',
  selectedFilter = null,
  username = 'Researcher',
  avatarUrl = null,
  onSignOut,
  onOpenSettings
}) => {
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState(createDefaultExpandedLibraryNodes);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isNewBookOpen, setIsNewBookOpen] = useState(false);

  const closeSheets = () => {
    setIsProjectsOpen(false);
    setIsLibraryOpen(false);
  };

  const toggleProjectsPanel = () => {
    setIsProjectsOpen((prev) => !prev);
    setIsLibraryOpen(false);
  };

  const toggleLibraryPanel = () => {
    setIsLibraryOpen((prev) => !prev);
    setIsProjectsOpen(false);
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheets();
    };

    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => toggleExpandedLibraryNode(prev, id));
  };

  const submitCreateProject = () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    onCreateProject(trimmed);
    setNewProjectName('');
    setIsCreatingProject(false);
  };

  const renderTree = (items: SidebarItem[], depth = 0) =>
    items.map((item) => {
      const isExpanded = expandedNodes.has(item.id);
      const isActive = isLibraryTreeItemActive(item, selectedFilter);

      return (
        <div key={item.id}>
          <LibraryTreeRow
            item={item}
            depth={depth}
            isActive={isActive}
            isExpanded={isExpanded}
            title={item.label}
            activeClassName="bg-[var(--accent-active)] text-[var(--accent-active-text)]"
            inactiveClassName="text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]"
            baseClassName="py-2.5 pr-2 rounded-xl"
            onToggle={(event) => (item.children ? toggleNode(item.id, event) : undefined)}
            onClick={() => {
              onTreeItemClick(item);
              if (item.children && !expandedNodes.has(item.id)) {
                setExpandedNodes((prev) => ensureExpandedLibraryNode(prev, item.id));
              }
              closeSheets();
            }}
          >
            {item.type === 'root' && <User size={14} className="mr-2" />}
            {item.type === 'author' && <User size={14} className="mr-2 opacity-70" />}
            {item.type === 'book' && <Book size={14} className="mr-2 opacity-70" />}

            <span className="truncate text-left">{item.label}</span>
          </LibraryTreeRow>

          {item.children && isExpanded && <div>{renderTree(item.children, depth + 1)}</div>}
        </div>
      );
    });

  return (
    <div className="font-size-app h-[100dvh] w-full bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col overflow-hidden">
      <header className="border-b border-[var(--border-main)] bg-[var(--bg-card)] pt-[env(safe-area-inset-top)]">
        <div className="h-[3.25rem] px-4 flex items-center justify-between gap-3">
          <h1 className="type-title-bounded truncate font-semibold tracking-[-0.012em]">{title}</h1>
          <div className="flex items-center gap-2">
            <EditorialToolbarButton active={isProjectsOpen} onClick={toggleProjectsPanel} ariaLabel="폴더 열기">
              <Folder size={16} />
            </EditorialToolbarButton>
            <EditorialToolbarButton active={isLibraryOpen} onClick={toggleLibraryPanel} ariaLabel="서재 열기">
              <Library size={16} />
            </EditorialToolbarButton>
            <EditorialToolbarButton active={false} onClick={onOpenSettings} ariaLabel="설정 열기">
              <Settings size={17} />
            </EditorialToolbarButton>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>

      {(isProjectsOpen || isLibraryOpen) && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/35"
          onClick={closeSheets}
          aria-label="패널 닫기"
        />
      )}

      <EditorialSheet side="left" isOpen={isProjectsOpen} widthClassName="w-[84vw] max-w-[20rem]">
        <div className="h-full flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <EditorialSheetHeader title="폴더" onClose={() => setIsProjectsOpen(false)} />

          <div className="p-3 overflow-y-auto flex-1 flex flex-col">
            <EditorialListButton
              active={selectedProjectId === null}
              className="mb-3 flex items-center gap-2"
              onClick={() => {
                onProjectSelect(null);
                closeSheets();
              }}
            >
              <Folder size={16} className="shrink-0" />
              <span>모든 문장</span>
            </EditorialListButton>

            <EditorialSectionLabel>폴더</EditorialSectionLabel>
            <div className="space-y-1">
              {projects.map((project) => (
                <EditorialListButton
                  key={project.id}
                  active={selectedProjectId === project.id}
                  className="flex items-center gap-2"
                  onClick={() => {
                    onProjectSelect(project.id);
                    closeSheets();
                  }}
                >
                  <Folder size={15} className="mr-2" />
                  <span className="truncate flex-1 text-left">{project.name}</span>
                </EditorialListButton>
              ))}
            </div>

            <ProjectCreateComposer
              compact
              isCreating={isCreatingProject}
              value={newProjectName}
              placeholder="폴더 이름"
              onStart={() => setIsCreatingProject(true)}
              onChange={setNewProjectName}
              onSubmit={submitCreateProject}
              onCancel={() => {
                setIsCreatingProject(false);
                setNewProjectName('');
              }}
            />

            <div className="pt-4">
              <EditorialProfileCard username={username} avatarUrl={avatarUrl} subtitle="나의 독서 아카이브">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings();
                    closeSheets();
                  }}
                  className="type-label-bounded flex min-h-11 touch-manipulation items-center justify-center gap-1 rounded-lg bg-[var(--bg-input)] p-2.5 text-[var(--text-muted)] transition-[background-color,color,transform] hover:bg-[var(--sidebar-hover)] active:scale-95 motion-reduce:transition-none"
                >
                  <Settings size={14} />
                  설정
                </button>
                <button
                  onClick={onSignOut}
                  className="type-label-bounded flex min-h-11 touch-manipulation items-center justify-center gap-1 rounded-lg bg-[var(--bg-input)] p-2.5 text-[var(--text-muted)] transition-[background-color,color,transform] hover:bg-[var(--sidebar-hover)] active:scale-95 motion-reduce:transition-none"
                >
                  <LogOut size={14} />
                  로그아웃
                </button>
              </div>
              </EditorialProfileCard>
            </div>
          </div>
        </div>
      </EditorialSheet>

      <EditorialSheet side="right" isOpen={isLibraryOpen} widthClassName="w-[92vw] max-w-md">
        <div className="h-full flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <EditorialSheetHeader title="서재" onClose={() => setIsLibraryOpen(false)} />

          <div className="space-y-3 p-3 border-b border-[var(--border-main)]">
            {onCreateBook && (
              <EditorialListButton
                className="flex items-center gap-2"
                onClick={() => setIsNewBookOpen(true)}
              >
                <BookPlus size={16} className="shrink-0 text-[var(--accent)]" />
                <span>새 책 읽기</span>
              </EditorialListButton>
            )}
            <EditorialSearchField
              value={searchTerm}
              onChange={onSearch}
              placeholder="문장, 저자 또는 책 검색"
            />
          </div>

          <div className="p-3 overflow-y-auto flex-1">{renderTree(treeData)}</div>
        </div>
      </EditorialSheet>

      {onCreateBook && (
        <NewBookDialog
          isOpen={isNewBookOpen}
          onClose={() => setIsNewBookOpen(false)}
          onCreateBook={onCreateBook}
          onCreated={closeSheets}
          overlayClassName="z-[60]"
        />
      )}
    </div>
  );
};
