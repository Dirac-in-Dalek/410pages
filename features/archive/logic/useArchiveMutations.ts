import { useChapterBlockMutations } from './useChapterBlockMutations';
import { useLibraryRecordMutations } from './useLibraryRecordMutations';
import { useAuthorFolderMutations } from './useAuthorFolderMutations';
import { useProjectMutations } from './useProjectMutations';
import type { CitationUpdate } from '../../../types';
import {
  rebaseTextFormats,
  formatsWithLegacyHighlights,
  legacyHighlightsFromFormats,
} from '../../../shared/logic/textFormats';
import type { TextFormatRange } from '../../../types';
import { useLibrarySourceMutations } from './useLibrarySourceMutations';
import type { UseArchiveMutationsOptions } from '../contract/archiveMutationContract';
import { useCallback, useRef, useState } from 'react';
import type {
  AddCitationInput,
  AddCitationResult,
  BookPosition,
  BulkSourceUpdateResult,
  CitationSourceInput,
} from '../../../types';
import {
  addCitation as addCitationRecord,
  addNote as addNoteRecord,
  bulkUpdateCitationSource as bulkUpdateCitationSourceRecord,
  deleteCitations as deleteCitationsRecord,
  deleteNote as deleteNoteRecord,
  updateCitation as updateCitationRecord,
  moveCitation as moveCitationRecord,
  updateNote as updateNoteRecord,
} from '../../../shared/api/citationApi';

import type { ArchiveMutationController } from '../contract/archiveMutationContract';
import {
  appendCitationNote,
  deleteCitationNote,
  patchCitation,
  prependCitation,
  replaceCitationById,
  updateCitationNote,
} from './archiveLocalPatch';
import {
  createOptimisticCitationEditPatch,
  createOptimisticCitation,
  createRetryCitationInput,
  reconcilePersistedCitationSource,
} from './optimisticCitation';
import { removeCitationDraft, removeCitationDrafts, storeCitationDraft } from './citationDraftStorage';

const createNoSessionResult = (): AddCitationResult => ({
  ok: false,
  error: new Error('No active session'),
});

const createNoSessionBulkResult = (): BulkSourceUpdateResult => ({
  ok: false,
  error: new Error('No active session'),
});

