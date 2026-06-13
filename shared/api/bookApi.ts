import { api } from '../../lib/api';
import type { CreateBookInput } from '../../types';

export type RenameBookResult = Awaited<ReturnType<typeof api.renameBook>>;

export const fetchBooks = (userId: string) => api.fetchBooks(userId);

export const createBook = (userId: string, input: CreateBookInput) =>
  api.createBook(userId, input);

export const reorderBooks = (userId: string, authorId: string, orderedBookIds: string[]) =>
  api.reorderBooks(userId, authorId, orderedBookIds);

export const renameBook = (userId: string, bookId: string, name: string) =>
  api.renameBook(userId, bookId, name);

export const deleteBook = (userId: string, bookId: string) =>
  api.deleteBook(userId, bookId);
