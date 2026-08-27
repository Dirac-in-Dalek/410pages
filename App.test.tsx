import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const mockHandleUpdateUsername = vi.fn();
const mockSetBaseFontPt = vi.fn();
const mockSetCitationWidthRem = vi.fn();
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
  authorFolderLoading: false,
  authorFolderLoadError: null,
  retryAuthorFolders: vi.fn(),
  handleUpdateUsername: mockHandleUpdateUsername,
  handleSignOut: vi.fn(),
};

const archiveDataState = {
  projects: [],
  setProjects: vi.fn(),
  citations: [],
  setCitations: vi.fn(),
  authors: [],
  setAuthors: vi.fn(),
  authorFolders: [],
  setAuthorFolders: vi.fn(),
  authorFolderMemberships: [],
  setAuthorFolderMemberships: vi.fn(),
  books: [],
  setBooks: vi.fn(),
  loading: false,
  fetchData: vi.fn(),
  chapterBlocksByBook: {},
  handleAddCitation: vi.fn(),
  handleAddNote: vi.fn(),
  handleUpdateNote: vi.fn(),
  handleDeleteNote: vi.fn(),
  handleDeleteCitations: vi.fn(),
  handleUpdateCitation: vi.fn(),
  handleBulkUpdateCitationSource: vi.fn(),
  handleCreateAuthor: vi.fn(),
  handleCreateAuthorFolder: vi.fn(),
  handleRenameAuthorFolder: vi.fn(),
  handleDeleteAuthorFolder: vi.fn(),
  handleMoveAuthorToFolder: vi.fn(),
  handleRemoveAuthorFromFolder: vi.fn(),
  handleDeleteAuthorCascade: vi.fn(),
  handlePreviewAuthorDeletion: vi.fn(),
  handleDeleteBookCascade: vi.fn(),
  handlePreviewBookDeletion: vi.fn(),
  handleCreateBook: vi.fn(),
  handleCreateProject: vi.fn(),
  handleRenameProject: vi.fn(),
  handleDeleteProject: vi.fn(),
  handleRenameAuthor: vi.fn(),
  handleRenameBook: vi.fn(),
  handleLoadChapterBlocks: vi.fn(),
  cancelChapterBlockLoad: vi.fn(),
  handleCreateChapterBlock: vi.fn(),
  handleDeleteChapterBlock: vi.fn(),
  handleDropCitationToProject: vi.fn(),
  handleAddCitationsToProject: vi.fn(),
  handleCreateProjectWithCitations: vi.fn(),
  handleReorderProjects: vi.fn(),
};

