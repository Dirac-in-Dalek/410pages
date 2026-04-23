import { api } from '../../lib/api';

export type RenameBookResult = Awaited<ReturnType<typeof api.renameBook>>;

export const reorderBooks = (userId: string, authorId: string, orderedBookIds: string[]) =>
  api.reorderBooks(userId, authorId, orderedBookIds);

export const renameBook = (userId: string, bookId: string, name: string) =>
  api.renameBook(userId, bookId, name);
