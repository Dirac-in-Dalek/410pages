import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { UseArchiveMutationsOptions } from '../contract/archiveMutationContract';
import type { BookPosition, CreateChapterBlockInput } from '../../../types';
import {
  createChapterBlock as createChapterBlockRecord,
  deleteChapterBlock as deleteChapterBlockRecord,
  renameChapterBlock as renameChapterBlockRecord,
  moveChapterBlock as moveChapterBlockRecord,
} from '../../../shared/api/chapterBlockApi';
import { appendChapterBlock, deleteChapterBlock } from './archiveLocalPatch';

type Options = Pick<
  UseArchiveMutationsOptions,
  'session' | 'setChapterBlocksByBook' | 'invalidateDataLoad' | 'refreshChapterBlocks'
> & { setMutationError: Dispatch<SetStateAction<string | null>> };

export function useChapterBlockMutations({
  session,
  setChapterBlocksByBook,
  invalidateDataLoad = () => undefined,
  refreshChapterBlocks = () => undefined,
  setMutationError,
}: Options) {
  const handleCreateChapterBlock = useCallback(
    async (input: CreateChapterBlockInput) => {
      if (!session) {
        return false;
      }

      try {
        const chapterBlock = await createChapterBlockRecord(session.user.id, input);
        invalidateDataLoad();
        setChapterBlocksByBook((current) => appendChapterBlock(current, chapterBlock));
        void refreshChapterBlocks(input.bookId);
        setMutationError(null);
        return chapterBlock;
      } catch (error) {
        console.error('Error creating chapter block:', error);
        setMutationError('챕터를 저장하지 못했습니다. 입력한 제목은 그대로 유지했습니다.');
        return false;
      }
    },
    [invalidateDataLoad, refreshChapterBlocks, session, setChapterBlocksByBook, setMutationError]
  );

  const handleRenameChapterBlock = useCallback(
    async (bookId: string, id: string, label: string, depth?: number) => {
      if (!session) return false;
      try {
        const updated = await renameChapterBlockRecord(session.user.id, bookId, id, label, depth);
        invalidateDataLoad();
        setChapterBlocksByBook((current) => ({
          ...current,
          [bookId]: (current[bookId] || []).map((block) => (block.id === id ? updated : block)),
        }));
        void refreshChapterBlocks(bookId);
        setMutationError(null);
        return true;
      } catch {
        setMutationError('챕터 제목과 단계를 저장하지 못했습니다. 입력을 유지했습니다.');
        return false;
      }
    },
    [session, invalidateDataLoad, setChapterBlocksByBook, refreshChapterBlocks, setMutationError]
  );

  const handleMoveChapterBlock = useCallback(
    async (bookId: string, id: string, position: BookPosition, depth?: number) => {
      if (!session) return false;
      try {
        const updated = await moveChapterBlockRecord(session.user.id, bookId, id, position, depth);
        invalidateDataLoad();
        setChapterBlocksByBook((current) => ({
          ...current,
          [bookId]: (current[bookId] || []).map((block) => (block.id === id ? updated : block)),
        }));
        void refreshChapterBlocks(bookId);
        setMutationError(null);
        return true;
      } catch {
        setMutationError('챕터를 이동하지 못했습니다. 기존 위치를 유지했습니다.');
        return false;
      }
    },
    [session, invalidateDataLoad, setChapterBlocksByBook, refreshChapterBlocks, setMutationError]
  );

  const handleDeleteChapterBlock = useCallback(
    async (bookId: string, blockId: string) => {
      if (!session) {
        return false;
      }

      try {
        await deleteChapterBlockRecord(session.user.id, blockId);
        invalidateDataLoad();
        setChapterBlocksByBook((current) => deleteChapterBlock(current, bookId, blockId));
        void refreshChapterBlocks(bookId);
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error deleting chapter block:', error);
        setMutationError('챕터를 삭제하지 못했습니다. 다시 시도해 주세요.');
        return false;
      }
    },
    [invalidateDataLoad, refreshChapterBlocks, session, setChapterBlocksByBook, setMutationError]
  );
  return {
    handleCreateChapterBlock,
    handleRenameChapterBlock,
    handleMoveChapterBlock,
    handleDeleteChapterBlock,
  };
}
