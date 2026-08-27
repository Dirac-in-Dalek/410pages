import React from 'react';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';
import type { Project } from '../../../types';
import { ProjectSidebarRow, type ProjectSidebarRowControls } from './ProjectSidebarRow';
import { ProjectCreateComposer } from '../../../shared/ui/project/ProjectCreateComposer';
import {
  EditorialToolbarButton,
} from '../../../shared/ui/sidebar/SidebarPrimitives';

type ProjectSidebarProjectsSectionProps = ProjectSidebarRowControls & {
  projects: Project[];
  isCreating: boolean;
  newProjectName: string;
  isSubmittingCreate: boolean;
  onNewProjectNameChange: (value: string) => void;
  onToggleManageMode: () => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onStartCreate: () => void;
  onSubmitCreate: () => void;
  onCancelCreate: () => void;
  onProjectListDragOver: (event: React.DragEvent, projects: Project[]) => void;
  onProjectListDrop: (event: React.DragEvent, projects: Project[]) => void;
};

export const ProjectSidebarProjectsSection: React.FC<ProjectSidebarProjectsSectionProps> = ({
  projects,
  selectedProjectId,
  isManageMode,
  isCreating,
  newProjectName,
  isSubmittingCreate,
  editingProjectId,
  deletingProjectId,
  editingName,
  dragOverProjectId,
  projectDropIndicator,
  activeProjectDragIndex,
  onNewProjectNameChange,
  onEditingNameChange,
  onToggleManageMode,
  isExpanded,
  onToggleExpanded,
  onProjectSelect,
  onStartCreate,
  onSubmitCreate,
  onCancelCreate,
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
  onProjectListDragOver,
  onProjectListDrop,
  isProjectSortDrag,
}) => (
  <>
    <div className="mb-2 flex items-center justify-between">
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={isExpanded}
        className="flex min-h-10 flex-1 items-center gap-2 rounded-lg px-1 text-left text-[0.78rem] font-semibold uppercase tracking-[0.09em] text-[var(--text-muted)] transition-[color,transform] active:scale-95"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        폴더
      </button>
      {isExpanded ? (
        <EditorialToolbarButton
          onClick={onToggleManageMode}
          active={isManageMode}
          ariaLabel="폴더 관리"
        >
          <Settings size={14} />
        </EditorialToolbarButton>
      ) : null}
    </div>

    {isExpanded ? <>
    <div
      className="space-y-0.5"
      onDragOver={(event) => onProjectListDragOver(event, projects)}
      onDrop={(event) => onProjectListDrop(event, projects)}
    >
      {projects.map((project, index) => (
        <ProjectSidebarRow
          key={project.id}
          project={project}
          index={index}
          selectedProjectId={selectedProjectId}
          isManageMode={isManageMode}
          dragOverProjectId={dragOverProjectId}
          activeProjectDragIndex={activeProjectDragIndex}
          projectDropIndicator={projectDropIndicator}
          editingProjectId={editingProjectId}
          deletingProjectId={deletingProjectId}
          editingName={editingName}
          onEditingNameChange={onEditingNameChange}
          onProjectSelect={onProjectSelect}
          onStartRename={onStartRename}
          onSubmitRename={onSubmitRename}
          onCancelRename={onCancelRename}
          onRequestDelete={onRequestDelete}
          onCancelDelete={onCancelDelete}
          onConfirmDelete={onConfirmDelete}
          onContextMenu={onContextMenu}
          onCitationDragOver={onCitationDragOver}
          onProjectDrop={onProjectDrop}
          onProjectDragStart={onProjectDragStart}
          onProjectRowDragOver={onProjectRowDragOver}
          onProjectRowDrop={onProjectRowDrop}
          onProjectDragEnd={onProjectDragEnd}
          isProjectSortDrag={isProjectSortDrag}
        />
      ))}
    </div>

    <ProjectCreateComposer
      isCreating={isCreating}
      value={newProjectName}
      createLabel="새 폴더"
      onStart={onStartCreate}
      onChange={onNewProjectNameChange}
      onSubmit={onSubmitCreate}
      onCancel={onCancelCreate}
      isSubmitting={isSubmittingCreate}
    />
    </> : null}
  </>
);
