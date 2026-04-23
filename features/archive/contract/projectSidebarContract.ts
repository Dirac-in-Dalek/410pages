import type { Project } from '../../../types';

export type ProjectDropIndicator = {
  projectId: string;
  position: 'before' | 'after';
  dropIndex: number;
};

export interface ProjectSidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onDropCitationToProject: (projectId: string, citationId: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onReorderProjects: (dragIndex: number, hoverIndex: number) => void;
  username?: string;
  avatarUrl?: string | null;
  onSignOut?: () => void;
  onOpenPdfReader: () => void;
  onOpenSettings: () => void;
  width: number;
  isResizing: boolean;
  onStartResize: () => void;
}
