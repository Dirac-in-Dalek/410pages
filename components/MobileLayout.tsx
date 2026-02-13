import React, { useEffect, useState } from 'react';
import {
  Book,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Library,
  LogOut,
  Moon,
  Plus,
  Search,
  Sun,
  User,
  X
} from 'lucide-react';
import { Project, SidebarItem } from '../types';

interface MobileLayoutProps {
  children: React.ReactNode;
  title: string;
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onCreateProject: (name: string) => void;
  treeData: SidebarItem[];
  onTreeItemClick: (item: SidebarItem) => void;
  onSearch?: (term: string) => void;
  searchTerm?: string;
  selectedFilter?: { type: 'author' | 'book'; value: string; author?: string } | null;
  username?: string;
  onSignOut?: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  projects,
  selectedProjectId,
  onProjectSelect,
  onCreateProject,
  treeData,
  onTreeItemClick,
  onSearch,
  searchTerm = '',
  selectedFilter = null,
  username = 'Researcher',
  onSignOut,
  isDarkMode,
  toggleDarkMode
}) => {
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root-user']));
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const closeSheets = () => {
    setIsProjectsOpen(false);
    setIsLibraryOpen(false);
  };

  useEffect(() => {
    const isAnySheetOpen = isProjectsOpen || isLibraryOpen;
    document.body.style.overflow = isAnySheetOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isProjectsOpen, isLibraryOpen]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheets();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitCreateProject = () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    onCreateProject(trimmed);
    setNewProjectName('');
    setIsCreatingProject(false);
  };

  const renderTree = (items: SidebarItem[], depth = 0) => {
    return items.map(item => {
      const isExpanded = expandedNodes.has(item.id);
      const paddingLeft = depth * 12 + 12;
      const isActive =
        selectedFilter?.type === item.type &&
        selectedFilter?.value === (item.type === 'book' ? item.data?.book : item.data?.author) &&
        (item.type !== 'book' || selectedFilter?.author === item.data?.author);

      return (
        <div key={item.id}>
          <button
            type="button"
            className={`
              w-full flex items-center py-2 pr-2 text-sm rounded-md my-0.5 transition-colors
              ${isActive
                ? 'bg-[var(--accent-active)] text-[var(--accent-active-text)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]'}
            `}
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={() => {
              onTreeItemClick(item);
              if (item.children && !expandedNodes.has(item.id)) {
                setExpandedNodes(prev => new Set([...prev, item.id]));
              }
              closeSheets();
            }}
          >
            <span
              className="mr-1 p-0.5 rounded"
              onClick={(e) => item.children ? toggleNode(item.id, e) : undefined}
            >
              {item.children ? (
                isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
              ) : (
                <span className="w-[14px] inline-block" />
              )}
            </span>

            {item.type === 'root' && <User size={14} className="mr-2" />}
            {item.type === 'author' && <User size={14} className="mr-2 opacity-70" />}
            {item.type === 'book' && <Book size={14} className="mr-2 opacity-70" />}

            <span className="truncate text-left">{item.label}</span>
          </button>

          {item.children && isExpanded && (
            <div>{renderTree(item.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-screen w-full bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col">
      <header className="h-14 border-b border-[var(--border-main)] bg-[var(--bg-card)] px-3 flex items-center justify-between z-40">
        <button
          onClick={() => setIsProjectsOpen(true)}
          className="p-2 rounded-md text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]"
          title="Folders"
        >
          <Folder size={18} />
        </button>

        <h1 className="font-serif text-base truncate px-3">{title}</h1>

        <button
          onClick={() => setIsLibraryOpen(true)}
          className="p-2 rounded-md text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]"
          title="Library"
        >
          <Library size={18} />
        </button>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>

      {(isProjectsOpen || isLibraryOpen) && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          onClick={closeSheets}
          aria-label="Close panels"
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 h-full w-[86vw] max-w-sm z-50 bg-[var(--bg-card)] border-r border-[var(--border-main)] shadow-2xl
          transition-transform duration-300 ease-out
          ${isProjectsOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-14 px-4 border-b border-[var(--border-main)] flex items-center justify-between">
          <div className="font-semibold">Folders</div>
          <button
            onClick={() => setIsProjectsOpen(false)}
            className="p-2 rounded-md text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-3 overflow-y-auto h-[calc(100%-56px)] flex flex-col">
          <button
            onClick={() => {
              onProjectSelect(null);
              closeSheets();
            }}
            className={`
              w-full flex items-center p-2 rounded-md text-sm mb-3 border transition-colors
              ${selectedProjectId === null
                ? 'bg-[var(--accent-active)] text-[var(--accent-active-text)] border-transparent'
                : 'border-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]'}
            `}
          >
            <FolderOpen size={16} className="mr-2" />
            All Citations
          </button>

          <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] px-1 mb-2">
            Projects
          </div>
          <div className="space-y-1">
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => {
                  onProjectSelect(project.id);
                  closeSheets();
                }}
                className={`
                  w-full flex items-center p-2 rounded-md text-sm border transition-colors
                  ${selectedProjectId === project.id
                    ? 'bg-[var(--accent-active)] text-[var(--accent-active-text)] border-transparent'
                    : 'border-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]'}
                `}
              >
                <Folder size={15} className="mr-2" />
                <span className="truncate flex-1 text-left">{project.name}</span>
                <span className="text-[10px] opacity-80">{project.citationIds.length}</span>
              </button>
            ))}
          </div>

          {isCreatingProject ? (
            <div className="mt-3 flex items-center gap-1">
              <input
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitCreateProject();
                  if (e.key === 'Escape') {
                    setIsCreatingProject(false);
                    setNewProjectName('');
                  }
                }}
                placeholder="Project name"
                className="flex-1 text-sm px-3 py-2 border border-[var(--border-main)] rounded-md bg-[var(--bg-input)]"
              />
              <button
                onClick={submitCreateProject}
                className="p-2 rounded-md bg-indigo-600 text-white"
                title="Create"
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingProject(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 text-sm border border-[var(--border-main)] rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]"
            >
              <Plus size={14} />
              New Project
            </button>
          )}

          <div className="mt-auto pt-4 border-t border-[var(--border-main)]">
            <div className="text-xs text-[var(--text-muted)] mb-2 truncate">{username}</div>
            <div className="flex gap-2">
              <button
                onClick={toggleDarkMode}
                className="flex-1 p-2 rounded-md border border-[var(--border-main)] text-sm text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] flex items-center justify-center gap-1"
              >
                {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                Theme
              </button>
              <button
                onClick={onSignOut}
                className="flex-1 p-2 rounded-md border border-[var(--border-main)] text-sm text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] flex items-center justify-center gap-1"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <aside
        className={`
          fixed right-0 top-0 h-full w-[90vw] max-w-md z-50 bg-[var(--bg-card)] border-l border-[var(--border-main)] shadow-2xl
          transition-transform duration-300 ease-out
          ${isLibraryOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="h-14 px-4 border-b border-[var(--border-main)] flex items-center justify-between gap-3">
          <div className="font-semibold">Library</div>
          <button
            onClick={() => setIsLibraryOpen(false)}
            className="p-2 rounded-md text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-3 border-b border-[var(--border-main)]">
          <div className="flex items-center bg-[var(--bg-input)] rounded-md px-2 py-2 border border-[var(--border-main)]">
            <Search size={14} className="text-[var(--text-muted)] mr-2" />
            <input
              value={searchTerm}
              onChange={(e) => onSearch?.(e.target.value)}
              placeholder="Search citations, author, book"
              className="w-full text-sm bg-transparent border-none p-0 focus:ring-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
            />
            {searchTerm && (
              <button
                onClick={() => onSearch?.('')}
                className="text-[var(--text-muted)]"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="p-3 overflow-y-auto h-[calc(100%-116px)]">
          {renderTree(treeData)}
        </div>
      </aside>
    </div>
  );
};
