import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Citation } from '../../../types';

const UNDO_WINDOW_MS = 5_000;

export type PendingCitationDelete = {
  id: string;
  text: string;
  count: number;
  citationIds: string[];
};

type DeleteTarget = {
  id: string;
  citation: Citation;
};

type DeleteOperation = {
  id: string;
  ownerKey: string;
  targets: DeleteTarget[];
  timeoutId: number;
  commit: () => boolean | void | Promise<boolean | void>;
};

type UseUndoableCitationDeleteOptions = {
  ownerKey: string | null;
  citations: Citation[];
  onCommitDelete: (citationIds: string[]) => boolean | void | Promise<boolean | void>;
};

export const useUndoableCitationDelete = ({
  ownerKey,
  citations,
  onCommitDelete,
}: UseUndoableCitationDeleteOptions) => {
  const [pendingDeletes, setPendingDeletes] = useState<PendingCitationDelete[]>([]);
  const [committingCitationIds, setCommittingCitationIds] = useState<string[]>([]);
  const pendingOperationsRef = useRef(new Map<string, DeleteOperation>());
  const commitPromisesRef = useRef(new Map<string, Promise<boolean>>());
  const committingOperationsRef = useRef(new Map<string, DeleteOperation>());
  const committingCitationIdsRef = useRef(new Set<string>());
  const operationSequenceRef = useRef(0);
  const ownerKeyRef = useRef(ownerKey);

  const commitOperation = useCallback((operationId: string): Promise<boolean> => {
    const activeCommit = commitPromisesRef.current.get(operationId);
    if (activeCommit) return activeCommit;
    const operation = pendingOperationsRef.current.get(operationId);
    if (!operation) return Promise.resolve(true);

    window.clearTimeout(operation.timeoutId);
    pendingOperationsRef.current.delete(operationId);
    setPendingDeletes((current) => current.filter((entry) => entry.id !== operationId));

    const citationIds = operation.targets.map((target) => target.id);
    committingOperationsRef.current.set(operationId, operation);
    citationIds.forEach((citationId) => committingCitationIdsRef.current.add(citationId));
    setCommittingCitationIds((current) => [...new Set([...current, ...citationIds])]);
    const commitPromise = (async () => {
      try {
        return (await operation.commit()) !== false;
      } catch {
        return false;
      } finally {
        citationIds.forEach((citationId) => committingCitationIdsRef.current.delete(citationId));
        const finishedIds = new Set(citationIds);
        setCommittingCitationIds((current) => current.filter((citationId) => !finishedIds.has(citationId)));
        commitPromisesRef.current.delete(operationId);
        committingOperationsRef.current.delete(operationId);
      }
    })();
    commitPromisesRef.current.set(operationId, commitPromise);
    return commitPromise;
  }, []);

  const commitAll = useCallback(async () => {
    const startedCommits = [...pendingOperationsRef.current.keys()].map(commitOperation);
    const activeCommits = [...commitPromisesRef.current.values()];
    await Promise.all([...startedCommits, ...activeCommits]);
  }, [commitOperation]);

  const commitMatchingOperations = useCallback(async (matches: (operation: DeleteOperation) => boolean) => {
    const pendingOperationIds = [...pendingOperationsRef.current.values()]
      .filter(matches)
      .map((operation) => operation.id);
    const activeCommitIds = [...committingOperationsRef.current.values()]
      .filter(matches)
      .map((operation) => operation.id);
    const results = await Promise.all([
      ...pendingOperationIds.map(commitOperation),
      ...activeCommitIds.flatMap((operationId) => {
        const commit = commitPromisesRef.current.get(operationId);
        return commit ? [commit] : [];
      }),
    ]);
    return results.every(Boolean);
  }, [commitOperation]);

  const commitForAuthor = useCallback((authorId: string, bookIds: string[] = []) => {
    const targetBookIds = new Set(bookIds);
    return commitMatchingOperations((operation) => operation.targets.some((target) =>
      target.citation.authorId === authorId ||
      (target.citation.bookId ? targetBookIds.has(target.citation.bookId) : false)
    ));
  }, [commitMatchingOperations]);

  const commitForBook = useCallback((bookId: string) =>
    commitMatchingOperations((operation) => operation.targets.some(
      (target) => target.citation.bookId === bookId
    )), [commitMatchingOperations]);

  const requestDeleteCitations = useCallback((citationIds: string[]) => {
    if (!ownerKey || citationIds.length === 0) return null;

    const unavailableCitationIds = new Set([
      ...[...pendingOperationsRef.current.values()].flatMap((operation) =>
        operation.targets.map((target) => target.id)
      ),
      ...committingCitationIdsRef.current,
    ]);
    const seenCitationIds = new Set<string>();
    const citationByRequestedId = new Map<string, Citation>();
    citations.forEach((citation) => {
      citationByRequestedId.set(citation.id, citation);
      if (citation.optimisticOriginId) citationByRequestedId.set(citation.optimisticOriginId, citation);
    });
    const targets = citationIds.flatMap((requestedId): DeleteTarget[] => {
      const citation = citationByRequestedId.get(requestedId);
      if (
        !citation ||
        citation.saveStatus === 'saving' ||
        unavailableCitationIds.has(citation.id) ||
        seenCitationIds.has(citation.id)
      ) {
        return [];
      }
      seenCitationIds.add(citation.id);
      return [{ id: citation.id, citation }];
    });
    if (targets.length === 0) return null;

    const operationId = targets.length === 1
      ? targets[0].id
      : `citation-delete-group-${operationSequenceRef.current += 1}`;
    const timeoutId = window.setTimeout(() => commitOperation(operationId), UNDO_WINDOW_MS);
    const operation: DeleteOperation = {
      id: operationId,
      ownerKey,
      targets,
      timeoutId,
      commit: () => onCommitDelete(targets.map((target) => target.id)),
    };

    pendingOperationsRef.current.set(operationId, operation);
    setPendingDeletes((current) => [...current, {
      id: operationId,
      text: targets[0].citation.text,
      count: targets.length,
      citationIds: targets.map((target) => target.id),
    }]);
    return operationId;
  }, [citations, commitOperation, onCommitDelete, ownerKey]);

  const requestDeleteCitation = useCallback((citationId: string) => {
    requestDeleteCitations([citationId]);
  }, [requestDeleteCitations]);

  const undoDeleteCitation = useCallback((operationOrCitationId: string) => {
    const operation = pendingOperationsRef.current.get(operationOrCitationId) ??
      [...pendingOperationsRef.current.values()].find((entry) =>
        entry.targets.some((target) => target.id === operationOrCitationId)
      );
    if (!operation) return;
    if (operation.ownerKey !== ownerKeyRef.current) {
      void commitOperation(operation.id);
      return;
    }

    window.clearTimeout(operation.timeoutId);
    pendingOperationsRef.current.delete(operation.id);
    setPendingDeletes((current) => current.filter((entry) => entry.id !== operation.id));
  }, [commitOperation]);

  useEffect(() => {
    if (ownerKeyRef.current !== ownerKey) void commitAll();
    ownerKeyRef.current = ownerKey;
  }, [commitAll, ownerKey]);

  useEffect(() => {
    const handlePageHide = () => { void commitAll(); };
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      void commitAll();
    };
  }, [commitAll]);

  const hiddenCitationIds = useMemo(() => [
    ...pendingDeletes.flatMap((entry) => entry.citationIds),
    ...committingCitationIds,
  ], [committingCitationIds, pendingDeletes]);

  return {
    pendingDeletes,
    committingCitationIds,
    hiddenCitationIds,
    requestDeleteCitation,
    requestDeleteCitations,
    undoDeleteCitation,
    commitPendingDeletes: commitAll,
    commitPendingDeletesForAuthor: commitForAuthor,
    commitPendingDeletesForBook: commitForBook,
  };
};
