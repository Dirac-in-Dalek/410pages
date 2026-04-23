import { api } from '../../lib/api';
import type { CreateChapterBlockInput } from '../../types';

export const fetchChapterBlocks = (userId: string, bookId: string) =>
  api.fetchChapterBlocks(userId, bookId);

export const createChapterBlock = (userId: string, input: CreateChapterBlockInput) =>
  api.createChapterBlock(userId, input);

export const deleteChapterBlock = (userId: string, blockId: string) =>
  api.deleteChapterBlock(userId, blockId);