export const useArchiveMutations = (options: UseArchiveMutationsOptions): ArchiveMutationController => {
  const {
    session,
    projects,
    citations,
    books,
    setProjects,
    setCitations,
    setAuthors,
    setAuthorFolderMemberships,
    setBooks,
    setChapterBlocksByBook,
    invalidateDataLoad = () => undefined,
    invalidateAuthorFolderLoad = () => undefined,
    refreshAuthorFolders = () => undefined,
    refreshChapterBlocks = () => undefined,
  } = options;
  const [mutationError, setMutationError] = useState<string | null>(null);
  const { handleCreateBook, handleCreateAuthor, handleRenameAuthor, handleRenameBook } =
    useLibrarySourceMutations({
      session,
      books,
      setBooks,
      setAuthors,
      setCitations,
      setChapterBlocksByBook,
      refreshChapterBlocks,
      setAuthorFolderMemberships,
      invalidateDataLoad,
      invalidateAuthorFolderLoad,
      refreshAuthorFolders,
      setMutationError,
    });
  const authorFolderMutations = useAuthorFolderMutations({ ...options, setMutationError });
  const libraryRecordMutations = useLibraryRecordMutations({ ...options, setMutationError });
  const chapterBlockMutations = useChapterBlockMutations({ ...options, setMutationError });
  const projectMutations = useProjectMutations({
    session,
    projects,
    citations,
    setProjects,
    invalidateDataLoad,
    setMutationError,
  });
  const optimisticSaveInFlightRef = useRef(new Map<string, Promise<string | null>>());
  const ownerId = session?.user.id ?? null;
  const ownerIdRef = useRef(ownerId);
  ownerIdRef.current = ownerId;
  const citationsRef = useRef(citations);
  citationsRef.current = citations;
  const clearMutationError = useCallback(() => setMutationError(null), []);

  const persistOptimisticCitation = useCallback(
    (optimisticCitationId: string, data: AddCitationInput): Promise<string | null> => {
      const inFlight = optimisticSaveInFlightRef.current.get(optimisticCitationId);
      if (inFlight) {
        return inFlight;
      }

      const persistence = (async () => {
        const requestOwnerId = session?.user.id;
        try {
          if (!requestOwnerId) {
            setCitations((current) => patchCitation(current, optimisticCitationId, { saveStatus: 'failed' }));
            return null;
          }

          const newCitation = await addCitationRecord(requestOwnerId, { ...data, id: optimisticCitationId });
          const latestLocal = citationsRef.current.find((citation) => citation.id === optimisticCitationId);
          const hasNewerLocalChanges =
            latestLocal && JSON.stringify(createRetryCitationInput(latestLocal)) !== JSON.stringify(data);
          if (hasNewerLocalChanges) {
            const failedDraft = { ...latestLocal, saveStatus: 'failed' as const };
            storeCitationDraft(requestOwnerId, failedDraft);
            if (ownerIdRef.current === requestOwnerId) {
              setCitations((current) =>
                current.map((citation) =>
                  citation.id === optimisticCitationId ? { ...citation, saveStatus: 'failed' } : citation
                )
              );
            }
            return newCitation.id;
          }
          removeCitationDraft(requestOwnerId, optimisticCitationId);
          if (ownerIdRef.current !== requestOwnerId) return newCitation.id;
          invalidateDataLoad();
          setCitations((current) => {
            const currentOptimistic = current.find((citation) => citation.id === optimisticCitationId);
            return replaceCitationById(
              current,
              optimisticCitationId,
              reconcilePersistedCitationSource(newCitation, currentOptimistic, data)
            );
          });
          setMutationError(null);
          return newCitation.id;
        } catch (error) {
          console.error('Error adding citation:', error);
          if (requestOwnerId && ownerIdRef.current === requestOwnerId) {
            setCitations((current) => {
              const failed = current.find((citation) => citation.id === optimisticCitationId);
              if (failed) storeCitationDraft(requestOwnerId, { ...failed, saveStatus: 'failed' });
              return patchCitation(current, optimisticCitationId, { saveStatus: 'failed' });
            });
          }
          if (ownerIdRef.current !== requestOwnerId) return null;
          invalidateDataLoad();
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

  const resolveCitationId = useCallback(
    async (citationId: string) => {
      const inFlight = optimisticSaveInFlightRef.current.get(citationId);
      if (inFlight) return inFlight;
      return citations.find((citation) => citation.id === citationId)?.saveStatus === 'failed'
        ? null
        : citationId;
    },
    [citations]
  );

  const handleAddCitation = useCallback(
    async (data: AddCitationInput): Promise<AddCitationResult> => {
      if (!session) return createNoSessionResult();

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
      if (!storeCitationDraft(session.user.id, optimisticCitation)) {
        setMutationError('브라우저에 임시 초안을 저장하지 못했습니다. 저장 실패 시 복사해 보관해 주세요.');
      }
      setCitations((current) => prependCitation(current, optimisticCitation));
      void persistOptimisticCitation(optimisticCitation.id, createRetryCitationInput(optimisticCitation));
      return { ok: true, citationId: optimisticCitation.id };
    },
    [persistOptimisticCitation, session, setCitations]
  );

  const handleRetryCitationSave = useCallback(
    async (citationId: string) => {
      if (!session) {
        return;
      }

      const citation = citations.find((entry) => entry.id === citationId);
      if (!citation || citation.saveStatus !== 'failed') {
        return;
      }

      const retryInput = createRetryCitationInput(citation);
      if (!storeCitationDraft(session.user.id, { ...citation, saveStatus: 'saving' })) {
        setMutationError('브라우저에 임시 초안을 저장하지 못했습니다. 저장 실패 시 복사해 보관해 주세요.');
      }
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
      if (citations.find((citation) => citation.id === citationId)?.saveStatus) {
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
    [citations, invalidateDataLoad, session, setCitations]
  );

  const handleUpdateNote = useCallback(
    async (
      citationId: string,
      noteId: string,
      content: string,
      formats?: TextFormatRange[],
      expectedText?: string
    ) => {
      if (!session) {
        return false;
      }
      if (citations.find((citation) => citation.id === citationId)?.saveStatus) {
        return false;
      }

      try {
        const note = citationsRef.current
          .find((citation) => citation.id === citationId)
          ?.notes.find((note) => note.id === noteId);
        const nextFormats =
          formats ??
          (note?.textFormats?.length
            ? rebaseTextFormats(note.content, content, note.textFormats)
            : undefined);
        if (nextFormats !== undefined)
          await updateNoteRecord(
            session.user.id,
            noteId,
            content,
            nextFormats,
            expectedText ?? note?.content
          );
        else await updateNoteRecord(session.user.id, noteId, content);
        invalidateDataLoad();
        setCitations((current) => updateCitationNote(current, citationId, noteId, content, nextFormats));
        setMutationError(null);
        return true;
      } catch (error) {
        console.error('Error updating note:', error);
        setMutationError('메모 수정을 저장하지 못했습니다. 입력한 내용은 그대로 유지했습니다.');
        return false;
      }
    },
    [citations, invalidateDataLoad, session, setCitations]
  );

  const handleDeleteNote = useCallback(
    async (citationId: string, noteId: string) => {
      if (!session) {
        return false;
      }
      if (citations.find((citation) => citation.id === citationId)?.saveStatus) {
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
    [citations, invalidateDataLoad, session, setCitations]
  );

  const handleDeleteCitations = useCallback(
    async (citationIds: string[]) => {
      if (!session) {
        return false;
      }

      try {
        const savingDraftIds = new Set(
          citations.filter((citation) => citation.saveStatus === 'saving').map((citation) => citation.id)
        );
        const persistedIds = citationIds.filter((citationId) => !savingDraftIds.has(citationId));
        if (persistedIds.length > 0) {
          await deleteCitationsRecord(session.user.id, persistedIds);
        }
        removeCitationDrafts(session.user.id, citationIds);
        invalidateDataLoad();
        const deletedIds = new Set(citationIds);
        setCitations((current) => current.filter((citation) => !deletedIds.has(citation.id)));
        setProjects((current) =>
          current.map((project) => ({
            ...project,
            citationIds: project.citationIds.filter((citationId) => !deletedIds.has(citationId)),
          }))
        );
        return true;
      } catch (error) {
        console.error('Error deleting citations:', error);
        setMutationError('선택한 항목을 삭제하지 못해 다시 복원했습니다.');
        return false;
      }
    },
    [citations, invalidateDataLoad, session, setCitations, setProjects]
  );

  const handleMoveCitation = useCallback(
    async (bookId: string, citationId: string, position: BookPosition) => {
      if (!session || !citations.some((c) => c.id === citationId && c.bookId === bookId && !c.saveStatus))
        return false;
      try {
        const patch = await moveCitationRecord(session.user.id, bookId, citationId, position);
        invalidateDataLoad();
        setCitations((current) => patchCitation(current, citationId, patch));
        setMutationError(null);
        return true;
      } catch {
        setMutationError('인용문을 이동하지 못했습니다. 기존 위치를 유지했습니다.');
        return false;
      }
    },
    [session, citations, invalidateDataLoad, setCitations]
  );

  const handleUpdateCitation = useCallback(
    async (citationId: string, data: CitationUpdate, expectedText?: string) => {
      if (!session) {
        return false;
      }
      const draft = citations.find((citation) => citation.id === citationId && citation.saveStatus);
      if (draft) {
        const nextDraft = { ...draft, ...createOptimisticCitationEditPatch(draft, data) };
        setCitations((current) =>
          current.map((citation) => (citation.id === citationId ? nextDraft : citation))
        );
        if (storeCitationDraft(session.user.id, nextDraft)) {
          setMutationError(null);
        } else {
          setMutationError('브라우저에 수정한 임시 초안을 저장하지 못했습니다. 복사해 보관해 주세요.');
        }
        return true;
      }

      try {
        const current = citationsRef.current.find((citation) => citation.id === citationId);
        let nextData = data;
        if (
          current &&
          data.text !== undefined &&
          data.text !== current.text &&
          data.textFormats === undefined
        ) {
          const formats = formatsWithLegacyHighlights(current.text, current.textFormats, current.highlights);
          if (formats.length) {
            const rebased = rebaseTextFormats(current.text, data.text, formats);
            nextData = { ...data, textFormats: rebased, highlights: legacyHighlightsFromFormats(rebased) };
          }
        }
        const patch =
          expectedText === undefined
            ? await updateCitationRecord(session.user.id, citationId, nextData)
            : await updateCitationRecord(session.user.id, citationId, nextData, expectedText);
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
    [citations, invalidateDataLoad, session, setCitations]
  );

  const handleBulkUpdateCitationSource = useCallback(
    async (citationIds: string[], source: CitationSourceInput): Promise<BulkSourceUpdateResult> => {
      if (!session) {
        return createNoSessionBulkResult();
      }
      if (citationIds.length === 0) {
        return { ok: true, updatedCount: 0 };
      }

      try {
        const result = await bulkUpdateCitationSourceRecord(session.user.id, citationIds, source);
        invalidateDataLoad();
        const updatedIds = new Set(result.updatedIds);
        setCitations((current) =>
          current.map((citation) =>
            updatedIds.has(citation.id)
              ? { ...citation, ...result.patch, orderKey: result.orderKeys[citation.id] }
              : citation
          )
        );
        return { ok: true, updatedCount: result.updatedCount };
      } catch (error) {
        console.error('Error bulk updating citation source:', error);
        return { ok: false, error };
      }
    },
    [invalidateDataLoad, session, setCitations]
  );

  return {
    ...chapterBlockMutations,
    ...libraryRecordMutations,
    ...authorFolderMutations,
    ...projectMutations,
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
    handleMoveCitation,
    handleBulkUpdateCitationSource,
    handleCreateAuthor,
    handleCreateBook,
    handleRenameAuthor,
    handleRenameBook,
  };
};
