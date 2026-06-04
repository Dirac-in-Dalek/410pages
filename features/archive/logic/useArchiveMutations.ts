import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  AddCitationInput,
  AddCitationResult,
  BookSource,
  BulkSourceUpdateResult,
  Citation,
  CitationSourceInput,
  CreateBookInput,
  CreateChapterBlockInput,
  Project,
} from '../../../types';
import { renameAuthor as renameAuthorRecord } from '../../../shared/api/authorApi';
import { createBook as createBookRecord, renameBook as renameBookRecord, type RenameBookResult } from '../../../shared/api/bookApi';
import {
  createChapterBlock as createChapterBlockRecord,
  deleteChapterBlock as deleteChapterBlockRecord,
} from '../../../shared/api/chapterBlockApi';
import {
  addCitation as addCitationRecord,
  addNote as addNoteRecord,
  bulkUpdateCitationSource as bulkUpdateCitationSourceRecord,
  deleteCitation as deleteCitationRecord,
  deleteNote as deleteNoteRecord,
  updateCitation as updateCitationRecord,
  updateNote as updateNoteRecord,
} from '../../../shared/api/citationApi';
import {
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
  deleteCitationById,
  deleteCitationNote,
  deleteProject,
  patchCitation,
  patchCitations,
  prependCitation,
  replaceCitationById,
  removeCitationFromProjects,
  renameProject,
  reorderProjectsLocally,
  applyRenameAuthorToCitations,
  applyRenameBookToCitations,
  updateCitationNote,
} from './archiveLocalPatch';
import {
  createOptimisticCitation,
  createRetryCitationInput,
  extractCitationPageSort,
  isOptimisticCitationId,
} from './optimisticCitation';

