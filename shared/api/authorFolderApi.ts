import { api } from '../../lib/api';

export const fetchAuthorFolders = (userId: string) => api.fetchAuthorFolders(userId);
export const createAuthorFolder = (userId: string, name: string) => api.createAuthorFolder(userId, name);
export const renameAuthorFolder = (userId: string, folderId: string, name: string) => api.renameAuthorFolder(userId, folderId, name);
export const deleteAuthorFolder = (userId: string, folderId: string) => api.deleteAuthorFolder(userId, folderId);
export const moveAuthorToFolder = (userId: string, authorId: string, folderId: string) => api.moveAuthorToFolder(userId, authorId, folderId);
export const removeAuthorFromFolder = (userId: string, authorId: string) => api.removeAuthorFromFolder(userId, authorId);
export const deleteAuthorCascade = (userId: string, authorId: string) => api.deleteAuthorCascade(userId, authorId);
export const previewAuthorDeletion = (userId: string, authorId: string) => api.previewAuthorDeletion(userId, authorId);
