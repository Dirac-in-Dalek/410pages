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
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookTitle, setNewBookTitle] = useState('');
  const [isCreatingBook, setIsCreatingBook] = useState(false);

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

  const resetNewBookForm = () => {
    setNewBookAuthor('');
    setNewBookTitle('');
  };

  const closeNewBook = () => {
    if (isCreatingBook) return;
    setIsNewBookOpen(false);
    resetNewBookForm();
  };

  const submitNewBook = async () => {
    const title = newBookTitle.trim();
    if (!title || !onCreateBook || isCreatingBook) return;

    setIsCreatingBook(true);
    try {
      const result = await Promise.resolve(
        onCreateBook({
          author: newBookAuthor.trim(),
          title,
        })
      );
      if (result) {
        setIsNewBookOpen(false);
        resetNewBookForm();
        closeSheets();
      }
    } finally {
      setIsCreatingBook(false);
    }
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
            <EditorialToolbarButton active={isProjectsOpen} onClick={toggleProjectsPanel} ariaLabel="Open folders">
              <Folder size={16} />
            </EditorialToolbarButton>
            <EditorialToolbarButton active={isLibraryOpen} onClick={toggleLibraryPanel} ariaLabel="Open library">
              <Library size={16} />
            </EditorialToolbarButton>
            <EditorialToolbarButton active={false} onClick={onOpenSettings} ariaLabel="Open settings">
              <Settings size={17} />
            </EditorialToolbarButton>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>

      {(isProjectsOpen || isLibraryOpen) && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm"
          onClick={closeSheets}
          aria-label="Close panels"
        />
      )}

      <EditorialSheet side="left" isOpen={isProjectsOpen} widthClassName="w-[84vw] max-w-[20rem]">
        <div className="h-full flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <EditorialSheetHeader title="Folders" onClose={() => setIsProjectsOpen(false)} />

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
              <span>All Citations</span>
            </EditorialListButton>

            <EditorialSectionLabel>Projects</EditorialSectionLabel>
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
              placeholder="Project name"
              onStart={() => setIsCreatingProject(true)}
              onChange={setNewProjectName}
              onSubmit={submitCreateProject}
              onCancel={() => {
                setIsCreatingProject(false);
                setNewProjectName('');
              }}
            />

            <div className="pt-4">
              <EditorialProfileCard username={username} avatarUrl={avatarUrl} subtitle="Research workspace">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings();
                    closeSheets();
                  }}
                  className="type-label-bounded p-2.5 rounded-md border border-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] flex items-center justify-center gap-1"
                >
                  <Settings size={14} />
                  Settings
                </button>
                <button
                  onClick={onSignOut}
                  className="type-label-bounded p-2.5 rounded-md border border-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] flex items-center justify-center gap-1"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
              </EditorialProfileCard>
            </div>
          </div>
        </div>
      </EditorialSheet>

      <EditorialSheet side="right" isOpen={isLibraryOpen} widthClassName="w-[92vw] max-w-md">
        <div className="h-full flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <EditorialSheetHeader title="Library" onClose={() => setIsLibraryOpen(false)} />

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
              placeholder="Search citations, author, book"
            />
          </div>

          <div className="p-3 overflow-y-auto flex-1">{renderTree(treeData)}</div>
        </div>
      </EditorialSheet>

      {isNewBookOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4">
          <form
            className="w-full max-w-sm rounded-[0.9rem] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-popover)]"
            onSubmit={(event) => {
              event.preventDefault();
              void submitNewBook();
            }}
          >
            <div className="mb-4">
              <h3 className="text-base font-semibold text-[var(--text-main)]">새 책 읽기</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">책 컨텍스트를 만들고 바로 인용을 시작합니다.</p>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">저자</span>
                <input
                  aria-label="저자"
                  value={newBookAuthor}
                  onChange={(event) => setNewBookAuthor(event.target.value)}
                  className="w-full rounded-[0.7rem] border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-main)] focus:border-[var(--accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                  placeholder="비워두면 내 책"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">책 제목</span>
                <input
                  aria-label="책 제목"
                  value={newBookTitle}
                  onChange={(event) => setNewBookTitle(event.target.value)}
                  className="w-full rounded-[0.7rem] border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-main)] focus:border-[var(--accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                  autoFocus
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeNewBook}
                disabled={isCreatingBook}
                className="rounded-[0.7rem] px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-[background-color,transform] duration-150 hover:bg-[var(--sidebar-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!newBookTitle.trim() || isCreatingBook}
                className="rounded-[0.7rem] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[var(--accent-strong)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingBook ? '시작 중' : '시작'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
