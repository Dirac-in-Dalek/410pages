import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Citation, Project } from '../../../types';
import { useUndoableCitationDelete } from './useUndoableCitationDelete';

const citation: Citation = {
  id: 'citation-1',
  kind: 'sentence',
  text: 'A sentence worth keeping.',
  author: 'Author',
  authorId: 'author-1',
  bookId: 'book-1',
  book: 'Book',
  notes: [],
  tags: [],
  createdAt: 1,
};

const secondCitation: Citation = {
  ...citation,
  id: 'citation-2',
  text: 'Second sentence.',
  createdAt: 2,
  authorId: 'author-2',
  bookId: 'book-2',
};

const project: Project = {
  id: 'project-1',
  name: 'Folder',
  citationIds: ['citation-1', 'citation-2'],
};

afterEach(() => {
  vi.useRealTimers();
});

const renderDeleteHook = ({
  initialCitations = [citation, secondCitation],
  onCommitDelete = vi.fn(),
}: {
  initialCitations?: Citation[];
  onCommitDelete?: (citationIds: string[]) => boolean | void | Promise<boolean | void>;
} = {}) => renderHook(() => {
  const [canonicalCitations, setCanonicalCitations] = useState(initialCitations);
  const [canonicalProjects, setCanonicalProjects] = useState([project]);
  const deletion = useUndoableCitationDelete({
    ownerKey: 'user-a',
    citations: canonicalCitations,
    onCommitDelete,
  });
  const hiddenIds = new Set(deletion.hiddenCitationIds);
  return {
    canonicalCitations,
    canonicalProjects,
    citations: canonicalCitations.filter((entry) => !hiddenIds.has(entry.id)),
    projects: canonicalProjects.map((entry) => ({
      ...entry,
      citationIds: entry.citationIds.filter((id) => !hiddenIds.has(id)),
    })),
    setCanonicalCitations,
    setCanonicalProjects,
    ...deletion,
  };
});

