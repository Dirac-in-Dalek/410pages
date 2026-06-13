import { api } from '../../lib/api';

export type RenameAuthorResult = Awaited<ReturnType<typeof api.renameAuthor>>;

export const reorderAuthors = (userId: string, orderedAuthorIds: string[]) =>
  api.reorderAuthors(userId, orderedAuthorIds);

export const renameAuthor = (userId: string, authorId: string, name: string) =>
  api.renameAuthor(userId, authorId, name);

export const deleteAuthor = (userId: string, authorId: string) =>
  api.deleteAuthor(userId, authorId);
