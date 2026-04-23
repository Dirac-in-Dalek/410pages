import React from 'react';
import { Edit2, Folder, GripVertical, Trash2 } from 'lucide-react';
import type { Project } from '../../../types';
import type { ProjectDropIndicator } from '../contract/projectSidebarContract';
import {
  EditorialDangerConfirm,
  EditorialIconActionButton,
  EditorialInlineRenameField,
} from '../../../shared/ui/sidebar/SidebarControls';

type ProjectSidebarRowProps = {
  project: Project;
  index: number;
  selectedProjectId: string | null;
  isManageMode: boolean;
  dragOverProjectId: string | null;
  activeProjectDragIndex: number | null;
  projectDropIndicator: ProjectDropIndicator | null;
  editingProjectId: string | null;
  deletingProjectId: string | null;
  editingName: string;
  onEditingNameChange: (value: string) => void;
  onProjectSelect: (projectId: string) => void;
  onStartRename: (id: string, currentName: string) => void;
  onSubmitRename: () => void;
  onCancelRename: () => void;
  onRequestDelete: (projectId: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (projectId: string) => void;
  onContextMenu: (event: React.MouseEvent, projectId: string) => void;
  onCitationDragOver: (event: React.DragEvent, projectId: string) => void;
  onProjectDrop: (event: React.DragEvent, projectId: string) => void;
  onProjectDragStart: (event: React.DragEvent, index: number) => void;
  onProjectRowDragOver: (event: React.DragEvent, projectId: string, index: number) => void;
  onProjectRowDrop: (event: React.DragEvent, projectId: string, index: number) => void;
  onProjectDragEnd: () => void;
  isProjectSortDrag: (event: React.DragEvent) => boolean;
};

export const ProjectSidebarRow: React.FC<ProjectSidebarRowProps> = ({
  project,
  index,
  selectedProjectId,
  isManageMode,
  dragOverProjectId,
  activeProjectDragIndex,
  projectDropIndicator,
  editingProjectId,
  deletingProjectId,
  editingName,
  onEditingNameChange,
  onProjectSelect,
  onStartRename,
  onSubmitRename,
  onCancelRename,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onContextMenu,
  onCitationDragOver,
  onProjectDrop,
  onProjectDragStart,
  onProjectRowDragOver,
  onProjectRowDrop,
  onProjectDragEnd,
  isProjectSortDrag,
}) => {
  const showBefore =
    activeProjectDragIndex !== null &&
    projectDropIndicator?.projectId === project.id &&
    projectDropIndicator.position === 'before';

  const showAfter =
    activeProjectDragIndex !== null &&
    projectDropIndicator?.projectId === project.id &&
    projectDropIndicator.position === 'after';

  return (
    <div data-project-row-index={index}>
      {showBefore && <div className="h-[2px] mb-0.5 rounded-full bg-[var(--accent)] mx-2" />}

      {deletingProjectId === project.id ? (
        <EditorialDangerConfirm
          message="Are you sure you want to remove this folder?"
          confirmLabel="Remove"
          onCancel={onCancelDelete}
          onConfirm={() => onConfirmDelete(project.id)}
        />
      ) : (
        <div
          className={`
            type-label-bounded group flex items-center px-2 py-1.5 rounded-md cursor-pointer mb-1 relative
            transition-all duration-200 border
            ${dragOverProjectId === project.id ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] scale-[1.02] shadow-md z-10' : ''}
            ${selectedProjectId === project.id && dragOverProjectId !== project.id ? 'bg-[var(--bg-card)] shadow-sm border-[var(--border-main)] text-[var(--accent-strong)] font-medium' : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]'}
          `}
          onClick={() => !isManageMode && onProjectSelect(project.id)}
          onContextMenu={(event) => onContextMenu(event, project.id)}
          draggable={editingProjectId !== project.id}
          onDragStart={(event) => onProjectDragStart(event, index)}
          onDragOver={(event) => {
            if (isProjectSortDrag(event)) {
              onProjectRowDragOver(event, project.id, index);
              return;
            }
            onCitationDragOver(event, project.id);
          }}
          onDrop={(event) => {
            if (isProjectSortDrag(event)) {
              onProjectRowDrop(event, project.id, index);
              return;
            }
            onProjectDrop(event, project.id);
          }}
          onDragEnd={onProjectDragEnd}
        >
          {editingProjectId === project.id ? (
            <EditorialInlineRenameField
              value={editingName}
              onChange={onEditingNameChange}
              onSubmit={onSubmitRename}
              onCancel={onCancelRename}
              placeholder="Project name"
            />
          ) : (
            <>
              {isManageMode ? (
                <GripVertical size={14} className="mr-2 text-[var(--text-muted)] cursor-grab" />
              ) : (
                <Folder
                  size={16}
                  className={`mr-2 flex-shrink-0 ${selectedProjectId === project.id ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
                />
              )}

              <span className="truncate flex-1">{project.name}</span>

              {isManageMode ? (
                <div className="flex items-center ml-2 space-x-1">
                  <EditorialIconActionButton
                    onClick={(event) => {
                      event.stopPropagation();
                      onStartRename(project.id, project.name);
                    }}
                    ariaLabel="Rename project"
                  >
                    <Edit2 size={12} />
                  </EditorialIconActionButton>
                  <EditorialIconActionButton
                    onClick={(event) => {
                      event.stopPropagation();
                      onRequestDelete(project.id);
                    }}
                    ariaLabel="Delete project"
                    danger
                  >
                    <Trash2 size={12} />
                  </EditorialIconActionButton>
                </div>
              ) : (
                <span className="type-body-muted-bounded ml-auto bg-[var(--sidebar-active)] text-[var(--text-muted)] py-0.5 px-1.5 rounded-full border border-[var(--border-main)] group-hover:hidden transition-colors">
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
};