type UseArchiveMutationsOptions = {
  session: ArchiveSession;
  projects: Project[];
  citations: Citation[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  setCitations: Dispatch<SetStateAction<Citation[]>>;
  setBooks: Dispatch<SetStateAction<BookSource[]>>;
  setChapterBlocksByBook: Dispatch<SetStateAction<ChapterBlocksByBook>>;
  fetchData: () => Promise<void>;
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
  setProjects,
  setCitations,
  setBooks,
  setChapterBlocksByBook,
  fetchData,
}: UseArchiveMutationsOptions): ArchiveMutationController => {
  const optimisticSaveInFlightRef = useRef(new Set<string>());

  const persistOptimisticCitation = useCallback(
    async (optimisticCitationId: string, data: AddCitationInput) => {
      if (optimisticSaveInFlightRef.current.has(optimisticCitationId)) {
        return;
      }

      optimisticSaveInFlightRef.current.add(optimisticCitationId);
      try {
        if (!session) {
          setCitations((current) => patchCitation(current, optimisticCitationId, { saveStatus: 'failed' }));
          return;
        }

        const newCitation = await addCitationRecord(session.user.id, data);
        setCitations((current) => replaceCitationById(current, optimisticCitationId, newCitation));
      } catch (error) {
        console.error('Error adding citation:', error);
        setCitations((current) => patchCitation(current, optimisticCitationId, { saveStatus: 'failed' }));
      } finally {
        optimisticSaveInFlightRef.current.delete(optimisticCitationId);
      }
    },
    [session, setCitations]
  );

  const handleAddCitation = useCallback(
    async (data: AddCitationInput): Promise<AddCitationResult> => {
      if (!session) {
        return createNoSessionResult();
      }

      try {
        const newCitation = await addCitationRecord(session.user.id, data);
        setCitations((current) => prependCitation(current, newCitation));
        return { ok: true, citationId: newCitation.id };
      } catch (error) {
        console.error('Error adding citation:', error);
        return { ok: false, error };
      }
    },
    [session, setCitations]
  );

  const handleAddCitationOptimistic = useCallback(
    async (data: AddCitationInput): Promise<AddCitationResult> => {
      if (!session) {
        return createNoSessionResult();
      }

      const optimisticCitation = createOptimisticCitation(data);
      setCitations((current) => prependCitation(current, optimisticCitation));
      void persistOptimisticCitation(optimisticCitation.id, data);

      return { ok: true, citationId: optimisticCitation.id };
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
        return;
      }
      if (isOptimisticCitationId(citationId)) {
        return;
      }

      try {
        const newNote = await addNoteRecord(session.user.id, citationId, content);
        setCitations((current) => appendCitationNote(current, citationId, newNote));
      } catch (error) {
        console.error('Error adding note:', error);
      }
    },
    [session, setCitations]
  );

  const handleUpdateNote = useCallback(
    async (citationId: string, noteId: string, content: string) => {
      if (!session) {
        return;
      }
      if (isOptimisticCitationId(citationId)) {
        return;
      }

      try {
        await updateNoteRecord(session.user.id, noteId, content);
        setCitations((current) => updateCitationNote(current, citationId, noteId, content));
      } catch (error) {
        console.error('Error updating note:', error);
      }
    },
    [session, setCitations]
  );

  const handleDeleteNote = useCallback(
    async (citationId: string, noteId: string) => {
      if (!session) {
        return;
      }
      if (isOptimisticCitationId(citationId)) {
        return;
      }

      try {
        await deleteNoteRecord(session.user.id, noteId);
        setCitations((current) => deleteCitationNote(current, citationId, noteId));
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    },
    [session, setCitations]
  );

  const handleDeleteCitation = useCallback(
    async (citationId: string) => {
      if (!session) {
        return;
      }
      if (isOptimisticCitationId(citationId)) {
        setCitations((current) => deleteCitationById(current, citationId));
        setProjects((current) => removeCitationFromProjects(current, citationId));
        return;
      }

      try {
        await deleteCitationRecord(session.user.id, citationId);
        setCitations((current) => deleteCitationById(current, citationId));
        setProjects((current) => removeCitationFromProjects(current, citationId));
      } catch (error) {
        console.error('Error deleting citation:', error);
      }
    },
    [session, setCitations, setProjects]
  );

  const handleUpdateCitation = useCallback(
    async (citationId: string, data: Partial<Citation>) => {
      if (!session) {
        return;
      }
      if (isOptimisticCitationId(citationId)) {
        const localPatch: Partial<Citation> = { ...data };
        if (data.page !== undefined) {
          localPatch.pageSort = extractCitationPageSort(data.page);
        }
        if (data.author !== undefined) {
          localPatch.isSelf = !data.author.trim();
        }
        setCitations((current) => patchCitation(current, citationId, localPatch));
        return;
      }

      try {
        const patch = await updateCitationRecord(session.user.id, citationId, data);
        setCitations((current) => patchCitation(current, citationId, patch));
      } catch (error) {
        console.error('Error updating citation:', error);
      }
    },
    [session, setCitations]
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
        setCitations((current) => patchCitations(current, result.updatedIds, result.patch));
        return { ok: true, updatedCount: result.updatedCount };
      } catch (error) {
        console.error('Error bulk updating citation source:', error);
        return { ok: false, error };
      }
    },
    [session, setCitations]
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
          author: input.author,
          title,
        });
        setBooks((current) => appendBookSource(current, newBook));
        return newBook;
      } catch (error) {
        console.error('Error creating book:', error);
        return undefined;
      }
    },
    [session, setBooks]
  );

  const handleCreateProject = useCallback(
    async (name: string) => {
      if (!session) {
        return;
      }

      try {
        const newProject = await createProjectRecord(session.user.id, name);
        setProjects((current) => appendProject(current, newProject));
      } catch (error) {
        console.error('Error creating project:', error);
      }
    },
    [session, setProjects]
  );

  const handleRenameProject = useCallback(
    async (projectId: string, name: string) => {
      if (!session) {
        return;
      }

      try {
        await renameProjectRecord(session.user.id, projectId, name);
        setProjects((current) => renameProject(current, projectId, name));
      } catch (error) {
        console.error('Error renaming project:', error);
      }
    },
    [session, setProjects]
  );

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      if (!session) {
        return;
      }

      try {
        await deleteProjectRecord(session.user.id, projectId);
        setProjects((current) => deleteProject(current, projectId));
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    },
    [session, setProjects]
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

      try {
        const result = (await renameAuthorRecord(
          session.user.id,
          authorId,
          trimmed
        )) as RenameAuthorMutationResult;
        setCitations((current) => applyRenameAuthorToCitations(current, result));
      } catch (error) {
        console.error('Error renaming author:', error);
      }
    },
    [session, setCitations]
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
        setCitations((current) => applyRenameBookToCitations(current, result));
      } catch (error) {
        console.error('Error renaming book:', error);
      }
    },
    [session, setCitations]
  );

  const handleCreateChapterBlock = useCallback(
    async (input: CreateChapterBlockInput) => {
      if (!session) {
        return undefined;
      }

      try {
        const chapterBlock = await createChapterBlockRecord(session.user.id, input);
        setChapterBlocksByBook((current) => appendChapterBlock(current, chapterBlock));
        return chapterBlock;
      } catch (error) {
        console.error('Error creating chapter block:', error);
        return undefined;
      }
    },
    [session, setChapterBlocksByBook]
  );

  const handleDeleteChapterBlock = useCallback(
    async (bookId: string, blockId: string) => {
      if (!session) {
        return;
      }

      try {
        await deleteChapterBlockRecord(session.user.id, blockId);
        setChapterBlocksByBook((current) => deleteChapterBlock(current, bookId, blockId));
      } catch (error) {
        console.error('Error deleting chapter block:', error);
      }
    },
    [session, setChapterBlocksByBook]
  );

  const handleReorderProjects = useCallback(
    async (dragIndex: number, dropIndex: number) => {
      if (!session) {
        return;
      }

      const nextProjects = reorderProjectsLocally(projects, dragIndex, dropIndex);
      if (!nextProjects) {
        return;
      }

      const userId = session.user.id;
      setProjects(nextProjects);

      try {
        const orderedIds = nextProjects.map((project) => project.id);
        if (orderedIds.length > 0) {
          await reorderProjectsRecord(userId, orderedIds);
        }
      } catch (error) {
        console.error('Error reordering projects:', error);
        await fetchData();
      }
    },
    [fetchData, projects, session, setProjects]
  );

  const handleDropCitationToProject = useCallback(
    async (projectId: string, citationId: string) => {
      if (!session) {
        return;
      }
      if (isOptimisticCitationId(citationId)) {
        return;
      }

      try {
        await addCitationToProjectRecord(session.user.id, projectId, citationId);
        setProjects((current) => attachCitationToProject(current, projectId, citationId));
      } catch (error) {
        console.error('Error adding citation to project:', error);
      }
    },
    [session, setProjects]
  );

  return {
    handleAddCitation,
    handleAddCitationOptimistic,
    handleRetryCitationSave,
    handleAddNote,
    handleUpdateNote,
    handleDeleteNote,
    handleDeleteCitation,
    handleUpdateCitation,
    handleBulkUpdateCitationSource,
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
  };
};
