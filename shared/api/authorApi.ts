import { api } from '../../lib/api';

export const fetchAuthors = (userId: string) => api.fetchAuthors(userId);

export const createAuthor = (userId: string, name: string) =>
  api.createAuthor(userId, name);

export const reorderAuthors = (userId: string, orderedAuthorIds: string[]) =>
  api.reorderAuthors(userId, orderedAuthorIds);

export const renameAuthor = (userId: string, authorId: string, name: string) =>
  api.renameAuthor(userId, authorId, name);
