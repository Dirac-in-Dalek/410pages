import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { UseArchiveMutationsOptions } from '../contract/archiveMutationContract';
import {
  createAuthorFolder as createAuthorFolderRecord,
  deleteAuthorFolder as deleteAuthorFolderRecord,
  moveAuthorToFolder as moveAuthorToFolderRecord,
  removeAuthorFromFolder as removeAuthorFromFolderRecord,
  renameAuthorFolder as renameAuthorFolderRecord,
} from '../../../shared/api/authorFolderApi';

type Options = Pick<
  UseArchiveMutationsOptions,
  | 'session'
  | 'authors'
  | 'authorFolderMemberships'
  | 'setAuthorFolders'
  | 'setAuthorFolderMemberships'
  | 'invalidateAuthorFolderLoad'
  | 'refreshAuthorFolders'
> & { setMutationError: Dispatch<SetStateAction<string | null>> };

export function useAuthorFolderMutations({
  session,
  authors,
  authorFolderMemberships,
  setAuthorFolders,
  setAuthorFolderMemberships,
  invalidateAuthorFolderLoad = () => undefined,
  refreshAuthorFolders = () => undefined,
  setMutationError,
}: Options) {
  const authorFolderMoveInFlightRef = useRef(new Set<string>());
  const handleCreateAuthorFolder = useCallback(
    async (name: string) => {
      if (!session) return false;
      invalidateAuthorFolderLoad();
      try {
        const folder = await createAuthorFolderRecord(session.user.id, name);
        setAuthorFolders((current) => [...current, folder]);
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error creating author folder:', error);
        setMutationError('저자 폴더를 만들지 못했습니다. 같은 이름이 있는지 확인해 주세요.');
        return false;
      } finally {
        void refreshAuthorFolders();
      }
    },
    [invalidateAuthorFolderLoad, refreshAuthorFolders, session, setAuthorFolders, setMutationError]
  );

  const handleRenameAuthorFolder = useCallback(
    async (folderId: string, name: string) => {
      if (!session) return false;
      invalidateAuthorFolderLoad();
      try {
        await renameAuthorFolderRecord(session.user.id, folderId, name);
        setAuthorFolders((current) =>
          current.map((folder) => (folder.id === folderId ? { ...folder, name: name.trim() } : folder))
        );
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error renaming author folder:', error);
        setMutationError('저자 폴더 이름을 바꾸지 못했습니다. 같은 이름이 있는지 확인해 주세요.');
        return false;
      } finally {
        void refreshAuthorFolders();
      }
    },
    [invalidateAuthorFolderLoad, refreshAuthorFolders, session, setAuthorFolders, setMutationError]
  );

  const handleDeleteAuthorFolder = useCallback(
    async (folderId: string) => {
      if (!session) return false;
      invalidateAuthorFolderLoad();
      try {
        await deleteAuthorFolderRecord(session.user.id, folderId);
        setAuthorFolders((current) => current.filter((folder) => folder.id !== folderId));
        setAuthorFolderMemberships((current) =>
          current.filter((membership) => membership.folderId !== folderId)
        );
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error deleting author folder:', error);
        setMutationError('저자 폴더를 삭제하지 못했습니다. 다시 시도해 주세요.');
        return false;
      } finally {
        void refreshAuthorFolders();
      }
    },
    [
      invalidateAuthorFolderLoad,
      refreshAuthorFolders,
      session,
      setAuthorFolderMemberships,
      setAuthorFolders,
      setMutationError,
    ]
  );

  const handleMoveAuthorToFolder = useCallback(
    async (authorId: string, folderId: string) => {
      if (
        !session ||
        authors.find((author) => author.id === authorId)?.isSelf ||
        authorFolderMoveInFlightRef.current.has(authorId)
      )
        return false;
      invalidateAuthorFolderLoad();
      authorFolderMoveInFlightRef.current.add(authorId);
      const previous = authorFolderMemberships.find((membership) => membership.authorId === authorId);
      const optimistic = { authorId, folderId, createdAt: previous?.createdAt ?? Date.now() };
      setAuthorFolderMemberships((current) => [
        ...current.filter((membership) => membership.authorId !== authorId),
        optimistic,
      ]);
      try {
        const persisted = await moveAuthorToFolderRecord(session.user.id, authorId, folderId);
        setAuthorFolderMemberships((current) => [
          ...current.filter((membership) => membership.authorId !== authorId),
          persisted,
        ]);
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error moving author to folder:', error);
        setAuthorFolderMemberships((current) => [
          ...current.filter((membership) => membership.authorId !== authorId),
          ...(previous ? [previous] : []),
        ]);
        setMutationError('저자를 폴더로 이동하지 못해 이전 위치로 복원했습니다.');
        return false;
      } finally {
        authorFolderMoveInFlightRef.current.delete(authorId);
        void refreshAuthorFolders();
      }
    },
    [
      authorFolderMemberships,
      authors,
      invalidateAuthorFolderLoad,
      refreshAuthorFolders,
      session,
      setAuthorFolderMemberships,
      setMutationError,
    ]
  );

  const handleRemoveAuthorFromFolder = useCallback(
    async (authorId: string) => {
      if (
        !session ||
        authors.find((author) => author.id === authorId)?.isSelf ||
        authorFolderMoveInFlightRef.current.has(authorId)
      )
        return false;
      invalidateAuthorFolderLoad();
      authorFolderMoveInFlightRef.current.add(authorId);
      const previous = authorFolderMemberships.find((membership) => membership.authorId === authorId);
      setAuthorFolderMemberships((current) =>
        current.filter((membership) => membership.authorId !== authorId)
      );
      try {
        await removeAuthorFromFolderRecord(session.user.id, authorId);
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error removing author from folder:', error);
        if (previous) setAuthorFolderMemberships((current) => [...current, previous]);
        setMutationError('저자를 폴더 밖으로 이동하지 못해 이전 위치로 복원했습니다.');
        return false;
      } finally {
        authorFolderMoveInFlightRef.current.delete(authorId);
        void refreshAuthorFolders();
      }
    },
    [
      authorFolderMemberships,
      authors,
      invalidateAuthorFolderLoad,
      refreshAuthorFolders,
      session,
      setAuthorFolderMemberships,
      setMutationError,
    ]
  );

  return {
    handleCreateAuthorFolder,
    handleRenameAuthorFolder,
    handleDeleteAuthorFolder,
    handleMoveAuthorToFolder,
    handleRemoveAuthorFromFolder,
  };
}
