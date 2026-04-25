import React from 'react';
import { BookOpen, Settings } from 'lucide-react';
import type { Project } from '../../../types';
import type { ProjectDropIndicator } from '../contract/projectSidebarContract';
import { ProjectSidebarRow } from './ProjectSidebarRow';
import { ProjectCreateComposer } from '../../../shared/ui/project/ProjectCreateComposer';
import {
  EditorialListButton,
  EditorialSectionLabel,
  EditorialToolbarButton,
} from '../../../shared/ui/sidebar/SidebarPrimitives';

type ProjectSidebarProjectsSectionProps = {
  projects: Project[];
  selectedProjectId: string | null;
  isManageMode: boolean;
  isCreating: boolean;
  newProjectName: string;
  editingProjectId: string | null;
  deletingProjectId: string | null;
  editingName: string;
  dragOverProjectId: string | null;
  projectDropIndicator: ProjectDropIndicator | null;
  activeProjectDragIndex: number | null;
  onNewProjectNameChange: (value: string) => void;
  onEditingNameChange: (value: string) => void;
  onToggleManageMode: () => void;
  onOpenPdfReader: () => void;
  onProjectSelect: (projectId: string) => void;
  onStartCreate: () => void;
  onSubmitCreate: () => void;
  onCancelCreate: () => void;
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
  onProjectListDragOver: (event: React.DragEvent, projects: Project[]) => void;
  onProjectListDrop: (event: React.DragEvent, projects: Project[]) => void;
  isProjectSortDrag: (event: React.DragEvent) => boolean;
};

export const ProjectSidebarProjectsSection: React.FC<ProjectSidebarProjectsSectionProps> = ({
  projects,
  selectedProjectId,
  isManageMode,
  isCreating,
  newProjectName,
  editingProjectId,
  deletingProjectId,
  editingName,
  dragOverProjectId,
  projectDropIndicator,
  activeProjectDragIndex,
  onNewProjectNameChange,
  onEditingNameChange,
  onToggleManageMode,
  onOpenPdfReader,
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
    <div className="mb-4 px-1">
      <h2 className="type-title-bounded text-[1.45rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">
        Projects
      </h2>
      <p className="mt-0.5 text-[0.88rem] text-[var(--text-secondary)]">Workspace</p>
    </div>

    <EditorialListButton
      onClick={onOpenPdfReader}
      className="mb-3 flex h-10 items-center justify-center gap-2 rounded-full border-[var(--border-main)] bg-[var(--bg-card)] px-3.5 text-[0.92rem] font-medium text-[var(--text-main)] shadow-[0_1px_2px_rgba(28,22,16,0.04)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]"
      aria-label="Open PDF Reader"
    >
      <BookOpen size={16} className="mr-1.5" />
      Read PDF
    </EditorialListButton>

    <div className="mb-2 flex items-center justify-between">
      <EditorialSectionLabel>Folders</EditorialSectionLabel>
      <EditorialToolbarButton
        onClick={onToggleManageMode}
        active={isManageMode}
        ariaLabel="Manage folders"
      >
        <Settings size={14} />
      </EditorialToolbarButton>
    </div>

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
      createLabel="New Project"
      onStart={onStartCreate}
      onChange={onNewProjectNameChange}
      onSubmit={onSubmitCreate}
      onCancel={onCancelCreate}
    />
  </>
);
