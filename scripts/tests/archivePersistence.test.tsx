import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Citation, Project } from '../../types';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getSession: vi.fn(),
  createProject: vi.fn(),
  attach: vi.fn(),
  createWithCitations: vi.fn(),
  reorder: vi.fn(),
  readPreferences: vi.fn(),
  savePreferences: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: () => ({ from: mocks.from, auth: { getSession: mocks.getSession }, rpc: vi.fn() }),
}));
vi.mock('../../shared/api/projectApi', async (original) => ({
  ...(await original()),
  createProject: mocks.createProject,
  createProjectWithCitations: mocks.createWithCitations,
  addCitationsToProject: mocks.attach,
  reorderProjects: mocks.reorder,
}));
vi.mock('../../features/settings/logic/preferencesServer', () => ({
  readServerPreferences: mocks.readPreferences,
  persistServerPreferences: mocks.savePreferences,
}));

import { CitationCard } from '../../features/archive/ui/CitationCard';
import { updateCitation, updateNote, fetchCitations } from '../../shared/api/citationApi';
import { renameAuthorFolder } from '../../shared/api/authorFolderApi';
import { useArchiveMutations } from '../../features/archive/logic/useArchiveMutations';
import { useUserPreferences } from '../../features/settings/logic/useUserPreferences';

const citation: Citation = {
  id: 'c1',
  kind: 'sentence',
  text: 'Original sentence',
  author: 'Author',
  book: 'Book',
  authorId: 'a1',
  bookId: 'b1',
  page: '12',
  notes: [],
  tags: [],
  createdAt: 1,
};
const initialProjects: Project[] = ['A', 'B', 'C'].map((id) => ({ id, name: id, citationIds: [] }));
const basePreferences: import('../../features/settings/contract/userPreferences').UserPreferences = {
  theme: 'day',
  fontFamily: 'pretendard',
  baseFontPt: 12,
  citationWidthRem: 44,
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user1' } } }, error: null });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const mutations = () =>
  renderHook(() => {
    const [projects, setProjects] = useState(initialProjects);
    const [citations, setCitations] = useState([citation]);
    const controller = useArchiveMutations({
      session: { user: { id: 'user1' } },
      projects,
      citations,
      authors: [],
      books: [],
      authorFolderMemberships: [],
      setProjects,
      setCitations,
      setAuthors: vi.fn(),
      setAuthorFolders: vi.fn(),
      setAuthorFolderMemberships: vi.fn(),
      setBooks: vi.fn(),
      setChapterBlocksByBook: vi.fn(),
    });
    return { projects, ...controller };
  });

it('clearing a saved page in the actual edit form clears it on the server', async () => {
  const server = { text: citation.text, page: '12', author_id: 'a1', book_id: 'b1' };
  const rows = {
    citations: { author: { name: 'Author' }, book: { id: 'b1', title: 'Book' } },
    profiles: { username: 'Reader' },
    authors: { id: 'a1', name: 'Author', sort_index: 0, is_self: false },
    books: { id: 'b1', title: 'Book', sort_index: 0 },
  };
  mocks.from.mockImplementation((table: keyof typeof rows) => {
    let patch: Record<string, unknown> | null = null;
    const q = {
      select: () => q,
      eq: () => q,
      update: (value: Record<string, unknown>) => {
        patch = value;
        return q;
      },
      single: async () => ({ data: rows[table], error: null }),
      maybeSingle: async () => {
        if (patch && table === 'citations') Object.assign(server, patch);
        return { data: patch ? { id: 'c1' } : rows[table], error: null };
      },
      then: (resolve: (result: unknown) => void) => {
        if (patch && table === 'citations') Object.assign(server, patch);
        return Promise.resolve({ data: null, error: null }).then(resolve);
      },
    };
    return q;
  });
  let saved!: Promise<boolean>;
  render(
    <CitationCard
      citation={citation}
      index={0}
      username="Reader"
      showDetailActions
      isSelected={false}
      onToggleSelect={vi.fn()}
      onAddNote={vi.fn()}
      onUpdateNote={vi.fn()}
      onDeleteNote={vi.fn()}
      onDelete={vi.fn()}
      onRetrySave={vi.fn()}
      onUpdate={(id, patch) => {
        saved = updateCitation('user1', id, patch).then(() => true);
        return saved;
      }}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: '편집' }));
  fireEvent.change(screen.getByRole('textbox', { name: '페이지 수정' }), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await act(async () => {
    await saved;
  });
  expect(server.page).toBeFalsy();
});

it('saves page removal and rebased formatting together, guarded by the original text', async () => {
  let patch: Record<string, unknown> | undefined;
  const matches: [string, unknown][] = [];
  mocks.from.mockImplementation(() => {
    const q = {
      update: (value: Record<string, unknown>) => {
        patch = value;
        return q;
      },
      eq: (key: string, value: unknown) => {
        matches.push([key, value]);
        return q;
      },
      select: () => q,
      maybeSingle: async () => ({ data: { id: 'c1' }, error: null }),
    };
    return q;
  });
  const result = await updateCitation(
    'user1',
    'c1',
    {
      text: 'Edited sentence',
      page: null,
      textFormats: [{ start: 0, end: 6, bold: true }],
    },
    citation.text
  );
  expect(patch).toMatchObject({
    text: 'Edited sentence',
    page: null,
    page_sort: null,
    text_formats: [{ start: 0, end: 6, bold: true }],
  });
  expect(matches).toContainEqual(['text', citation.text]);
  expect(result.page).toBeUndefined();
});

