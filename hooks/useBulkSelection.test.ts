import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Citation, Project } from '../types';
import { api } from '../lib/api';
import { writeTextToClipboard } from '../lib/citationCopy';
import { useBulkSelection } from './useBulkSelection';

vi.mock('../lib/api', () => ({
  api: {
    deleteCitation: vi.fn().mockResolvedValue(undefined),
    addCitationsToProject: vi.fn().mockResolvedValue(undefined),
    createProject: vi.fn(),
  },
}));

vi.mock('../lib/citationCopy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/citationCopy')>();
  return { ...actual, writeTextToClipboard: vi.fn().mockResolvedValue(undefined) };
});

const citations: Citation[] = [
  {
    id: 'sentence-1',
    kind: 'sentence',
    text: 'A complete sentence.',
    author: 'Author',
    book: 'Book',
    notes: [],
    tags: [],
    createdAt: 1,
  },
  {
    id: 'word-1',
    kind: 'word',
    text: '부조리',
    author: 'Author',
    book: 'Book',
    notes: [],
    tags: [],
    createdAt: 2,
  },
];

const project: Project = { id: 'project-1', name: 'Folder', citationIds: [] };
const session = { user: { id: 'user-1' } };

describe('useBulkSelection mixed item actions', () => {
  beforeEach(() => vi.clearAllMocks());

  const setup = (
    resolveCitationId: (citationId: string) => Promise<string | null> = async (citationId) => citationId
  ) =>
    renderHook(() => {
      const [currentCitations, setCitations] = useState(citations);
      const [projects, setProjects] = useState<Project[]>([project]);
      const selection = useBulkSelection(
        currentCitations,
        session,
        resolveCitationId,
        'Reader',
        setCitations,
        setProjects
      );
      return { ...selection, currentCitations, projects, setCitations };
    });

  const selectBoth = (result: ReturnType<typeof setup>['result']) => {
    act(() => {
      result.current.handleToggleSelect('sentence-1', true);
      result.current.handleToggleSelect('word-1', true);
    });
  };

  it('copies sentence formatting and plain word text together', async () => {
    const { result } = setup();
    selectBoth(result);

    await act(async () => result.current.handleBatchCopy(true));

    expect(writeTextToClipboard).toHaveBeenCalledWith(
      '"A complete sentence." — Author, 『Book』\n\n부조리'
    );
  });

  it('adds mixed selected items to a folder using the existing citation ids', async () => {
    const { result } = setup();
    selectBoth(result);

    await act(async () => result.current.handleBatchAddToProject('project-1'));

    expect(api.addCitationsToProject).toHaveBeenCalledWith('user-1', 'project-1', [
      'sentence-1',
      'word-1',
    ]);
    expect(result.current.projects[0].citationIds).toEqual(['sentence-1', 'word-1']);
  });

  it('deletes mixed selected items and removes their folder references', async () => {
    const { result } = setup();
    selectBoth(result);
    await act(async () => result.current.handleBatchAddToProject('project-1'));
    selectBoth(result);

    await act(async () => result.current.handleBatchDelete());

    await waitFor(() => expect(result.current.currentCitations).toEqual([]));
    expect(api.deleteCitation).toHaveBeenCalledTimes(2);
    expect(result.current.projects[0].citationIds).toEqual([]);
  });

  it('moves an optimistic selection to the persisted citation id', async () => {
    const { result } = setup();

    act(() => result.current.handleToggleSelect('word-1', true));
    act(() => {
      result.current.setCitations((current) =>
        current.map((citation) =>
          citation.id === 'word-1'
            ? { ...citation, id: 'word-persisted', optimisticOriginId: 'word-1', saveStatus: undefined }
            : citation
        )
      );
    });

    await waitFor(() => {
      expect(result.current.selectedIds.has('word-1')).toBe(false);
      expect(result.current.selectedIds.has('word-persisted')).toBe(true);
    });
  });

  it('waits for an optimistic id before deleting it from the server', async () => {
    let finishPersistence: (citationId: string) => void = () => undefined;
    const resolveCitationId = vi.fn(
      () => new Promise<string>((resolve) => { finishPersistence = resolve; })
    );
    const { result } = setup(resolveCitationId);
    act(() => result.current.handleToggleSelect('word-1', true));

    let deletion: Promise<void>;
    act(() => { deletion = result.current.handleBatchDelete(); });
    expect(api.deleteCitation).not.toHaveBeenCalled();

    await act(async () => {
      finishPersistence('word-persisted');
      await deletion!;
    });

    expect(api.deleteCitation).toHaveBeenCalledWith('user-1', 'word-persisted');
    expect(result.current.currentCitations.some((citation) => citation.id === 'word-1')).toBe(false);
  });

  it('waits for an optimistic id before adding it to a folder', async () => {
    let finishPersistence: (citationId: string) => void = () => undefined;
    const resolveCitationId = vi.fn(
      () => new Promise<string>((resolve) => { finishPersistence = resolve; })
    );
    const { result } = setup(resolveCitationId);
    act(() => result.current.handleToggleSelect('word-1', true));

    let folderUpdate: Promise<void>;
    act(() => { folderUpdate = result.current.handleBatchAddToProject('project-1'); });
    expect(api.addCitationsToProject).not.toHaveBeenCalled();

    await act(async () => {
      finishPersistence('word-persisted');
      await folderUpdate!;
    });

    expect(api.addCitationsToProject).toHaveBeenCalledWith(
      'user-1',
      'project-1',
      ['word-persisted']
    );
  });
});