describe('useUndoableCitationDelete', () => {
  it('hides a citation and folder link without mutating canonical state, then reveals both on undo', () => {
    vi.useFakeTimers();
    const { result } = renderDeleteHook();

    act(() => result.current.requestDeleteCitation('citation-1'));

    expect(result.current.canonicalCitations.map((entry) => entry.id)).toEqual(['citation-1', 'citation-2']);
    expect(result.current.canonicalProjects[0].citationIds).toEqual(['citation-1', 'citation-2']);
    expect(result.current.citations.map((entry) => entry.id)).toEqual(['citation-2']);
    expect(result.current.projects[0].citationIds).toEqual(['citation-2']);

    act(() => result.current.undoDeleteCitation('citation-1'));

    expect(result.current.citations.map((entry) => entry.id)).toEqual(['citation-1', 'citation-2']);
    expect(result.current.projects[0].citationIds).toEqual(['citation-1', 'citation-2']);
  });

  it('keeps pending ids hidden when canonical data refreshes', () => {
    vi.useFakeTimers();
    const { result } = renderDeleteHook();
    const refreshedCitation = { ...citation, text: 'Newer server text.' };

    act(() => result.current.requestDeleteCitation('citation-1'));
    act(() => {
      result.current.setCanonicalCitations([refreshedCitation, secondCitation]);
      result.current.setCanonicalProjects([project]);
    });

    expect(result.current.citations.map((entry) => entry.id)).toEqual(['citation-2']);
    expect(result.current.projects[0].citationIds).toEqual(['citation-2']);

    act(() => result.current.undoDeleteCitation('citation-1'));
    expect(result.current.citations[0].text).toBe('Newer server text.');
  });

  it('commits a group once after five seconds', async () => {
    vi.useFakeTimers();
    const onCommitDelete = vi.fn().mockResolvedValue(true);
    const { result } = renderDeleteHook({ onCommitDelete });

    act(() => result.current.requestDeleteCitations(['citation-2', 'citation-1']));
    expect(result.current.pendingDeletes[0]).toMatchObject({
      text: 'Second sentence.',
      count: 2,
      citationIds: ['citation-2', 'citation-1'],
    });

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    expect(onCommitDelete).toHaveBeenCalledTimes(1);
    expect(onCommitDelete).toHaveBeenCalledWith(['citation-2', 'citation-1']);
  });

  it('keeps ids hidden while the canonical delete is in flight', async () => {
    vi.useFakeTimers();
    let finishDelete: (deleted: boolean) => void = () => undefined;
    const onCommitDelete = vi.fn(() => new Promise<boolean>((resolve) => {
      finishDelete = resolve;
    }));
    const { result } = renderDeleteHook({ onCommitDelete });

    act(() => result.current.requestDeleteCitation('citation-1'));
    act(() => vi.advanceTimersByTime(5_000));

    expect(result.current.pendingDeletes).toEqual([]);
    expect(result.current.committingCitationIds).toEqual(['citation-1']);
    expect(result.current.citations.map((entry) => entry.id)).toEqual(['citation-2']);

    await act(async () => finishDelete(true));
    expect(result.current.committingCitationIds).toEqual([]);
  });

  it('reveals canonical data when the server deletion fails', async () => {
    vi.useFakeTimers();
    const { result } = renderDeleteHook({ onCommitDelete: vi.fn().mockResolvedValue(false) });

    act(() => result.current.requestDeleteCitation('citation-1'));
    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    expect(result.current.citations.map((entry) => entry.id)).toEqual(['citation-1', 'citation-2']);
    expect(result.current.projects[0].citationIds).toEqual(['citation-1', 'citation-2']);
  });

  it('leaves canonical removal to the commit callback', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => {
      const [canonicalCitations, setCanonicalCitations] = useState([citation]);
      const deletion = useUndoableCitationDelete({
        ownerKey: 'user-a',
        citations: canonicalCitations,
        onCommitDelete: async (ids) => {
          const deletedIds = new Set(ids);
          setCanonicalCitations((current) => current.filter((entry) => !deletedIds.has(entry.id)));
          return true;
        },
      });
      const hiddenIds = new Set(deletion.hiddenCitationIds);
      return {
        canonicalCitations,
        citations: canonicalCitations.filter((entry) => !hiddenIds.has(entry.id)),
        ...deletion,
      };
    });

    act(() => result.current.requestDeleteCitation('citation-1'));
    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    expect(result.current.canonicalCitations).toEqual([]);
    expect(result.current.citations).toEqual([]);
  });

  it('commits only the target author pending deletions before a cascade', async () => {
    vi.useFakeTimers();
    const onCommitDelete = vi.fn().mockResolvedValue(true);
    const { result } = renderDeleteHook({ onCommitDelete });
    act(() => result.current.requestDeleteCitation('citation-1'));
    act(() => result.current.requestDeleteCitation('citation-2'));

    await act(async () => result.current.commitPendingDeletesForAuthor('author-1', ['book-1']));

    expect(onCommitDelete).toHaveBeenCalledTimes(1);
    expect(onCommitDelete).toHaveBeenCalledWith(['citation-1']);
    expect(result.current.pendingDeletes[0].citationIds).toEqual(['citation-2']);
  });

  it('reports a target-author commit failure so cascade deletion can stop', async () => {
    vi.useFakeTimers();
    const { result } = renderDeleteHook({ onCommitDelete: vi.fn().mockResolvedValue(false) });
    act(() => result.current.requestDeleteCitation('citation-1'));

    let didCommit = true;
    await act(async () => {
      didCommit = await result.current.commitPendingDeletesForAuthor('author-1', ['book-1']);
    });

    expect(didCommit).toBe(false);
    expect(result.current.citations.map((entry) => entry.id)).toContain('citation-1');
  });

  it('commits only pending deletions for the target book', async () => {
    vi.useFakeTimers();
    const onCommitDelete = vi.fn().mockResolvedValue(true);
    const { result } = renderDeleteHook({ onCommitDelete });
    act(() => result.current.requestDeleteCitation('citation-1'));
    act(() => result.current.requestDeleteCitation('citation-2'));

    await act(async () => result.current.commitPendingDeletesForBook('book-1'));

    expect(onCommitDelete).toHaveBeenCalledWith(['citation-1']);
    expect(result.current.pendingDeletes[0].citationIds).toEqual(['citation-2']);
  });

  it('ignores saving citations and normalizes optimistic origin ids', async () => {
    vi.useFakeTimers();
    const onCommitDelete = vi.fn();
    const savingCitation = { ...secondCitation, saveStatus: 'saving' as const };
    const persistedCitation = {
      ...citation,
      id: 'citation-persisted',
      optimisticOriginId: 'optimistic-citation-original',
    };
    const { result } = renderDeleteHook({
      initialCitations: [persistedCitation, savingCitation],
      onCommitDelete,
    });

    act(() => result.current.requestDeleteCitations(['optimistic-citation-original', 'citation-2']));
    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    expect(onCommitDelete).toHaveBeenCalledWith(['citation-persisted']);
  });

  it('does not queue the same citation while its server deletion is in flight', async () => {
    vi.useFakeTimers();
    let finishDelete: (deleted: boolean) => void = () => undefined;
    const onCommitDelete = vi.fn(() => new Promise<boolean>((resolve) => {
      finishDelete = resolve;
    }));
    const { result } = renderDeleteHook({ onCommitDelete });

    act(() => result.current.requestDeleteCitation('citation-1'));
    act(() => vi.advanceTimersByTime(5_000));
    act(() => result.current.requestDeleteCitation('citation-1'));

    expect(onCommitDelete).toHaveBeenCalledTimes(1);
    expect(result.current.pendingDeletes).toEqual([]);

    await act(async () => finishDelete(true));
  });

  it('commits pending deletes when the owner changes', async () => {
    vi.useFakeTimers();
    const onCommitDelete = vi.fn().mockResolvedValue(true);
    const { result, rerender } = renderHook(
      ({ ownerKey }) => useUndoableCitationDelete({ ownerKey, citations: [citation], onCommitDelete }),
      { initialProps: { ownerKey: 'user-a' as string | null } }
    );
    act(() => result.current.requestDeleteCitation('citation-1'));

    await act(async () => {
      rerender({ ownerKey: 'user-b' });
      await Promise.resolve();
    });

    expect(onCommitDelete).toHaveBeenCalledWith(['citation-1']);
    expect(result.current.pendingDeletes).toEqual([]);
  });
});
