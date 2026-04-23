import { api } from '../../lib/api';

export const fetchProjects = () => api.fetchProjects();

export const createProject = (userId: string, name: string) =>
  api.createProject(userId, name);

export const renameProject = (userId: string, projectId: string, name: string) =>
  api.renameProject(userId, projectId, name);

export const deleteProject = (userId: string, projectId: string) =>
  api.deleteProject(userId, projectId);

export const reorderProjects = (userId: string, orderedProjectIds: string[]) =>
  api.reorderProjects(userId, orderedProjectIds);

export const addCitationToProject = (userId: string, projectId: string, citationId: string) =>
  api.addCitationToProject(userId, projectId, citationId);

export const addCitationsToProject = (
  userId: string,
  projectId: string,
  citationIds: string[]
) => api.addCitationsToProject(userId, projectId, citationIds);
