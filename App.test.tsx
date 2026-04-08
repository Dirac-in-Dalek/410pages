import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const mockHandleUpdateUsername = vi.fn();
const mockSetBaseFontPt = vi.fn();
const mockCitationList = vi.fn();
const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const authState = {
  session: { user: { id: 'user-1' } },
  username: 'Committed Name',
  loading: false,
  handleUpdateUsername: mockHandleUpdateUsername,
  handleSignOut: vi.fn(),
};

const archiveDataState = {
  projects: [],
  setProjects: vi.fn(),
  citations: [],
  setCitations: vi.fn(),
  loading: false,
  fetchData: vi.fn(),
  chapterBlocksByBook: {},
  handleAddCitation: vi.fn(),
  handleAddNote: vi.fn(),
  handleUpdateNote: vi.fn(),
  handleDeleteNote: vi.fn(),
  handleDeleteCitation: vi.fn(),
  handleUpdateCitation: vi.fn(),
  handleBulkUpdateCitationSource: vi.fn(),
  handleCreateProject: vi.fn(),
  handleRenameProject: vi.fn(),
  handleDeleteProject: vi.fn(),
  handleRenameAuthor: vi.fn(),
  handleRenameBook: vi.fn(),
  handleLoadChapterBlocks: vi.fn(),
  handleCreateChapterBlock: vi.fn(),
  handleDeleteChapterBlock: vi.fn(),
  handleDropCitationToProject: vi.fn(),
  handleReorderProjects: vi.fn(),
};

const archiveFilterState = {
  searchTerm: '',
  setSearchTerm: vi.fn(),
  selectedProjectId: null,
  selectedBookId: null,
  isBookView: false,
  handleProjectSelect: vi.fn(),
  handleTreeItemClick: vi.fn(),
  treeData: [],
  filteredCitations: [],
  viewTitle: 'Archive',
  editorPrefill: null,
  filter: null,
  sortField: 'date' as const,
  dateDirection: 'desc' as const,
  pageDirection: 'desc' as const,
  handleDateSortClick: vi.fn(),
  handlePageSortClick: vi.fn(),
  handleReorderAuthorAt: vi.fn(),
  handleReorderBookAt: vi.fn(),
};

const bulkSelectionState = {
  selectedIds: new Set<string>(),
  isCopying: false,
  handleToggleSelect: vi.fn(),
  handleSelectAll: vi.fn(),
  handleBatchCopy: vi.fn(),
  handleBatchDelete: vi.fn(),
  handleBatchAddToProject: vi.fn(),
  handleBatchCreateAndAddToProject: vi.fn(),
  setSelectedIds: vi.fn(),
};

vi.mock('./hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    preferences: {
      theme: 'system',
      fontFamily: 'pretendard',
      baseFontPt: 16,
    },
    setTheme: vi.fn(),
    setFontFamily: vi.fn(),
    setBaseFontPt: mockSetBaseFontPt,
  }),
}));

vi.mock('./hooks/useAuthStatus', () => ({
  useAuthStatus: () => authState,
}));

vi.mock('./hooks/useArchiveData', () => ({
  useArchiveData: () => archiveDataState,
}));

vi.mock('./hooks/useArchiveFilter', () => ({
  useArchiveFilter: () => archiveFilterState,
}));

vi.mock('./hooks/useBulkSelection', () => ({
  useBulkSelection: () => bulkSelectionState,
}));

vi.mock('./components/MainLayout', () => ({
  MainLayout: ({ children, onOpenSettings }: { children: React.ReactNode; onOpenSettings: () => void }) => (
    <div>
      <button type="button" onClick={onOpenSettings}>
        open-settings
      </button>
      {children}
    </div>
  ),
}));

vi.mock('./components/MobileLayout', () => ({
  MobileLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./components/settings/SettingsPanel', () => ({
  SettingsPanel: (props: any) =>
    props.isOpen ? (
      <div>
        <div data-testid="settings-display-name">{props.displayName}</div>
        <div data-testid="settings-saved-display-name">{props.savedDisplayName}</div>
        {props.displayNameError ? (
          <div data-testid="settings-display-name-error">{props.displayNameError}</div>
        ) : null}
        <input
          aria-label="mock-settings-display-name"
          value={props.displayName}
          onChange={(event) => props.onDisplayNameChange(event.target.value)}
        />
        <button type="button" onClick={() => props.onDisplayNameChange('Draft Name')}>
          change-display-name
        </button>
        <button type="button" onClick={() => props.onDisplayNameCommit(props.displayName)}>
          commit-display-name
        </button>
        <button type="button" onClick={() => props.onBaseFontPtChange(22)}>
          change-font-size
        </button>
        <button type="button" onClick={props.onClose}>
          close-settings
        </button>
      </div>
    ) : null,
}));

vi.mock('./Auth', () => ({
  Auth: () => <div>auth-screen</div>,
}));

vi.mock('./components/pdf-reader/PdfReaderPage', () => ({
  PdfReaderPage: () => <div>pdf-reader</div>,
}));

vi.mock('./components/BulkActionToolbar', () => ({
  BulkActionToolbar: () => null,
}));

vi.mock('./components/ConfirmModal', () => ({
  ConfirmModal: () => null,
}));

vi.mock('./components/ArchiveHeader', () => ({
  ArchiveHeader: () => null,
}));

vi.mock('./components/CitationList', () => ({
  CitationList: (props: any) => mockCitationList(props),
}));

