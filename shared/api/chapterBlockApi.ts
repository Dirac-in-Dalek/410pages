import { api } from '../../lib/api';
import type { CreateChapterBlockInput } from '../../types';

export const fetchChapterBlocks = (userId: string, bookId: string) =>
  api.fetchChapterBlocks(userId, bookId);

export const createChapterBlock = (userId: string, input: CreateChapterBlockInput) =>
  api.createChapterBlock(userId, input);

export const deleteChapterBlock = (userId: string, blockId: string) =>
  api.deleteChapterBlock(userId, blockId);

export const renameChapterBlock = (userId: string, bookId: string, id: string, label: string) =>
  api.renameChapterBlock(userId, bookId, id, label);

export const moveChapterBlock = (userId: string, bookId: string, id: string, createdAtSort: number) =>
  api.moveChapterBlock(userId, bookId, id, createdAtSort);
