import type { ComponentProps } from 'react';
import { MainLayout } from '../../components/MainLayout';
import { MobileLayout } from '../../components/MobileLayout';
import type {
  MainLayoutFactoryInput,
  MobileLayoutFactoryInput,
} from '../contract/appShellScreenContract';

export const createMobileLayoutProps = (
  input: MobileLayoutFactoryInput
): ComponentProps<typeof MobileLayout> => ({
  title: input.title,
  projects: input.projects,
  selectedProjectId: input.selectedProjectId,
  onProjectSelect: input.onProjectSelect,
  onCreateProject: input.onCreateProject,
  treeData: input.treeData,
  onTreeItemClick: input.onTreeItemClick,
  username: input.username,
  avatarUrl: input.avatarUrl,
  onSignOut: input.onSignOut,
  onSearch: input.onSearch,
  searchTerm: input.searchTerm,
  selectedFilter: input.selectedFilter,
  onOpenSettings: input.onOpenSettings,
});

export const createMainLayoutProps = (
  input: MainLayoutFactoryInput
): ComponentProps<typeof MainLayout> => ({
  projects: input.projects,
  onProjectSelect: input.onProjectSelect,
  selectedProjectId: input.selectedProjectId,
  onDropCitationToProject: input.onDropCitationToProject,
  onCreateProject: input.onCreateProject,
  onRenameProject: input.onRenameProject,
  onDeleteProject: input.onDeleteProject,
  onRenameAuthor: input.onRenameAuthor,
  onRenameBook: input.onRenameBook,
  onReorderProjects: input.onReorderProjects,
  treeData: input.treeData,
  onTreeItemClick: input.onTreeItemClick,
  username: input.username,
  avatarUrl: input.avatarUrl,
  onUpdateUsername: input.onUpdateUsername,
  onSignOut: input.onSignOut,
  onSearch: input.onSearch,
  searchTerm: input.searchTerm,
  selectedFilter: input.selectedFilter,
  onReorderAuthorAt: input.onReorderAuthorAt,
  onReorderBookAt: input.onReorderBookAt,
  onOpenPdfReader: input.onOpenReader,
  onOpenSettings: input.onOpenSettings,
});