describe('App settings display-name flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleUpdateUsername.mockResolvedValue(true);
    mockSetBaseFontPt.mockReset();
    authState.username = 'Committed Name';

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(max-width: 1024px)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('restores the committed display name after close and reopen', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'open-settings' }));
    expect(screen.getByTestId('settings-display-name').textContent).toBe('Committed Name');

    await user.click(screen.getByRole('button', { name: 'change-display-name' }));
    expect(screen.getByTestId('settings-display-name').textContent).toBe('Draft Name');

    await user.click(screen.getByRole('button', { name: 'close-settings' }));
    expect(screen.queryByTestId('settings-display-name')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'open-settings' }));
    expect(screen.getByTestId('settings-display-name').textContent).toBe('Committed Name');
  });

  it('shows a save error while open and clears it on close', async () => {
    const user = userEvent.setup();
    mockHandleUpdateUsername.mockResolvedValue(false);

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'open-settings' }));
    await user.click(screen.getByRole('button', { name: 'change-display-name' }));
    await user.click(screen.getByRole('button', { name: 'commit-display-name' }));

    await waitFor(() => {
      expect(screen.getByTestId('settings-display-name-error').textContent).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'close-settings' }));
    expect(screen.queryByTestId('settings-display-name-error')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'open-settings' }));
    expect(screen.queryByTestId('settings-display-name-error')).toBeNull();
    expect(screen.getByTestId('settings-display-name').textContent).toBe('Committed Name');
  });

  it('wires settings font-size changes to setBaseFontPt', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'open-settings' }));
    await user.click(screen.getByRole('button', { name: 'change-font-size' }));

    expect(mockSetBaseFontPt).toHaveBeenCalledWith(22);
  });

  it('clears the save error after a successful retry', async () => {
    const user = userEvent.setup();
    mockHandleUpdateUsername.mockResolvedValue(false);

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'open-settings' }));
    await user.click(screen.getByRole('button', { name: 'change-display-name' }));
    await user.click(screen.getByRole('button', { name: 'commit-display-name' }));

    await waitFor(() => {
      expect(screen.getByTestId('settings-display-name-error').textContent).toBeTruthy();
    });

    mockHandleUpdateUsername.mockResolvedValue(true);
    await user.click(screen.getByRole('button', { name: 'commit-display-name' }));

    await waitFor(() => {
      expect(screen.queryByTestId('settings-display-name-error')).toBeNull();
    });
  });

  it('syncs the reopened draft when the committed username changes after a pending save', async () => {
    const user = userEvent.setup();
    const deferredSave = createDeferred<boolean>();
    mockHandleUpdateUsername.mockReturnValue(deferredSave.promise);

    const { rerender } = render(<App />);

    await user.click(screen.getByRole('button', { name: 'open-settings' }));
    await user.click(screen.getByRole('button', { name: 'change-display-name' }));
    await user.click(screen.getByRole('button', { name: 'commit-display-name' }));

    await user.click(screen.getByRole('button', { name: 'close-settings' }));
    await user.click(screen.getByRole('button', { name: 'open-settings' }));
    expect(screen.getByTestId('settings-display-name').textContent).toBe('Committed Name');

    authState.username = 'Draft Name';
    rerender(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('settings-display-name').textContent).toBe('Draft Name');
    });

    deferredSave.resolve(true);
    await deferredSave.promise;
    expect(screen.getByTestId('settings-display-name').textContent).toBe('Draft Name');
  });

  it('preserves newer local display-name edits when an earlier save resolves', async () => {
    const user = userEvent.setup();
    const deferredSave = createDeferred<boolean>();
    mockHandleUpdateUsername.mockReturnValue(deferredSave.promise);

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'open-settings' }));

    const input = screen.getByRole('textbox', { name: 'mock-settings-display-name' });
    await user.clear(input);
    await user.type(input, 'First Draft');
    await user.click(screen.getByRole('button', { name: 'commit-display-name' }));

    await user.clear(input);
    await user.type(input, 'Newer Local Draft');
    expect(screen.getByTestId('settings-display-name').textContent).toBe('Newer Local Draft');

    await act(async () => {
      deferredSave.resolve(true);
      await deferredSave.promise;
    });

    expect(screen.getByTestId('settings-display-name').textContent).toBe('Newer Local Draft');
  });
});

describe('App book view chapter blocks wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleUpdateUsername.mockResolvedValue(true);
    mockSetBaseFontPt.mockReset();
    mockCitationList.mockReset();
    authState.username = 'Committed Name';
    archiveFilterState.selectedBookId = null;
    archiveFilterState.isBookView = false;
    archiveDataState.chapterBlocksByBook = {};

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(max-width: 1024px)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('passes book-view chapter blocks only when a book is selected', async () => {
    const { rerender } = render(<App />);
    const firstProps = mockCitationList.mock.calls.at(-1)?.[0];

    expect(archiveDataState.handleLoadChapterBlocks).not.toHaveBeenCalled();
    expect(firstProps?.isBookView).toBe(false);
    expect(firstProps?.chapterBlocks).toEqual([]);

    archiveFilterState.selectedBookId = 'book-1';
    archiveFilterState.isBookView = true;
    archiveDataState.chapterBlocksByBook = {
      'book-1': [
        {
          id: 'block-1',
          bookId: 'book-1',
          label: '3장',
          pageSort: 12,
          createdAtSort: 1,
          createdAt: 1,
        },
      ],
    };

    rerender(<App />);
    const secondProps = mockCitationList.mock.calls.at(-1)?.[0];

    expect(archiveDataState.handleLoadChapterBlocks).toHaveBeenCalledWith('book-1');
    expect(secondProps?.isBookView).toBe(true);
    expect(secondProps?.chapterBlocks).toEqual([
      {
        id: 'block-1',
        bookId: 'book-1',
        label: '3장',
        pageSort: 12,
        createdAtSort: 1,
        createdAt: 1,
      },
    ]);
  });
});
