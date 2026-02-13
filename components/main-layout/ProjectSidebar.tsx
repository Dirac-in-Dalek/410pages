import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Edit2,
  Folder,
  GripVertical,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
  Trash2,
  X
} from 'lucide-react';
import { Project } from '../../types';

type ProjectDropIndicator = {
  projectId: string;
  position: 'before' | 'after';
  dropIndex: number;
};

const PROJECT_SORT_MIME = 'project_sort_index';

interface ProjectSidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onDropCitationToProject: (projectId: string, citationId: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onReorderProjects: (dragIndex: number, hoverIndex: number) => void;
  username?: string;
  onUpdateUsername?: (name: string) => void;
  onSignOut?: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  width: number;
  isResizing: boolean;
  onStartResize: () => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  selectedProjectId,
  onProjectSelect,
  onDropCitationToProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onReorderProjects,
  username = 'Researcher',
  onUpdateUsername,
  onSignOut,
  isDarkMode,
  toggleDarkMode,
  width,
  isResizing,
  onStartResize
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; projectId: string } | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isManageMode, setIsManageMode] = useState(false);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(username);
  const [projectDropIndicator, setProjectDropIndicator] = useState<ProjectDropIndicator | null>(null);
  const [activeProjectDragIndex, setActiveProjectDragIndex] = useState<number | null>(null);
  const [projectDragCenterOffsetY, setProjectDragCenterOffsetY] = useState(0);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleDragOver = (e: React.DragEvent, projectId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (projectId && !isManageMode && dragOverProjectId !== projectId) {
      setDragOverProjectId(projectId);
    }
  };

  const handleDropOnProject = (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    setDragOverProjectId(null);

    try {
      const rawData = e.dataTransfer.getData('application/json');
      if (!rawData) return;

      const data = JSON.parse(rawData);
      if (data.type === 'citation') {
        onDropCitationToProject(projectId, data.id);
      }
    } catch (err) {
      console.error('Failed to parse drop data', err);
    }
  };

  const handleProjectDragStart = (e: React.DragEvent, index: number) => {
    const row = e.currentTarget as HTMLElement;
    const rect = row.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    e.dataTransfer.setData(PROJECT_SORT_MIME, index.toString());
    e.dataTransfer.effectAllowed = 'move';
    setActiveProjectDragIndex(index);
    setProjectDragCenterOffsetY(centerY - e.clientY);
    setProjectDropIndicator(null);
    setDragOverProjectId(null);
  };

  const hasProjectSortType = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types || []).map(type => type.toLowerCase());
    return types.includes(PROJECT_SORT_MIME);
  };

  const getProjectDragIndex = (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData(PROJECT_SORT_MIME);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return activeProjectDragIndex;
  };

  const clearProjectDragState = () => {
    setProjectDropIndicator(null);
    setActiveProjectDragIndex(null);
    setProjectDragCenterOffsetY(0);
  };

  const calcProjectDropPosition = (e: React.DragEvent, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const projectedCenterY = e.clientY + projectDragCenterOffsetY;
    const midY = rect.top + rect.height / 2;
    return projectedCenterY < midY ? 'before' : 'after';
  };

  const buildListIndicator = (e: React.DragEvent, listProjects: Project[]) => {
    if (listProjects.length === 0) return null;

    const container = e.currentTarget as HTMLElement;
    const rowElements = Array.from(container.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node.dataset.projectRowIndex !== undefined
    );
    if (rowElements.length === 0) return null;

    const projectedCenterY = e.clientY + projectDragCenterOffsetY;
    for (let i = 0; i < rowElements.length; i += 1) {
      const rect = rowElements[i].getBoundingClientRect();
      const rowMidY = rect.top + rect.height / 2;
      if (projectedCenterY < rowMidY) {
        return {
          projectId: listProjects[i].id,
          position: 'before' as const,
          dropIndex: i
        };
      }
    }

    return {
      projectId: listProjects[listProjects.length - 1].id,
      position: 'after' as const,
      dropIndex: listProjects.length
    };
  };

  const handleProjectRowDragOver = (e: React.DragEvent, projectId: string, index: number) => {
    if (!hasProjectSortType(e) && activeProjectDragIndex === null) return;
    const dragIndex = getProjectDragIndex(e);
    if (dragIndex === null) return;

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const position = calcProjectDropPosition(e, e.currentTarget as HTMLElement);
    const dropIndex = position === 'before' ? index : index + 1;
    setProjectDropIndicator({ projectId, position, dropIndex });
  };

  const handleProjectRowDrop = (e: React.DragEvent, projectId: string, index: number) => {
    if (!hasProjectSortType(e) && activeProjectDragIndex === null) return;
    const dragIndex = getProjectDragIndex(e);
    if (dragIndex === null) {
      clearProjectDragState();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    const position = calcProjectDropPosition(e, e.currentTarget as HTMLElement);
    const dropIndex = position === 'before' ? index : index + 1;
    if (dragIndex !== dropIndex) {
      onReorderProjects(dragIndex, dropIndex);
    }
    clearProjectDragState();
  };

  const handleProjectListDragOver = (e: React.DragEvent, listProjects: Project[]) => {
    if (!hasProjectSortType(e) && activeProjectDragIndex === null) return;
    if (listProjects.length === 0) return;
    const dragIndex = getProjectDragIndex(e);
    if (dragIndex === null) return;

    const indicator = buildListIndicator(e, listProjects);
    if (!indicator) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setProjectDropIndicator(indicator);
  };

  const handleProjectListDrop = (e: React.DragEvent, listProjects: Project[]) => {
    if (!hasProjectSortType(e) && activeProjectDragIndex === null) return;
    if (listProjects.length === 0) return;
    const dragIndex = getProjectDragIndex(e);
    if (dragIndex === null) {
      clearProjectDragState();
      return;
    }

    const indicator = projectDropIndicator ?? buildListIndicator(e, listProjects);
    if (!indicator) {
      clearProjectDragState();
      return;
    }

    e.preventDefault();
    onReorderProjects(dragIndex, indicator.dropIndex);
    clearProjectDragState();
  };

  const handleProjectsPanelDragOver = (e: React.DragEvent, projectIds: string[]) => {
    if (!hasProjectSortType(e) && activeProjectDragIndex === null) return;
    if (projectIds.length === 0) return;
    const dragIndex = getProjectDragIndex(e);
    if (dragIndex === null) return;
    const target = e.target as HTMLElement;
    if (target?.closest?.('[data-project-row-index]')) return;

    const panelRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const projectedCenterY = e.clientY + projectDragCenterOffsetY;
    const boundary = projectedCenterY <= panelRect.top + panelRect.height / 2 ? 'start' : 'end';
    const indicator: ProjectDropIndicator =
      boundary === 'start'
        ? { projectId: projectIds[0], position: 'before', dropIndex: 0 }
        : { projectId: projectIds[projectIds.length - 1], position: 'after', dropIndex: projectIds.length };

    if (indicator) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setProjectDropIndicator(indicator);
    }
  };

  const handleProjectsPanelDrop = (e: React.DragEvent, projectIds: string[]) => {
    if (!hasProjectSortType(e) && activeProjectDragIndex === null) return;
    if (projectIds.length === 0) return;
    const dragIndex = getProjectDragIndex(e);
    if (dragIndex === null) {
      clearProjectDragState();
      return;
    }
    const target = e.target as HTMLElement;
    if (target?.closest?.('[data-project-row-index]')) return;

    const panelRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const projectedCenterY = e.clientY + projectDragCenterOffsetY;
    const dropIndex =
      projectedCenterY <= panelRect.top + panelRect.height / 2 ? 0 : projectIds.length;

    e.preventDefault();
    onReorderProjects(dragIndex, dropIndex);
    clearProjectDragState();
  };

  const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, projectId });
  };

  const startRename = (id: string, currentName: string) => {
    setEditingProjectId(id);
    setEditingName(currentName);
    setContextMenu(null);
    setIsManageMode(false);
  };

  const submitRename = () => {
    if (editingProjectId && editingName.trim()) {
      onRenameProject(editingProjectId, editingName.trim());
    }
    setEditingProjectId(null);
  };

  const submitCreate = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim());
    }
    setIsCreating(false);
    setNewProjectName('');
  };

  const submitUsername = () => {
    if (newUsername.trim() && onUpdateUsername) {
      onUpdateUsername(newUsername.trim());
    }
    setIsEditingUsername(false);
  };

  return (
    <aside
      style={{ width: `${width}px` }}
      className="flex-shrink-0 border-r border-[var(--border-main)] bg-[var(--bg-sidebar)] flex flex-col z-20 shadow-sm transition-colors duration-200 relative"
    >
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-[var(--bg-card)] border border-[var(--border-main)] shadow-xl rounded-md py-1 w-32"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full text-left px-4 py-2 text-xs hover:bg-[var(--sidebar-hover)] text-[var(--text-main)] flex items-center"
            onClick={() => startRename(contextMenu.projectId, projects.find(p => p.id === contextMenu.projectId)?.name || '')}
          >
            <Edit2 size={12} className="mr-2" /> Rename
          </button>
          <button
            className="w-full text-left px-4 py-2 text-xs hover:bg-[var(--sidebar-hover)] text-red-600 flex items-center"
            onClick={() => {
              setDeletingProjectId(contextMenu.projectId);
              setContextMenu(null);
            }}
          >
            <Trash2 size={12} className="mr-2" /> Delete
          </button>
        </div>
      )}

      <div
        onMouseDown={onStartResize}
        className="absolute top-0 -right-1 w-2 h-full cursor-col-resize z-30 group"
      >
        <div className={`w-[2px] h-full mx-auto transition-colors ${isResizing ? 'bg-[var(--accent)]' : 'group-hover:bg-[var(--accent-border)]'}`} />
      </div>

      <div className="h-16 flex items-center px-4 border-b border-[var(--border-main)] bg-[var(--bg-card)] gap-3">
        <div className="text-[var(--text-main)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 6 L12 3 H18 V18 L13 21 H7 V6" />
          </svg>
        </div>
        <h1 className="brand-wordmark text-xl font-semibold text-[var(--text-main)]">
          <span className="brand-number">410</span>
          <span className="brand-text">pages</span>
        </h1>
      </div>

      <div
        className="flex-1 overflow-y-auto p-3"
        onDragOver={(e) => handleProjectsPanelDragOver(e, projects.map(project => project.id))}
        onDrop={(e) => handleProjectsPanelDrop(e, projects.map(project => project.id))}
        onDragLeave={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < rect.left ||
            e.clientX >= rect.right ||
            e.clientY < rect.top ||
            e.clientY >= rect.bottom
          ) {
            setDragOverProjectId(null);
            if (activeProjectDragIndex !== null) setProjectDropIndicator(null);
          }
        }}
      >
        <div className="mt-2 mb-2 px-2 flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          <span>Folders</span>
          <button
            onClick={() => {
              setIsManageMode(!isManageMode);
              setDeletingProjectId(null);
            }}
            className={`p-1 rounded transition-colors ${isManageMode ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'hover:bg-[var(--sidebar-hover)] text-[var(--text-muted)]'}`}
            title="Manage Folders"
          >
            <Settings size={14} />
          </button>
        </div>

        <div
          onDragOver={(e) => handleProjectListDragOver(e, projects)}
          onDrop={(e) => handleProjectListDrop(e, projects)}
        >
          {projects.map((project, index) => {
            const showBefore =
              activeProjectDragIndex !== null &&
              projectDropIndicator?.projectId === project.id &&
              projectDropIndicator?.position === 'before';

            const showAfter =
              activeProjectDragIndex !== null &&
              projectDropIndicator?.projectId === project.id &&
              projectDropIndicator?.position === 'after';

            return (
              <div key={project.id} data-project-row-index={index}>
                {showBefore && <div className="h-[2px] mb-0.5 rounded-full bg-[var(--accent)] mx-2" />}

                {deletingProjectId === project.id ? (
                  <div className="p-3 mb-1 text-sm bg-red-50 border border-red-200 rounded-md shadow-inner">
                    <div className="text-red-800 text-xs mb-3 font-semibold text-center leading-tight">정말로 제거하시겠습니까?</div>
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setDeletingProjectId(null)}
                        className="px-3 py-1 text-xs text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-main)] rounded shadow-sm hover:bg-[var(--sidebar-hover)]"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => {
                          onDeleteProject(project.id);
                          setDeletingProjectId(null);
                        }}
                        className="px-3 py-1 text-xs text-white bg-red-600 border border-red-700 rounded shadow-sm hover:bg-red-700"
                      >
                        제거
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`
                      group flex items-center p-2 rounded-md cursor-pointer mb-1 text-sm relative
                      transition-all duration-200 border
                      ${dragOverProjectId === project.id ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] scale-[1.02] shadow-md z-10' : ''}
                      ${selectedProjectId === project.id && dragOverProjectId !== project.id ? 'bg-[var(--bg-card)] shadow-sm border-[var(--border-main)] text-[var(--accent-strong)] font-medium' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]'}
                    `}
                    onClick={() => !isManageMode && onProjectSelect(project.id)}
                    onContextMenu={(e) => handleContextMenu(e, project.id)}
                    draggable={editingProjectId !== project.id}
                    onDragStart={(e) => handleProjectDragStart(e, index)}
                    onDragOver={(e) => {
                      if (hasProjectSortType(e) || activeProjectDragIndex !== null) {
                        handleProjectRowDragOver(e, project.id, index);
                        return;
                      }
                      handleDragOver(e, project.id);
                    }}
                    onDrop={(e) => {
                      setDragOverProjectId(null);
                      if (hasProjectSortType(e) || activeProjectDragIndex !== null) {
                        handleProjectRowDrop(e, project.id, index);
                      } else {
                        handleDropOnProject(e, project.id);
                      }
                    }}
                    onDragEnd={clearProjectDragState}
                  >
                    {editingProjectId === project.id ? (
                      <div className="flex items-center w-full" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                          className="w-full text-sm border border-[var(--accent-border)] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent-ring)] bg-[var(--bg-card)]"
                        />
                        <button onClick={submitRename} className="ml-1 text-emerald-600"><Check size={14} /></button>
                      </div>
                    ) : (
                      <>
                        {isManageMode ? (
                          <GripVertical size={14} className="mr-2 text-[var(--text-muted)] cursor-grab" />
                        ) : (
                          <Folder size={16} className={`mr-2 flex-shrink-0 ${selectedProjectId === project.id ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                        )}

                        <span className="truncate flex-1">{project.name}</span>

                        {isManageMode ? (
                          <div className="flex items-center ml-2 space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startRename(project.id, project.name);
                              }}
                              className="p-1 hover:bg-[var(--sidebar-hover)] rounded text-[var(--text-muted)]"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingProjectId(project.id);
                              }}
                              className="p-1 hover:bg-red-100 rounded text-red-500"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="ml-auto text-[10px] bg-[var(--sidebar-active)] text-[var(--text-muted)] py-0.5 px-1.5 rounded-full border border-[var(--border-main)] group-hover:hidden transition-colors">
                            {project.citationIds.length}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}

                {showAfter && <div className="h-[2px] mt-0.5 rounded-full bg-[var(--accent)] mx-2" />}
              </div>
            );
          })}
        </div>

        {isCreating ? (
          <div className="mt-2 flex items-center p-2 bg-[var(--bg-card)] rounded-md border border-[var(--accent-border)] shadow-sm">
            <input
              autoFocus
              placeholder="Project Name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCreate();
                if (e.key === 'Escape') setIsCreating(false);
              }}
              className="w-full text-sm border-none p-0 focus:ring-0 placeholder:text-[var(--text-muted)]"
            />
            <button onClick={submitCreate} className="ml-2 text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded p-1"><Check size={14} /></button>
            <button onClick={() => setIsCreating(false)} className="ml-1 text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] rounded p-1"><X size={14} /></button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full mt-2 flex items-center p-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] bg-[var(--bg-card)] hover:bg-[var(--sidebar-hover)] rounded-md border border-[var(--border-main)] shadow-sm transition-all"
          >
            <Plus size={16} className="mr-2" />
            New Project
          </button>
        )}
      </div>

      <div className="p-4 border-t border-[var(--border-main)] bg-[var(--bg-sidebar)] mt-auto transition-colors duration-200">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] font-bold text-xs mr-3 border border-[var(--accent-border)] flex-shrink-0">
            {username.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            {isEditingUsername ? (
              <div className="flex items-center">
                <input
                  autoFocus
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitUsername()}
                  onBlur={() => setIsEditingUsername(false)}
                  className="w-full text-xs border border-[var(--accent-border)] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent-ring)] bg-[var(--bg-card)]"
                />
              </div>
            ) : (
              <div className="flex items-center group/user cursor-pointer" onClick={() => {
                setIsEditingUsername(true);
                setNewUsername(username);
              }}>
                <p className="text-sm font-medium text-[var(--text-main)] truncate">{username}</p>
                <Edit2 size={10} className="ml-1.5 text-[var(--text-muted)] opacity-0 group-hover/user:opacity-100 transition-opacity" />
              </div>
            )}
            <p className="text-[10px] text-[var(--text-muted)] truncate">Synced</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className="text-[var(--text-muted)] hover:text-[var(--accent)] p-1 rounded hover:bg-[var(--sidebar-hover)] transition-colors ml-2"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={onSignOut}
            className="text-[var(--text-muted)] hover:text-red-500 p-1 rounded hover:bg-[var(--sidebar-hover)] transition-colors ml-2"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
