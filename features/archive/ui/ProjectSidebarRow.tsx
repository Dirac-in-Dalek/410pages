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
            type-label-bounded group relative mb-1 flex cursor-pointer items-center rounded-[0.9rem] border px-3 py-2 transition-all duration-200 active:scale-[0.985]
            ${isManageMode && editingProjectId !== project.id ? 'flex-wrap items-start' : ''}
            ${dragOverProjectId === project.id ? 'z-10 scale-[1.01] border-[var(--accent-border)] bg-[var(--accent-soft)] shadow-[0_8px_18px_rgba(209,15,37,0.08)]' : ''}
            ${selectedProjectId === project.id && dragOverProjectId !== project.id ? 'border-[var(--border-main)] bg-[var(--sidebar-active)] text-[var(--text-main)] shadow-[0_1px_2px_rgba(28,22,16,0.06)]' : 'border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]'}
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
                <GripVertical size={13} className="mr-2.5 cursor-grab text-[var(--text-muted)]" />
              ) : (
                <Folder
                  size={16}
                  className={`mr-2.5 flex-shrink-0 ${selectedProjectId === project.id ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}
                />
              )}

              <span className="min-w-0 flex-1 truncate text-[0.93rem] leading-none">
                {project.name}
              </span>

              {isManageMode ? (
                <div className="mt-2 flex w-full justify-end gap-1">
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
              ) : null}
            </>
          )}
        </div>
      )}

      {showAfter && <div className="h-[2px] mt-0.5 rounded-full bg-[var(--accent)] mx-2" />}
    </div>
  );
};
