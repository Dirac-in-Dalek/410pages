import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  AddCitationInput,
  AddCitationResult,
  AuthorFolder,
  AuthorFolderMembership,
  AuthorSource,
  BookSource,
  BulkSourceUpdateResult,
  Citation,
  CitationSourceInput,
  CreateBookInput,
  CreateChapterBlockInput,
  Project,
} from '../../../types';
import { createAuthor as createAuthorRecord, renameAuthor as renameAuthorRecord } from '../../../shared/api/authorApi';
import {
  createAuthorFolder as createAuthorFolderRecord,
  deleteAuthorCascade as deleteAuthorCascadeRecord,
  deleteAuthorFolder as deleteAuthorFolderRecord,
  moveAuthorToFolder as moveAuthorToFolderRecord,
  removeAuthorFromFolder as removeAuthorFromFolderRecord,
  renameAuthorFolder as renameAuthorFolderRecord,
  previewAuthorDeletion as previewAuthorDeletionRecord,
} from '../../../shared/api/authorFolderApi';
import {
  createBook as createBookRecord,
  deleteBookCascade as deleteBookCascadeRecord,
  previewBookDeletion as previewBookDeletionRecord,
  renameBook as renameBookRecord,
  type RenameBookResult,
} from '../../../shared/api/bookApi';
import {
  createChapterBlock as createChapterBlockRecord,
  deleteChapterBlock as deleteChapterBlockRecord,
} from '../../../shared/api/chapterBlockApi';
import {
  addCitation as addCitationRecord,
  addNote as addNoteRecord,
  bulkUpdateCitationSource as bulkUpdateCitationSourceRecord,
  deleteCitations as deleteCitationsRecord,
  deleteNote as deleteNoteRecord,
  updateCitation as updateCitationRecord,
  updateNote as updateNoteRecord,
} from '../../../shared/api/citationApi';
import {
  addCitationsToProject as addCitationsToProjectRecord,
  addCitationToProject as addCitationToProjectRecord,
  createProject as createProjectRecord,
  deleteProject as deleteProjectRecord,
  renameProject as renameProjectRecord,
  reorderProjects as reorderProjectsRecord,
} from '../../../shared/api/projectApi';
import type {
  ArchiveMutationController,
  ArchiveSession,
  ChapterBlocksByBook,
  RenameAuthorMutationResult,
} from '../contract/archiveMutationContract';
import {
  appendChapterBlock,
  appendBookSource,
  appendCitationNote,
  appendProject,
  attachCitationToProject,
  deleteChapterBlock,
  deleteCitationNote,
  deleteProject,
  patchCitation,
  patchCitations,
  prependCitation,
  replaceCitationById,
  renameProject,
  reorderProjectsLocally,
  applyRenameAuthorToCitations,
  applyRenameAuthorToBooks,
  applyRenameBookToCitations,
  applyRenameBookToBooks,
  updateCitationNote,
} from './archiveLocalPatch';
import {
  attachOptimisticOrigin,
  createOptimisticCitationEditPatch,
  createOptimisticCitation,
  createRetryCitationInput,
  isOptimisticCitationId,
  reconcilePersistedCitationSource,
} from './optimisticCitation';