it('a folder created while reordering remains visible when the reorder response completes', async () => {
  let finish!: () => void;
  mocks.reorder.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      })
  );
  mocks.createProject.mockResolvedValue({ id: 'D', name: 'D', citationIds: [] });
  const { result } = mutations();
  let request!: Promise<boolean>;
  act(() => {
    request = result.current.handleReorderProjects(0, 3);
  });
  await act(async () => {
    await result.current.handleCreateProject('D');
  });
  expect(result.current.projects.some((p) => p.id === 'D')).toBe(true);
  await act(async () => {
    finish();
    await request;
  });
  expect(result.current.projects.some((p) => p.id === 'D')).toBe(true);
});

it('failed atomic create-and-attach does not issue a separate folder creation', async () => {
  mocks.createWithCitations.mockRejectedValue(new Error('attachment failed'));
  const { result } = mutations();
  await act(async () => {
    expect(await result.current.handleCreateProjectWithCitations('New folder', ['c1'])).toBe(false);
  });
  expect(mocks.createProject).not.toHaveBeenCalled();
  expect(result.current.projects).toEqual(initialProjects);
});

it('retries an uncertain project creation with the same ID', async () => {
  mocks.createWithCitations.mockRejectedValueOnce(new Error('response lost'));
  mocks.createWithCitations.mockImplementationOnce(async (_user, id, name, ids) => ({
    id,
    name,
    citationIds: ids,
  }));
  const { result } = mutations();
  await act(async () => {
    expect(await result.current.handleCreateProjectWithCitations('New folder', ['c1'])).toBe(false);
  });
  const id = mocks.createWithCitations.mock.calls[0][1];
  await act(async () => {
    expect(await result.current.handleCreateProjectWithCitations('New folder', ['c1'])).toBe(true);
  });
  expect(mocks.createWithCitations.mock.calls[1][1]).toBe(id);
  expect(result.current.projects.filter((p) => p.id === id)).toHaveLength(1);
});

it('a failed reorder preserves newly created folders while restoring the prior order', async () => {
  let fail!: (error: Error) => void;
  mocks.reorder.mockImplementation(
    () =>
      new Promise<void>((_, reject) => {
        fail = reject;
      })
  );
  mocks.createProject.mockResolvedValue({ id: 'D', name: 'D', citationIds: [] });
  const { result } = mutations();
  let request!: Promise<boolean>;
  act(() => {
    request = result.current.handleReorderProjects(0, 3);
  });
  await act(async () => {
    await result.current.handleCreateProject('D');
  });
  await act(async () => {
    fail(new Error('offline'));
    expect(await request).toBe(false);
  });
  expect(result.current.projects.map((p) => p.id)).toEqual(['A', 'B', 'C', 'D']);
});

it('slow earlier preference writes cannot replace a newer font-size change', async () => {
  vi.useFakeTimers();
  let server = { ...basePreferences };
  const pending: { value: typeof basePreferences; finish: () => void }[] = [];
  mocks.readPreferences.mockResolvedValue(basePreferences);
  mocks.savePreferences.mockImplementation(
    (_userId: string, value: typeof basePreferences) =>
      new Promise<void>((resolve) => {
        pending.push({
          value,
          finish: () => {
            server = value;
            resolve();
          },
        });
      })
  );
  const { result } = renderHook(() => useUserPreferences('user1'));
  await act(async () => {});
  await act(async () => {
    await vi.advanceTimersByTimeAsync(301);
  });
  await act(async () => {
    pending[0].finish();
  });
  act(() => result.current.setBaseFontPt(16));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(301);
  });
  act(() => result.current.setBaseFontPt(20));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(301);
  });
  expect(pending.slice(1).map((r) => r.value.baseFontPt)).toEqual([16]);
  await act(async () => {
    pending[1].finish();
  });
  expect(pending[2].value.baseFontPt).toBe(20);
  await act(async () => {
    pending[2].finish();
  });
  expect(result.current.preferences.baseFontPt).toBe(20);
  expect(server.baseFontPt).toBe(20);
});

it.each(['citation', 'note', 'author folder'])(
  'editing a concurrently deleted %s reports failure',
  async (target) => {
    mocks.from.mockImplementation(() => {
      const q = {
        update: () => q,
        eq: () => q,
        select: () => q,
        maybeSingle: async () => ({ data: null, error: null }),
        then: (resolve: (result: unknown) => void) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      };
      return q;
    });
    const request =
      target === 'citation'
        ? updateCitation('user1', 'already-deleted', { text: 'Unsaved edit' })
        : target === 'note'
          ? updateNote('user1', 'already-deleted', 'Unsaved edit')
          : renameAuthorFolder('user1', 'already-deleted', 'Unsaved edit');
    await expect(request).rejects.toThrow();
  }
);

it('fetches the complete archive when the backend limits each response to 1000 rows', async () => {
  const allRows = Array.from({ length: 1005 }, (_, index) => ({
    id: `row-${index}`,
    text: 'Saved sentence',
    page: null,
    created_at: '2026-10-09T00:00:00Z',
    author: null,
    book: null,
    notes: [],
    highlights: [],
    text_formats: [],
  }));
  mocks.from.mockImplementation((table: string) => {
    let start = 0,
      end = 999;
    const q = {
      select: () => q,
      order: () => q,
      eq: () => q,
      range: (from: number, to: number) => {
        start = from;
        end = to;
        return q;
      },
      then: (resolve: (result: unknown) => void) =>
        Promise.resolve({
          data: table === 'citations' ? allRows.slice(start, Math.min(end + 1, start + 1000)) : [],
          error: null,
        }).then(resolve),
    };
    return q;
  });
  expect(await fetchCitations()).toHaveLength(1005);
});