const archiveFilterState = {
  searchTerm: '',
  setSearchTerm: vi.fn(),
  selectedProjectId: null,
  selectedBookId: null,
  selectedAuthorId: null,
  isHomeView: true,
  isAuthorView: false,
  isBookView: false,
  handleProjectSelect: vi.fn(),
  handleHomeSelect: vi.fn(),
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
  handleBookSourceSelect: vi.fn(),
  handleAuthorSourceSelect: vi.fn(),
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

vi.mock('./features/settings/logic/useUserPreferences', () => ({
  useUserPreferences: () => ({
    preferences: {
      theme: 'auto',
      fontFamily: 'pretendard',
      baseFontPt: 13,
      citationWidthRem: 44,
    },
    setTheme: vi.fn(),
    setFontFamily: vi.fn(),
    setBaseFontPt: mockSetBaseFontPt,
    setCitationWidthRem: mockSetCitationWidthRem,
  }),
}));

vi.mock('./hooks/useAuthStatus', () => ({
  useAuthStatus: () => authState,
}));

vi.mock('./features/archive/logic/useArchiveDataController', () => ({
  useArchiveDataController: () => archiveDataState,
}));

vi.mock('./hooks/useArchiveFilter', () => ({
  useArchiveFilter: () => archiveFilterState,
}));

vi.mock('./hooks/useBulkSelection', () => ({
  useBulkSelection: () => bulkSelectionState,
}));

vi.mock('./components/MainLayout', () => ({
  MainLayout: ({
    children,
    onOpenSettings,
  }: {
    children: React.ReactNode;
    onOpenSettings: () => void;
  }) => (
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

vi.mock('./features/settings/ui/SettingsPanel', () => ({
  SettingsPanel: (props: any) =>
    props.isOpen ? (
      <div>
        <div data-testid="settings-display-name">{props.displayName}</div>
        <div data-testid="settings-saved-display-name">{props.savedDisplayName}</div>
        {props.displayNameError ? (
          <div data-testid="settings-display-name-error">{props.displayNameError}</div>
        ) : null}
        {props.isDisplayNameSaved ? (
          <div data-testid="settings-display-name-saved">saved</div>
        ) : null}
        <input
          aria-label="mock-settings-display-name"
          value={props.displayName}
          onChange={(event) => props.onDisplayNameChange(event.target.value)}
        />
        <button type="button" disabled={props.isSavingDisplayName} onClick={() => props.onDisplayNameChange('Draft Name')}>
          change-display-name
        </button>
        <button type="button" disabled={props.isSavingDisplayName} onClick={() => props.onDisplayNameCommit(props.displayName)}>
          commit-display-name
        </button>
        <button type="button" onClick={() => props.onBaseFontPtChange(22)}>
          change-font-size
        </button>
        <button type="button" onClick={() => props.onCitationWidthRemChange(48)}>
          change-citation-width
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

vi.mock('./features/archive/ui/ArchiveHeader', () => ({
  ArchiveHeader: () => null,
}));

vi.mock('./features/archive/ui/CitationList', () => ({
  CitationList: (props: any) => mockCitationList(props),
}));

describe('App settings display-name flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleUpdateUsername.mockResolvedValue(true);
    mockSetBaseFontPt.mockReset();
    mockSetCitationWidthRem.mockReset();
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

  it('preserves a failed display-name draft across close and reopen', async () => {
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
    expect(screen.getByTestId('settings-display-name-error').textContent).toBeTruthy();
    expect(screen.getByTestId('settings-display-name').textContent).toBe('Draft Name');
  });

  it('converts a rejected name save into the visible failure state', async () => {
    const user = userEvent.setup();
    mockHandleUpdateUsername.mockRejectedValueOnce(new Error('network failed'));
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'open-settings' }));
    await user.click(screen.getByRole('button', { name: 'change-display-name' }));
    await user.click(screen.getByRole('button', { name: 'commit-display-name' }));

    await waitFor(() => {
      expect(screen.getByTestId('settings-display-name-error').textContent).toBe('이름 저장에 실패했습니다.');
    });
  });

  it('wires settings font-size changes to setBaseFontPt', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'open-settings' }));
    await user.click(screen.getByRole('button', { name: 'change-font-size' }));

    expect(mockSetBaseFontPt).toHaveBeenCalledWith(22);
  });

  it('wires settings citation width changes to setCitationWidthRem', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'open-settings' }));
    await user.click(screen.getByRole('button', { name: 'change-citation-width' }));

    expect(mockSetCitationWidthRem).toHaveBeenCalledWith(48);
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
      expect(screen.getByTestId('settings-display-name-saved')).toBeTruthy();
    });
  });

  it('preserves the submitted draft while a save is pending and syncs the committed result', async () => {
    const user = userEvent.setup();
    const deferredSave = createDeferred<boolean>();
    mockHandleUpdateUsername.mockReturnValue(deferredSave.promise);

    const { rerender } = render(<App />);

    await user.click(screen.getByRole('button', { name: 'open-settings' }));
    await user.click(screen.getByRole('button', { name: 'change-display-name' }));
    await user.click(screen.getByRole('button', { name: 'commit-display-name' }));

    await user.click(screen.getByRole('button', { name: 'close-settings' }));
    await user.click(screen.getByRole('button', { name: 'open-settings' }));
    expect(screen.getByTestId('settings-display-name').textContent).toBe('Draft Name');

    authState.username = 'Draft Name';
    rerender(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('settings-display-name').textContent).toBe('Draft Name');
    });

    deferredSave.resolve(true);
    await deferredSave.promise;
    expect(screen.getByTestId('settings-display-name').textContent).toBe('Draft Name');
  });

  it('keeps a pending name save locked across close and reopen', async () => {
    const user = userEvent.setup();
    const deferredSave = createDeferred<boolean>();
    mockHandleUpdateUsername.mockReturnValue(deferredSave.promise);
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'open-settings' }));
    await user.click(screen.getByRole('button', { name: 'change-display-name' }));
    await user.click(screen.getByRole('button', { name: 'commit-display-name' }));
    await user.click(screen.getByRole('button', { name: 'close-settings' }));
    await user.click(screen.getByRole('button', { name: 'open-settings' }));

    expect((screen.getByRole('button', { name: 'change-display-name' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'commit-display-name' }) as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      deferredSave.resolve(true);
      await deferredSave.promise;
    });

    await waitFor(() => expect((screen.getByRole('button', { name: 'change-display-name' }) as HTMLButtonElement).disabled).toBe(false));
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

describe('App author flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleUpdateUsername.mockResolvedValue(true);
    archiveDataState.handleCreateAuthor.mockResolvedValue({
      id: 'author-a',
      name: 'Author A',
      sortIndex: 1,
      createdAt: 1,
      isSelf: false,
    });

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

  it('opens the created author from the first home tile', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: '저자 추가' }));
    await user.type(screen.getByRole('textbox', { name: '저자 이름' }), 'Author A');
    await user.click(screen.getByRole('button', { name: '추가' }));

    await waitFor(() => {
      expect(archiveDataState.handleCreateAuthor).toHaveBeenCalledWith('Author A');
      expect(archiveFilterState.handleAuthorSourceSelect).toHaveBeenCalledWith({
        id: 'author-a',
        name: 'Author A',
        sortIndex: 1,
        createdAt: 1,
        isSelf: false,
      });
    });
  });
});

describe('App book view chapter blocks wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleUpdateUsername.mockResolvedValue(true);
    mockSetBaseFontPt.mockReset();
    mockSetCitationWidthRem.mockReset();
    mockCitationList.mockReset();
    authState.username = 'Committed Name';
    archiveFilterState.selectedBookId = null;
    archiveFilterState.isBookView = false;
    archiveFilterState.isHomeView = true;
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

  it('loads and passes chapter blocks when a book is selected', async () => {
    const { rerender } = render(<App />);

    expect(archiveDataState.handleLoadChapterBlocks).not.toHaveBeenCalled();
    expect(mockCitationList).not.toHaveBeenCalled();

    archiveFilterState.selectedBookId = 'book-1';
    archiveFilterState.isBookView = true;
    archiveFilterState.isHomeView = false;
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