type UseArchiveMutationsOptions = {
  session: ArchiveSession;
  projects: Project[];
  citations: Citation[];
  authors: AuthorSource[];
  books: BookSource[];
  authorFolderMemberships: AuthorFolderMembership[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  setCitations: Dispatch<SetStateAction<Citation[]>>;
  setAuthors: Dispatch<SetStateAction<AuthorSource[]>>;
  setAuthorFolders: Dispatch<SetStateAction<AuthorFolder[]>>;
  setAuthorFolderMemberships: Dispatch<SetStateAction<AuthorFolderMembership[]>>;
  setBooks: Dispatch<SetStateAction<BookSource[]>>;
  setChapterBlocksByBook: Dispatch<SetStateAction<ChapterBlocksByBook>>;
  invalidateDataLoad?: () => void;
  invalidateAuthorFolderLoad?: () => void;
  refreshAuthorFolders?: () => void | Promise<void>;
  refreshChapterBlocks?: (bookId: string) => void | Promise<void>;
};

const createNoSessionResult = (): AddCitationResult => ({
  ok: false,
  error: new Error('No active session'),
});

const createNoSessionBulkResult = (): BulkSourceUpdateResult => ({
  ok: false,
  error: new Error('No active session'),
});

export const useArchiveMutations = ({
  session,
  projects,
  citations,
  authors,
  books,
  authorFolderMemberships,
  setProjects,
  setCitations,
  setAuthors,
  setAuthorFolders,
  setAuthorFolderMemberships,
  setBooks,
  setChapterBlocksByBook,
  invalidateDataLoad = () => undefined,
  invalidateAuthorFolderLoad = () => undefined,
  refreshAuthorFolders = () => undefined,
  refreshChapterBlocks = () => undefined,
}: UseArchiveMutationsOptions): ArchiveMutationController => {
  const [mutationError, setMutationError] = useState<string | null>(null);
  const optimisticSaveInFlightRef = useRef(new Map<string, Promise<string | null>>());
  const persistedCitationIdByOptimisticIdRef = useRef(new Map<string, string>());
  const authorFolderMoveInFlightRef = useRef(new Set<string>());
  const clearMutationError = useCallback(() => setMutationError(null), []);

  const persistOptimisticCitation = useCallback(
    (optimisticCitationId: string, data: AddCitationInput): Promise<string | null> => {
      const inFlight = optimisticSaveInFlightRef.current.get(optimisticCitationId);
      if (inFlight) {
        return inFlight;
      }

      const persistence = (async () => {
        try {
          if (!session) {
            setCitations((current) => patchCitation(current, optimisticCitationId, { saveStatus: 'failed' }));
            return null;
          }

          const newCitation = await addCitationRecord(session.user.id, data);
          persistedCitationIdByOptimisticIdRef.current.set(optimisticCitationId, newCitation.id);
          invalidateDataLoad();
          setCitations((current) => {
            const currentOptimistic = current.find((citation) => citation.id === optimisticCitationId);
            return replaceCitationById(
              current,
              optimisticCitationId,
              attachOptimisticOrigin(
                reconcilePersistedCitationSource(newCitation, currentOptimistic, data),
                optimisticCitationId
              )
            );
          });
          return newCitation.id;
        } catch (error) {
          console.error('Error adding citation:', error);
          invalidateDataLoad();
          setCitations((current) => patchCitation(current, optimisticCitationId, { saveStatus: 'failed' }));
          return null;
        } finally {
          optimisticSaveInFlightRef.current.delete(optimisticCitationId);
        }
      })();

      optimisticSaveInFlightRef.current.set(optimisticCitationId, persistence);
      return persistence;
    },
    [invalidateDataLoad, session, setCitations]
  );

  const resolveCitationId = useCallback(async (citationId: string) => {
    if (!isOptimisticCitationId(citationId)) {
      return citationId;
    }

    const persistedId = persistedCitationIdByOptimisticIdRef.current.get(citationId);
    if (persistedId) {
      return persistedId;
    }

    return optimisticSaveInFlightRef.current.get(citationId) ?? null;
  }, []);

  const handleAddCitation = useCallback(
    async (data: AddCitationInput): Promise<AddCitationResult> => {
      if (!session) {
        return createNoSessionResult();
      }

      try {
        const newCitation = await addCitationRecord(session.user.id, data);
        invalidateDataLoad();
        setCitations((current) => prependCitation(current, newCitation));
        return { ok: true, citationId: newCitation.id };
      } catch (error) {
        console.error('Error adding citation:', error);
        return { ok: false, error };
      }
    },
    [invalidateDataLoad, session, setCitations]
  );

  const handleAddCitationOptimistic = useCallback(
    async (data: AddCitationInput): Promise<AddCitationResult> => {
      if (!session) {
        return createNoSessionResult();
      }

      const optimisticCitation = createOptimisticCitation(data);
      setCitations((current) => prependCitation(current, optimisticCitation));
      const persistedCitationId = await persistOptimisticCitation(optimisticCitation.id, data);

      return persistedCitationId
        ? { ok: true, citationId: optimisticCitation.id }
        : { ok: false, error: new Error('Citation save failed') };
    },
    [persistOptimisticCitation, session, setCitations]
  );

  const handleRetryCitationSave = useCallback(
    async (citationId: string) => {
      if (!session || !isOptimisticCitationId(citationId)) {
        return;
      }

      const citation = citations.find((entry) => entry.id === citationId);
      if (!citation) {
        return;
      }

      const retryInput = createRetryCitationInput(citation);
      setCitations((current) => patchCitation(current, citationId, { saveStatus: 'saving' }));
      void persistOptimisticCitation(citationId, retryInput);
    },
    [citations, persistOptimisticCitation, session, setCitations]
  );

  const handleAddNote = useCallback(
    async (citationId: string, content: string) => {
      if (!session) {
        return false;
      }
      if (isOptimisticCitationId(citationId)) {
        return false;
      }

      try {
        const newNote = await addNoteRecord(session.user.id, citationId, content);
        invalidateDataLoad();
        setCitations((current) => appendCitationNote(current, citationId, newNote));
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error adding note:', error);
        setMutationError('메모를 저장하지 못했습니다. 입력한 내용은 그대로 유지했습니다.');
        return false;
      }
    },
    [invalidateDataLoad, session, setCitations]
  );

  const handleUpdateNote = useCallback(
    async (citationId: string, noteId: string, content: string) => {
      if (!session) {
        return false;
      }
      if (isOptimisticCitationId(citationId)) {
        return false;
      }

      try {
        await updateNoteRecord(session.user.id, noteId, content);
        invalidateDataLoad();
        setCitations((current) => updateCitationNote(current, citationId, noteId, content));
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error updating note:', error);
        setMutationError('메모 수정을 저장하지 못했습니다. 입력한 내용은 그대로 유지했습니다.');
        return false;
      }
    },
    [invalidateDataLoad, session, setCitations]
  );

  const handleDeleteNote = useCallback(
    async (citationId: string, noteId: string) => {
      if (!session) {
        return false;
      }
      if (isOptimisticCitationId(citationId)) {
        return false;
      }

      try {
        await deleteNoteRecord(session.user.id, noteId);
        invalidateDataLoad();
        setCitations((current) => deleteCitationNote(current, citationId, noteId));
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error deleting note:', error);
        setMutationError('메모를 삭제하지 못했습니다. 다시 시도해 주세요.');
        return false;
      }
    },
    [invalidateDataLoad, session, setCitations]
  );

  const handleDeleteCitations = useCallback(
    async (citationIds: string[]) => {
      if (!session) {
        return false;
      }

      try {
        const persistedIds = citationIds.filter((citationId) => !isOptimisticCitationId(citationId));
        if (persistedIds.length > 0) {
          await deleteCitationsRecord(session.user.id, persistedIds);
        }
        invalidateDataLoad();
        const deletedIds = new Set(citationIds);
        setCitations((current) => current.filter((citation) => !deletedIds.has(citation.id)));
        setProjects((current) => current.map((project) => ({
          ...project,
          citationIds: project.citationIds.filter((citationId) => !deletedIds.has(citationId)),
        })));
        return true;
      } catch (error) {
        console.error('Error deleting citations:', error);
        setMutationError('선택한 항목을 삭제하지 못해 다시 복원했습니다.');
        return false;
      }
    },
    [invalidateDataLoad, session, setCitations, setProjects]
  );

  const handleUpdateCitation = useCallback(
    async (citationId: string, data: Partial<Citation>) => {
      if (!session) {
        return false;
      }
      if (isOptimisticCitationId(citationId)) {
        setCitations((current) => current.map((citation) =>
          citation.id === citationId
            ? { ...citation, ...createOptimisticCitationEditPatch(citation, data) }
            : citation
        ));
        setMutationError(null);
        return true;
      }

      try {
        const patch = await updateCitationRecord(session.user.id, citationId, data);
        invalidateDataLoad();
        setCitations((current) => patchCitation(current, citationId, patch));
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error updating citation:', error);
        setMutationError('문장 수정을 저장하지 못했습니다. 입력한 내용은 그대로 유지했습니다.');
        return false;
      }
    },
    [invalidateDataLoad, session, setCitations]
  );

  const handleBulkUpdateCitationSource = useCallback(
    async (
      citationIds: string[],
      source: CitationSourceInput
    ): Promise<BulkSourceUpdateResult> => {
      if (!session) {
        return createNoSessionBulkResult();
      }
      if (citationIds.length === 0) {
        return { ok: true, updatedCount: 0 };
      }

      try {
        const result = await bulkUpdateCitationSourceRecord(session.user.id, citationIds, source);
        invalidateDataLoad();
        setCitations((current) => patchCitations(current, result.updatedIds, result.patch));
        return { ok: true, updatedCount: result.updatedCount };
      } catch (error) {
        console.error('Error bulk updating citation source:', error);
        return { ok: false, error };
      }
    },
    [invalidateDataLoad, session, setCitations]
  );

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

  const handleCreateAuthorFolder = useCallback(async (name: string) => {
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
  }, [invalidateAuthorFolderLoad, refreshAuthorFolders, session, setAuthorFolders]);

  const handleRenameAuthorFolder = useCallback(async (folderId: string, name: string) => {
    if (!session) return false;
    invalidateAuthorFolderLoad();
    try {
      await renameAuthorFolderRecord(session.user.id, folderId, name);
      setAuthorFolders((current) => current.map((folder) =>
        folder.id === folderId ? { ...folder, name: name.trim() } : folder
      ));
      setMutationError(null);
      return true;
    } catch (error) {
      console.error('Error renaming author folder:', error);
      setMutationError('저자 폴더 이름을 바꾸지 못했습니다. 같은 이름이 있는지 확인해 주세요.');
      return false;
    } finally {
      void refreshAuthorFolders();
    }
  }, [invalidateAuthorFolderLoad, refreshAuthorFolders, session, setAuthorFolders]);

  const handleDeleteAuthorFolder = useCallback(async (folderId: string) => {
    if (!session) return false;
    invalidateAuthorFolderLoad();
    try {
      await deleteAuthorFolderRecord(session.user.id, folderId);
      setAuthorFolders((current) => current.filter((folder) => folder.id !== folderId));
      setAuthorFolderMemberships((current) => current.filter((membership) => membership.folderId !== folderId));
      setMutationError(null);
      return true;
    } catch (error) {
      console.error('Error deleting author folder:', error);
      setMutationError('저자 폴더를 삭제하지 못했습니다. 다시 시도해 주세요.');
      return false;
    } finally {
      void refreshAuthorFolders();
    }
  }, [invalidateAuthorFolderLoad, refreshAuthorFolders, session, setAuthorFolderMemberships, setAuthorFolders]);

  const handleMoveAuthorToFolder = useCallback(async (authorId: string, folderId: string) => {
    if (!session || authors.find((author) => author.id === authorId)?.isSelf || authorFolderMoveInFlightRef.current.has(authorId)) return false;
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
  }, [authorFolderMemberships, authors, invalidateAuthorFolderLoad, refreshAuthorFolders, session, setAuthorFolderMemberships]);

  const handleRemoveAuthorFromFolder = useCallback(async (authorId: string) => {
    if (!session || authors.find((author) => author.id === authorId)?.isSelf || authorFolderMoveInFlightRef.current.has(authorId)) return false;
    invalidateAuthorFolderLoad();
    authorFolderMoveInFlightRef.current.add(authorId);
    const previous = authorFolderMemberships.find((membership) => membership.authorId === authorId);
    setAuthorFolderMemberships((current) => current.filter((membership) => membership.authorId !== authorId));
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
  }, [authorFolderMemberships, authors, invalidateAuthorFolderLoad, refreshAuthorFolders, session, setAuthorFolderMemberships]);

  const handleDeleteAuthorCascade = useCallback(async (authorId: string) => {
    if (!session || authors.find((author) => author.id === authorId)?.isSelf) return undefined;
    const sourceBookIds = new Set(books.filter((book) => book.authorId === authorId).map((book) => book.id));
    if (citations.some((citation) =>
      citation.saveStatus &&
      (citation.authorId === authorId || (citation.bookId ? sourceBookIds.has(citation.bookId) : false))
    )) {
      setMutationError('저장 중이거나 저장에 실패한 문장이 있습니다. 저장을 완료한 뒤 저자를 삭제해 주세요.');
      return undefined;
    }
    invalidateAuthorFolderLoad();
    try {
      const result = await deleteAuthorCascadeRecord(session.user.id, authorId);
      const deletedBookIds = new Set(result.deletedBookIds);
      const deletedCitationIds = new Set(citations
        .filter((citation) => citation.authorId === authorId || (citation.bookId && deletedBookIds.has(citation.bookId)))
        .map((citation) => citation.id));
      invalidateDataLoad();
      setAuthors((current) => current.filter((author) => author.id !== authorId));
      setBooks((current) => current.filter((book) => !deletedBookIds.has(book.id)));
      setCitations((current) => current.filter((citation) => !deletedCitationIds.has(citation.id)));
      setProjects((current) => current.map((project) => ({
        ...project,
        citationIds: project.citationIds.filter((citationId) => !deletedCitationIds.has(citationId)),
      })));
      setChapterBlocksByBook((current) => Object.fromEntries(
        Object.entries(current).filter(([bookId]) => !deletedBookIds.has(bookId))
      ));
      setAuthorFolderMemberships((current) => current.filter((membership) => membership.authorId !== authorId));
      setMutationError(null);
      return result;
    } catch (error) {
      console.error('Error deleting author:', error);
      setMutationError('저자와 기록을 삭제하지 못했습니다. 데이터는 그대로 유지했습니다.');
      return undefined;
    } finally {
      void refreshAuthorFolders();
    }
  }, [authors, citations, invalidateAuthorFolderLoad, invalidateDataLoad, refreshAuthorFolders, session, setAuthorFolderMemberships, setAuthors, setBooks, setChapterBlocksByBook, setCitations, setProjects]);

  const handlePreviewAuthorDeletion = useCallback(async (authorId: string) => {
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
  }, [authors, session]);

  const handleDeleteBookCascade = useCallback(async (bookId: string) => {
    if (!session || !books.some((book) => book.id === bookId)) return undefined;
    if (citations.some((citation) => citation.bookId === bookId && citation.saveStatus)) {
      setMutationError('저장 중이거나 저장에 실패한 문장이 있습니다. 저장을 완료한 뒤 책을 삭제해 주세요.');
      return undefined;
    }
    try {
      const result = await deleteBookCascadeRecord(session.user.id, bookId);
      const deletedCitationIds = new Set(citations
        .filter((citation) => citation.bookId === bookId)
        .map((citation) => citation.id));
      invalidateDataLoad();
      setBooks((current) => current.filter((book) => book.id !== bookId));
      setCitations((current) => current.filter((citation) => !deletedCitationIds.has(citation.id)));
      setProjects((current) => current.map((project) => ({
        ...project,
        citationIds: project.citationIds.filter((citationId) => !deletedCitationIds.has(citationId)),
      })));
      setChapterBlocksByBook((current) => Object.fromEntries(
        Object.entries(current).filter(([currentBookId]) => currentBookId !== bookId)
      ));
      setMutationError(null);
      return result;
    } catch (error) {
      console.error('Error deleting book:', error);
      setMutationError('책과 기록을 삭제하지 못했습니다. 데이터는 그대로 유지했습니다.');
      return undefined;
    }
  }, [books, citations, invalidateDataLoad, session, setBooks, setChapterBlocksByBook, setCitations, setProjects]);

  const handlePreviewBookDeletion = useCallback(async (bookId: string) => {
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
  }, [books, session]);

  const handleCreateProject = useCallback(
    async (name: string) => {
      if (!session) {
        return false;
      }

      try {
        const newProject = await createProjectRecord(session.user.id, name);
        invalidateDataLoad();
        setProjects((current) => appendProject(current, newProject));
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error creating project:', error);
        setMutationError('폴더를 만들지 못했습니다. 입력한 이름은 그대로 유지했습니다.');
        return false;
      }
    },
    [invalidateDataLoad, session, setProjects]
  );

  const handleRenameProject = useCallback(
    async (projectId: string, name: string) => {
      if (!session) {
        return false;
      }

      try {
        await renameProjectRecord(session.user.id, projectId, name);
        invalidateDataLoad();
        setProjects((current) => renameProject(current, projectId, name));
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error renaming project:', error);
        setMutationError('폴더 이름을 저장하지 못했습니다. 입력한 이름은 그대로 유지했습니다.');
        return false;
      }
    },
    [invalidateDataLoad, session, setProjects]
  );

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      if (!session) {
        return false;
      }

      try {
        await deleteProjectRecord(session.user.id, projectId);
        invalidateDataLoad();
        setProjects((current) => deleteProject(current, projectId));
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error deleting project:', error);
        setMutationError('폴더를 삭제하지 못했습니다. 다시 시도해 주세요.');
        return false;
      }
    },
    [invalidateDataLoad, session, setProjects]
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
        setMutationError(null);
        return result;
      } catch (error) {
        console.error('Error renaming author:', error);
        setMutationError('저자 이름을 저장하지 못했습니다. 입력한 이름은 그대로 유지했습니다.');
      } finally {
        void refreshAuthorFolders();
      }
    },
    [invalidateAuthorFolderLoad, invalidateDataLoad, refreshAuthorFolders, session, setAuthorFolderMemberships, setAuthors, setBooks, setCitations]
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
        invalidateDataLoad();
        setCitations((current) => applyRenameBookToCitations(current, result));
        setBooks((current) => applyRenameBookToBooks(current, result));
        setMutationError(null);
        return result;
      } catch (error) {
        console.error('Error renaming book:', error);
        setMutationError('책 이름을 저장하지 못했습니다. 입력한 이름은 그대로 유지했습니다.');
      }
    },
    [invalidateDataLoad, session, setBooks, setCitations]
  );

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
        setMutationError('장 구분을 저장하지 못했습니다. 입력한 제목은 그대로 유지했습니다.');
        return false;
      }
    },
    [invalidateDataLoad, refreshChapterBlocks, session, setChapterBlocksByBook]
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
        setMutationError('장 구분을 삭제하지 못했습니다. 다시 시도해 주세요.');
        return false;
      }
    },
    [invalidateDataLoad, refreshChapterBlocks, session, setChapterBlocksByBook]
  );

  const handleReorderProjects = useCallback(
    async (dragIndex: number, dropIndex: number) => {
      if (!session) {
        return false;
      }

      const nextProjects = reorderProjectsLocally(projects, dragIndex, dropIndex);
      if (!nextProjects) {
        return false;
      }

      const userId = session.user.id;
      setProjects(nextProjects);

      try {
        const orderedIds = nextProjects.map((project) => project.id);
        if (orderedIds.length > 0) {
          await reorderProjectsRecord(userId, orderedIds);
        }
        invalidateDataLoad();
        setProjects(nextProjects);
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error reordering projects:', error);
        setProjects(projects);
        setMutationError('폴더 순서를 저장하지 못해 이전 순서를 다시 불러왔습니다.');
        return false;
      }
    },
    [invalidateDataLoad, projects, session, setProjects]
  );

  const handleDropCitationToProject = useCallback(
    async (projectId: string, citationId: string) => {
      if (!session) {
        return false;
      }
      if (isOptimisticCitationId(citationId)) {
        return false;
      }

      try {
        await addCitationToProjectRecord(session.user.id, projectId, citationId);
        invalidateDataLoad();
        setProjects((current) => attachCitationToProject(current, projectId, citationId));
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error adding citation to project:', error);
        setMutationError('문장을 폴더에 추가하지 못했습니다. 다시 시도해 주세요.');
        return false;
      }
    },
    [invalidateDataLoad, session, setProjects]
  );

  const handleAddCitationsToProject = useCallback(async (projectId: string, citationIds: string[]) => {
    if (!session || citationIds.length === 0) return false;
    try {
      await addCitationsToProjectRecord(session.user.id, projectId, citationIds);
      invalidateDataLoad();
      setProjects((current) => current.map((project) => project.id === projectId ? {
        ...project,
        citationIds: [...project.citationIds, ...citationIds.filter((id) => !project.citationIds.includes(id))],
      } : project));
      setMutationError(null);
      return true;
    } catch (error) {
      console.error('Error adding citations to project:', error);
      setMutationError('선택한 항목을 폴더에 추가하지 못했습니다. 선택은 그대로 유지했습니다.');
      return false;
    }
  }, [invalidateDataLoad, session, setProjects]);

  const handleCreateProjectWithCitations = useCallback(async (name: string, citationIds: string[]) => {
    if (!session || !name.trim() || citationIds.length === 0) return false;
    try {
      const project = await createProjectRecord(session.user.id, name.trim());
      await addCitationsToProjectRecord(session.user.id, project.id, citationIds);
      invalidateDataLoad();
      setProjects((current) => [...current, { ...project, citationIds }]);
      setMutationError(null);
      return true;
    } catch (error) {
      console.error('Error creating project with citations:', error);
      setMutationError('새 폴더를 만들지 못했습니다. 이름과 선택은 그대로 유지했습니다.');
      return false;
    }
  }, [invalidateDataLoad, session, setProjects]);

  return {
    mutationError,
    clearMutationError,
    handleAddCitation,
    handleAddCitationOptimistic,
    handleRetryCitationSave,
    resolveCitationId,
    handleAddNote,
    handleUpdateNote,
    handleDeleteNote,
    handleDeleteCitations,
    handleUpdateCitation,
    handleBulkUpdateCitationSource,
    handleCreateAuthor,
    handleCreateAuthorFolder,
    handleRenameAuthorFolder,
    handleDeleteAuthorFolder,
    handleMoveAuthorToFolder,
    handleRemoveAuthorFromFolder,
    handleDeleteAuthorCascade,
    handlePreviewAuthorDeletion,
    handleDeleteBookCascade,
    handlePreviewBookDeletion,
    handleCreateBook,
    handleCreateProject,
    handleRenameProject,
    handleDeleteProject,
    handleRenameAuthor,
    handleRenameBook,
    handleCreateChapterBlock,
    handleDeleteChapterBlock,
    handleReorderProjects,
    handleDropCitationToProject,
    handleAddCitationsToProject,
    handleCreateProjectWithCitations,
  };
};
