import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { UseArchiveMutationsOptions } from '../contract/archiveMutationContract';
import type { TextFormatRange } from '../../../types';
import {
  deleteAuthorCascade as deleteAuthorCascadeRecord,
  previewAuthorDeletion as previewAuthorDeletionRecord,
} from '../../../shared/api/authorFolderApi';
import {
  deleteBookCascade as deleteBookCascadeRecord,
  previewBookDeletion as previewBookDeletionRecord,
  updateBookMemo as updateBookMemoRecord,
} from '../../../shared/api/bookApi';

type Options = Pick<
  UseArchiveMutationsOptions,
  | 'session'
  | 'authors'
  | 'books'
  | 'citations'
  | 'setAuthors'
  | 'setBooks'
  | 'setCitations'
  | 'setProjects'
  | 'setChapterBlocksByBook'
  | 'setAuthorFolderMemberships'
  | 'invalidateDataLoad'
  | 'invalidateAuthorFolderLoad'
  | 'refreshAuthorFolders'
> & { setMutationError: Dispatch<SetStateAction<string | null>> };

export function useLibraryRecordMutations({
  session,
  authors,
  books,
  citations,
  setAuthors,
  setBooks,
  setCitations,
  setProjects,
  setChapterBlocksByBook,
  setAuthorFolderMemberships,
  invalidateDataLoad = () => undefined,
  invalidateAuthorFolderLoad = () => undefined,
  refreshAuthorFolders = () => undefined,
  setMutationError,
}: Options) {
  const handleDeleteAuthorCascade = useCallback(
    async (authorId: string) => {
      if (!session || authors.find((author) => author.id === authorId)?.isSelf) return undefined;
      const sourceBookIds = new Set(
        books.filter((book) => book.authorId === authorId).map((book) => book.id)
      );
      if (
        citations.some(
          (citation) =>
            citation.saveStatus &&
            (citation.authorId === authorId || (citation.bookId ? sourceBookIds.has(citation.bookId) : false))
        )
      ) {
        setMutationError(
          '저장 중이거나 저장에 실패한 문장이 있습니다. 저장을 완료한 뒤 저자를 삭제해 주세요.'
        );
        return undefined;
      }
      invalidateAuthorFolderLoad();
      try {
        const result = await deleteAuthorCascadeRecord(session.user.id, authorId);
        const deletedBookIds = new Set(result.deletedBookIds);
        const deletedCitationIds = new Set(
          citations
            .filter(
              (citation) =>
                citation.authorId === authorId || (citation.bookId && deletedBookIds.has(citation.bookId))
            )
            .map((citation) => citation.id)
        );
        invalidateDataLoad();
        setAuthors((current) => current.filter((author) => author.id !== authorId));
        setBooks((current) => current.filter((book) => !deletedBookIds.has(book.id)));
        setCitations((current) => current.filter((citation) => !deletedCitationIds.has(citation.id)));
        setProjects((current) =>
          current.map((project) => ({
            ...project,
            citationIds: project.citationIds.filter((citationId) => !deletedCitationIds.has(citationId)),
          }))
        );
        setChapterBlocksByBook((current) =>
          Object.fromEntries(Object.entries(current).filter(([bookId]) => !deletedBookIds.has(bookId)))
        );
        setAuthorFolderMemberships((current) =>
          current.filter((membership) => membership.authorId !== authorId)
        );
        setMutationError(null);
        return result;
      } catch (error) {
        console.error('Error deleting author:', error);
        setMutationError('저자와 기록을 삭제하지 못했습니다. 데이터는 그대로 유지했습니다.');
        return undefined;
      } finally {
        void refreshAuthorFolders();
      }
    },
    [
      authors,
      books,
      citations,
      invalidateAuthorFolderLoad,
      invalidateDataLoad,
      refreshAuthorFolders,
      session,
      setAuthorFolderMemberships,
      setAuthors,
      setBooks,
      setChapterBlocksByBook,
      setCitations,
      setMutationError,
      setProjects,
    ]
  );

  const handlePreviewAuthorDeletion = useCallback(
    async (authorId: string) => {
      if (!session || authors.find((author) => author.id === authorId)?.isSelf) return undefined;
      try {
        const preview = await previewAuthorDeletionRecord(session.user.id, authorId);
        setMutationError(null);
        return preview;
      } catch (error) {
        console.error('Error previewing author deletion:', error);
        setMutationError('삭제될 기록 수를 확인하지 못했습니다. 다시 시도해 주세요.');
        return undefined;
      }
    },
    [authors, session, setMutationError]
  );

  const handleDeleteBookCascade = useCallback(
    async (bookId: string) => {
      if (!session || !books.some((book) => book.id === bookId)) return undefined;
      if (citations.some((citation) => citation.bookId === bookId && citation.saveStatus)) {
        setMutationError('저장 중이거나 저장에 실패한 문장이 있습니다. 저장을 완료한 뒤 책을 삭제해 주세요.');
        return undefined;
      }
      try {
        const result = await deleteBookCascadeRecord(session.user.id, bookId);
        const deletedCitationIds = new Set(
          citations.filter((citation) => citation.bookId === bookId).map((citation) => citation.id)
        );
        invalidateDataLoad();
        setBooks((current) => current.filter((book) => book.id !== bookId));
        setCitations((current) => current.filter((citation) => !deletedCitationIds.has(citation.id)));
        setProjects((current) =>
          current.map((project) => ({
            ...project,
            citationIds: project.citationIds.filter((citationId) => !deletedCitationIds.has(citationId)),
          }))
        );
        setChapterBlocksByBook((current) =>
          Object.fromEntries(Object.entries(current).filter(([currentBookId]) => currentBookId !== bookId))
        );
        setMutationError(null);
        return result;
      } catch (error) {
        console.error('Error deleting book:', error);
        setMutationError('책과 기록을 삭제하지 못했습니다. 데이터는 그대로 유지했습니다.');
        return undefined;
      }
    },
    [
      books,
      citations,
      invalidateDataLoad,
      session,
      setBooks,
      setChapterBlocksByBook,
      setCitations,
      setMutationError,
      setProjects,
    ]
  );

  const handlePreviewBookDeletion = useCallback(
    async (bookId: string) => {
      if (!session || !books.some((book) => book.id === bookId)) return undefined;
      try {
        const preview = await previewBookDeletionRecord(session.user.id, bookId);
        setMutationError(null);
        return preview;
      } catch (error) {
        console.error('Error previewing book deletion:', error);
        setMutationError('삭제될 기록 수를 확인하지 못했습니다. 다시 시도해 주세요.');
        return undefined;
      }
    },
    [books, session, setMutationError]
  );

  const handleUpdateBookMemo = useCallback(
    async (bookId: string, memo: string, formats?: TextFormatRange[], expectedText?: string) => {
      if (!session) return false;
      try {
        if (formats === undefined) await updateBookMemoRecord(session.user.id, bookId, memo);
        else await updateBookMemoRecord(session.user.id, bookId, memo, formats, expectedText);
        setBooks((current) =>
          current.map((book) =>
            book.id === bookId
              ? { ...book, memo, ...(formats === undefined ? {} : { memoFormats: formats }) }
              : book
          )
        );
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error updating book memo:', error);
        setMutationError('책 전체 메모를 서버에 저장하지 못했습니다. 메모 패널의 복구 상태를 확인해 주세요.');
        return false;
      }
    },
    [session, setBooks, setMutationError]
  );

  return {
    handleDeleteAuthorCascade,
    handlePreviewAuthorDeletion,
    handleDeleteBookCascade,
    handlePreviewBookDeletion,
    handleUpdateBookMemo,
  };
}
