import { useCallback } from 'react';
import type { CreateBookInput } from '../../../types';
import type { UseArchiveMutationsOptions, RenameAuthorMutationResult } from '../contract/archiveMutationContract';
import { createAuthor as createAuthorRecord, renameAuthor as renameAuthorRecord } from '../../../shared/api/authorApi';
import { createBook as createBookRecord, renameBook as renameBookRecord, type RenameBookResult } from '../../../shared/api/bookApi';
import { appendBookSource, applyRenameAuthorToCitations, applyRenameAuthorToBooks, applyRenameBookToCitations, applyRenameBookToBooks } from './archiveLocalPatch';
import { readCitationDrafts, storeCitationDraft } from './citationDraftStorage';
import { moveBookMemoDraftAfterMerge } from './bookMemoDraftStorage';

type LibrarySourceOptions = Required<Pick<UseArchiveMutationsOptions, 'session' | 'books' | 'setBooks' | 'setAuthors' | 'setCitations' | 'setAuthorFolderMemberships' | 'invalidateDataLoad' | 'invalidateAuthorFolderLoad' | 'refreshAuthorFolders'>> & { setMutationError: (error: string | null) => void };

// Author/book identity changes reconcile the existing stores; this hook owns no state.
export function useLibrarySourceMutations({ session, books, setBooks, setAuthors, setCitations, setAuthorFolderMemberships, invalidateDataLoad, invalidateAuthorFolderLoad, refreshAuthorFolders, setMutationError }: LibrarySourceOptions) {
const handleCreateBook = useCallback(
    async (input: CreateBookInput) => {
      if (!session) {
        return undefined;
      }

      const title = input.title.trim();
      if (!title) {
        return undefined;
      }

      try {
        const newBook = await createBookRecord(session.user.id, {
          authorId: input.authorId,
          title,
        });
        invalidateDataLoad();
        setBooks((current) => appendBookSource(current, newBook));
        setMutationError(null);
        return newBook;
      } catch (error) {
        console.error('Error creating book:', error);
        setMutationError('새 책을 만들지 못했습니다. 입력한 제목은 그대로 유지했습니다.');
        return undefined;
      }
    },
    [invalidateDataLoad, session, setBooks]
  );

const handleCreateAuthor = useCallback(
    async (name: string) => {
      if (!session) return undefined;
      const trimmed = name.trim();
      if (!trimmed) return undefined;

      try {
        const author = await createAuthorRecord(session.user.id, trimmed);
        invalidateDataLoad();
        setAuthors((current) => {
          const existingIndex = current.findIndex((entry) => entry.id === author.id);
          if (existingIndex < 0) return [author, ...current];
          return current.map((entry) => (entry.id === author.id ? author : entry));
        });
        setMutationError(null);
        return author;
      } catch (error) {
        console.error('Error creating author:', error);
        setMutationError('저자를 추가하지 못했습니다. 입력한 이름은 그대로 유지했습니다.');
        return undefined;
      }
    },
    [invalidateDataLoad, session, setAuthors]
  );

const handleRenameAuthor = useCallback(
    async (authorId: string, name: string) => {
      if (!session) {
        return;
      }

      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }

      invalidateAuthorFolderLoad();

      try {
        const result = (await renameAuthorRecord(
          session.user.id,
          authorId,
          trimmed
        )) as RenameAuthorMutationResult;
        const didPersistBookMemoDrafts = result.bookMerges.reduce((didPersist, merge) => {
          const targetMemo = books.find((book) => book.id === merge.toBookId)?.memo ?? merge.toBookMemo;
          const sourceMemo = books.find((book) => book.id === merge.fromBookId)?.memo ?? '';
          return moveBookMemoDraftAfterMerge(
            session.user.id,
            merge.fromBookId,
            merge.toBookId,
            targetMemo,
            sourceMemo
          ) && didPersist;
        }, true);
        invalidateDataLoad();
        setCitations((current) => applyRenameAuthorToCitations(current, result));
        setAuthorFolderMemberships((current) => {
          if (!result.merged || result.fromAuthorId === result.authorId) return current;
          return [
            ...current.filter((membership) =>
              membership.authorId !== result.fromAuthorId && membership.authorId !== result.authorId
            ),
            ...(result.folderId ? [{ authorId: result.authorId, folderId: result.folderId, createdAt: Date.now() }] : []),
          ];
        });
        setAuthors((current) => current
          .filter((author) => author.id !== result.fromAuthorId || author.id === result.authorId)
          .map((author) => author.id === result.authorId
            ? {
                ...author,
                name: result.authorName,
                sortIndex: result.authorSortIndex,
                isSelf: result.isSelf,
              }
            : author));
        setBooks((current) => applyRenameAuthorToBooks(current, result));
        const didPersistDrafts = readCitationDrafts(session.user.id)
          .map((draft) => applyRenameAuthorToCitations([draft], result)[0])
          .reduce((didPersist, draft) => storeCitationDraft(session.user.id, draft) && didPersist, true);
        setMutationError(didPersistDrafts && didPersistBookMemoDrafts
          ? null
          : '브라우저의 임시 초안을 병합된 저자와 책으로 옮기지 못했습니다. 복사해 보관해 주세요.');
        return result;
      } catch (error) {
        console.error('Error renaming author:', error);
        setMutationError('저자 이름을 저장하지 못했습니다. 입력한 이름은 그대로 유지했습니다.');
      } finally {
        void refreshAuthorFolders();
      }
    },
    [books, invalidateAuthorFolderLoad, invalidateDataLoad, refreshAuthorFolders, session, setAuthorFolderMemberships, setAuthors, setBooks, setCitations]
  );

const handleRenameBook = useCallback(
    async (bookId: string, name: string) => {
      if (!session) {
        return;
      }

      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }

      try {
        const result = (await renameBookRecord(session.user.id, bookId, trimmed)) as RenameBookResult;
        const targetMemo = books.find((book) => book.id === result.bookId)?.memo ?? result.bookMemo;
        const sourceMemo = books.find((book) => book.id === result.fromBookId)?.memo ?? '';
        const didPersistBookMemoDraft = moveBookMemoDraftAfterMerge(
          session.user.id,
          result.fromBookId,
          result.bookId,
          targetMemo,
          sourceMemo
        );
        invalidateDataLoad();
        setCitations((current) => applyRenameBookToCitations(current, result));
        setBooks((current) => applyRenameBookToBooks(current, result));
        const didPersistDrafts = readCitationDrafts(session.user.id)
          .map((draft) => applyRenameBookToCitations([draft], result)[0])
          .reduce((didPersist, draft) => storeCitationDraft(session.user.id, draft) && didPersist, true);
        setMutationError(didPersistDrafts && didPersistBookMemoDraft
          ? null
          : '브라우저의 임시 초안을 병합된 책으로 옮기지 못했습니다. 복사해 보관해 주세요.');
        return result;
      } catch (error) {
        console.error('Error renaming book:', error);
        setMutationError('책 이름을 저장하지 못했습니다. 입력한 이름은 그대로 유지했습니다.');
      }
    },
    [books, invalidateDataLoad, session, setBooks, setCitations]
  );
  return { handleCreateBook, handleCreateAuthor, handleRenameAuthor, handleRenameBook };
}
