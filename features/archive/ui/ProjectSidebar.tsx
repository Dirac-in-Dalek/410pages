import React, { useEffect, useRef, useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { Project } from '../../../types';
import type {
  ProjectDropIndicator,
  ProjectSidebarProps,
} from '../contract/projectSidebarContract';
import {
  buildProjectListIndicator,
  buildProjectPanelIndicator,
  getProjectDropPosition,
  hasProjectSortType,
  PROJECT_SORT_MIME,
  resolveProjectDragIndex,
} from '../../../shared/lib/projectSidebar';
import { ProjectSidebarProjectsSection } from './ProjectSidebarProjectsSection';

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  selectedProjectId,
  onProjectSelect,
  onDropCitationToProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onReorderProjects,
  onOpenPdfReader,
  width,
  isResizing,
  onStartResize,
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; projectId: string } | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isManageMode, setIsManageMode] = useState(false);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [projectDropIndicator, setProjectDropIndicator] = useState<ProjectDropIndicator | null>(null);
  const [activeProjectDragIndex, setActiveProjectDragIndex] = useState<number | null>(null);
  const [projectDragCenterOffsetY, setProjectDragCenterOffsetY] = useState(0);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleCitationDragOver = (event: React.DragEvent, projectId?: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (projectId && !isManageMode && dragOverProjectId !== projectId) {
      setDragOverProjectId(projectId);
    }
  };

  const handleDropOnProject = (event: React.DragEvent, projectId: string) => {
    event.preventDefault();
    setDragOverProjectId(null);

    try {
      const rawData = event.dataTransfer.getData('application/json');
      if (!rawData) return;

      const data = JSON.parse(rawData);
      if (data.type === 'citation') {
        onDropCitationToProject(projectId, data.id);
      }
    } catch (error) {
      console.error('Failed to parse drop data', error);
    }
  };

  const handleProjectDragStart = (event: React.DragEvent, index: number) => {
    const row = event.currentTarget as HTMLElement;
    const rect = row.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    event.dataTransfer.setData(PROJECT_SORT_MIME, index.toString());
    event.dataTransfer.effectAllowed = 'move';
    setActiveProjectDragIndex(index);
    setProjectDragCenterOffsetY(centerY - event.clientY);
    setProjectDropIndicator(null);
    setDragOverProjectId(null);
  };

  const getProjectDragIndex = (event: React.DragEvent) =>
    resolveProjectDragIndex(event.dataTransfer.getData.bind(event.dataTransfer), activeProjectDragIndex);

  const clearProjectDragState = () => {
    setProjectDropIndicator(null);
    setActiveProjectDragIndex(null);
    setProjectDragCenterOffsetY(0);
  };

  const isProjectSortDrag = (event: React.DragEvent) =>
    hasProjectSortType(Array.from(event.dataTransfer.types ?? [])) || activeProjectDragIndex !== null;

  const handleProjectRowDragOver = (event: React.DragEvent, projectId: string, index: number) => {
    if (!isProjectSortDrag(event)) return;
    const dragIndex = getProjectDragIndex(event);
    if (dragIndex === null) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';

    const position = getProjectDropPosition(event.clientY, projectDragCenterOffsetY, (event.currentTarget as HTMLElement).getBoundingClientRect());
    const dropIndex = position === 'before' ? index : index + 1;
    setProjectDropIndicator({ projectId, position, dropIndex });
  };

  const handleProjectRowDrop = (event: React.DragEvent, projectId: string, index: number) => {
    if (!isProjectSortDrag(event)) return;
    const dragIndex = getProjectDragIndex(event);
    if (dragIndex === null) {
      clearProjectDragState();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const position = getProjectDropPosition(event.clientY, projectDragCenterOffsetY, (event.currentTarget as HTMLElement).getBoundingClientRect());
    const dropIndex = position === 'before' ? index : index + 1;
    if (dragIndex !== dropIndex) {
      onReorderProjects(dragIndex, dropIndex);
    }
    clearProjectDragState();
  };

  const handleProjectListDragOver = (event: React.DragEvent, listProjects: Project[]) => {
    if (!isProjectSortDrag(event) || listProjects.length === 0) return;
    const dragIndex = getProjectDragIndex(event);
    if (dragIndex === null) return;

    const container = event.currentTarget as HTMLElement;
    const rowElements = Array.from(container.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node.dataset.projectRowIndex !== undefined
    );
    const indicator = buildProjectListIndicator(
      rowElements.map((row, index) => {
        const rect = row.getBoundingClientRect();
        return { projectId: listProjects[index].id, top: rect.top, height: rect.height };
      }),
      event.clientY,
      projectDragCenterOffsetY
    );
    if (!indicator) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setProjectDropIndicator(indicator);
  };

  const handleProjectListDrop = (event: React.DragEvent, listProjects: Project[]) => {
    if (!isProjectSortDrag(event) || listProjects.length === 0) return;
    const dragIndex = getProjectDragIndex(event);
    if (dragIndex === null) {
      clearProjectDragState();
      return;
    }

    const container = event.currentTarget as HTMLElement;
    const rowElements = Array.from(container.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node.dataset.projectRowIndex !== undefined
    );
    const indicator =
      projectDropIndicator ??
      buildProjectListIndicator(
        rowElements.map((row, index) => {
          const rect = row.getBoundingClientRect();
          return { projectId: listProjects[index].id, top: rect.top, height: rect.height };
        }),
        event.clientY,
        projectDragCenterOffsetY
      );
    if (!indicator) {
      clearProjectDragState();
      return;
    }

    event.preventDefault();
    onReorderProjects(dragIndex, indicator.dropIndex);
    clearProjectDragState();
  };

  const handleProjectsPanelDragOver = (event: React.DragEvent, projectIds: string[]) => {
    if (!isProjectSortDrag(event) || projectIds.length === 0) return;
    const dragIndex = getProjectDragIndex(event);
    if (dragIndex === null) return;
    const target = event.target as HTMLElement;
    if (target?.closest?.('[data-project-row-index]')) return;

    const panelRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const indicator = buildProjectPanelIndicator({
      projectIds,
      clientY: event.clientY,
      centerOffsetY: projectDragCenterOffsetY,
      top: panelRect.top,
      height: panelRect.height,
    });
    if (!indicator) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setProjectDropIndicator(indicator);
  };

  const handleProjectsPanelDrop = (event: React.DragEvent, projectIds: string[]) => {
    if (!isProjectSortDrag(event) || projectIds.length === 0) return;
    const dragIndex = getProjectDragIndex(event);
    if (dragIndex === null) {
      clearProjectDragState();
      return;
    }
    const target = event.target as HTMLElement;
    if (target?.closest?.('[data-project-row-index]')) return;

    const panelRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const indicator = buildProjectPanelIndicator({
      projectIds,
      clientY: event.clientY,
      centerOffsetY: projectDragCenterOffsetY,
      top: panelRect.top,
      height: panelRect.height,
    });
    if (!indicator) {
      clearProjectDragState();
      return;
    }

    event.preventDefault();
    onReorderProjects(dragIndex, indicator.dropIndex);
    clearProjectDragState();
  };

  const handleContextMenu = (event: React.MouseEvent, projectId: string) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, projectId });
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

  const cancelRename = () => {
    setEditingProjectId(null);
    setEditingName('');
  };

  const submitCreate = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim());
    }
    setIsCreating(false);
    setNewProjectName('');
  };

  return (
    <aside
      style={{ width: `${width}px` }}
      className="relative z-20 flex flex-shrink-0 flex-col border-r border-[var(--border-main)] bg-[var(--bg-sidebar)] shadow-[var(--shadow-sidebar)] transition-colors duration-200"
    >
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-[var(--bg-card)] border border-[var(--border-main)] shadow-[var(--shadow-popover)] rounded-md py-1 w-32"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="type-label-bounded w-full text-left px-4 py-2 hover:bg-[var(--sidebar-hover)] text-[var(--text-main)] flex items-center"
            onClick={() =>
              startRename(
                contextMenu.projectId,
                projects.find((project) => project.id === contextMenu.projectId)?.name || ''
              )
            }
          >
            <Edit2 size={12} className="mr-2" /> Rename
          </button>
          <button
            className="type-label-bounded w-full text-left px-4 py-2 hover:bg-[var(--sidebar-hover)] text-red-600 flex items-center"
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

      <div
        className="flex-1 overflow-y-auto px-3 py-4"
        onDragOver={(event) => handleProjectsPanelDragOver(event, projects.map((project) => project.id))}
        onDrop={(event) => handleProjectsPanelDrop(event, projects.map((project) => project.id))}
        onDragLeave={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX >= rect.right ||
            event.clientY < rect.top ||
            event.clientY >= rect.bottom
          ) {
            setDragOverProjectId(null);
            if (activeProjectDragIndex !== null) setProjectDropIndicator(null);
          }
        }}
      >
        <ProjectSidebarProjectsSection
          projects={projects}
          selectedProjectId={selectedProjectId}
          isManageMode={isManageMode}
          isCreating={isCreating}
          newProjectName={newProjectName}
          editingProjectId={editingProjectId}
          deletingProjectId={deletingProjectId}
          editingName={editingName}
          dragOverProjectId={dragOverProjectId}
          projectDropIndicator={projectDropIndicator}
          activeProjectDragIndex={activeProjectDragIndex}
          onNewProjectNameChange={setNewProjectName}
          onEditingNameChange={setEditingName}
          onToggleManageMode={() => {
            setIsManageMode((value) => !value);
            setDeletingProjectId(null);
          }}
          onOpenPdfReader={onOpenPdfReader}
          onProjectSelect={onProjectSelect}
          onStartCreate={() => setIsCreating(true)}
          onSubmitCreate={submitCreate}
          onCancelCreate={() => {
            setIsCreating(false);
            setNewProjectName('');
          }}
          onStartRename={startRename}
          onSubmitRename={submitRename}
          onCancelRename={cancelRename}
          onRequestDelete={setDeletingProjectId}
          onCancelDelete={() => setDeletingProjectId(null)}
          onConfirmDelete={(projectId) => {
            onDeleteProject(projectId);
            setDeletingProjectId(null);
          }}
          onContextMenu={handleContextMenu}
          onCitationDragOver={handleCitationDragOver}
          onProjectDrop={handleDropOnProject}
          onProjectDragStart={handleProjectDragStart}
          onProjectRowDragOver={handleProjectRowDragOver}
          onProjectRowDrop={handleProjectRowDrop}
          onProjectDragEnd={clearProjectDragState}
          onProjectListDragOver={handleProjectListDragOver}
          onProjectListDrop={handleProjectListDrop}
          isProjectSortDrag={isProjectSortDrag}
        />
      </div>

    </aside>
  );
};
