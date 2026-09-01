import React from 'react';
import { MainLayout } from '../components/MainLayout';
import { Auth } from '../Auth';
import { MobileLayout } from '../components/MobileLayout';
import { useAuthStatus } from '../hooks/useAuthStatus';
import { useArchiveFilter } from '../hooks/useArchiveFilter';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { ArchiveScreen } from '../features/archive/ui/ArchiveScreen';
import { LibraryHome } from '../features/archive/ui/LibraryHome';
import { AuthorBooks } from '../features/archive/ui/AuthorBooks';
import { useArchiveDataController as useArchiveData } from '../features/archive/logic/useArchiveDataController';
import { ReaderScreen } from '../features/reader/ui/ReaderScreen';
import { useUserPreferences } from '../features/settings/logic/useUserPreferences';
import { useSettingsPanelController } from '../features/settings/logic/useSettingsPanelController';
import { SettingsPanel } from '../features/settings/ui/SettingsPanel';
import { createArchiveScreenProps } from './logic/createArchiveScreenProps';
import { createReaderScreenProps } from './logic/createReaderScreenProps';
import { createMainLayoutProps, createMobileLayoutProps } from './logic/createLayoutProps';
import { useAppShellState } from './logic/useAppShellState';
import { useAppViewMode } from './logic/useAppViewMode';
import { useResponsiveMode } from './useResponsiveMode';
import {
  clearPdfReaderSession,
  hasPdfReaderSession,
  readPdfReaderSession,
  removePdfReaderCitationHighlights,
  updatePdfReaderBook,
} from '../features/reader/logic/pdfReaderSession';
import type { BookSource, PdfReaderMeta } from '../types';
import { useUndoableCitationDelete } from '../features/archive/logic/useUndoableCitationDelete';
import { UndoDeleteToasts } from '../features/archive/ui/UndoDeleteToasts';
import { BookMemoPanel } from '../features/archive/ui/BookMemoPanel';
import { PassageNotesPanel } from '../features/archive/ui/PassageNotesPanel';
import { NotebookPen } from 'lucide-react';

type AuthStatus = ReturnType<typeof useAuthStatus>;

const AuthenticatedAppShell: React.FC<{ authStatus: AuthStatus }> = ({ authStatus }) => {
  const { isMobileApp } = useResponsiveMode();
  const [isOnline, setIsOnline] = React.useState(() => navigator.onLine);
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const {
    session, username, avatarUrl, loading: authLoading,
    handleUpdateUsername, handleUpdateAvatar, handleSignOut
  } = authStatus;
  const { preferences, setTheme, setFontFamily, setBaseFontPt, setCitationWidthRem } =
    useUserPreferences(session?.user?.id ?? null, { documentThemeOverride: session ? null : 'day' });

  const {
    projects: canonicalProjects, citations: canonicalCitations, authors, authorFolders, authorFolderMemberships, books, chapterBlocksByBook, loading: dataLoading, loadError, authorFolderLoading, authorFolderLoadError, chapterLoadError, chapterLoadingBookId,
    fetchData, retryAuthorFolders, handleAddCitation, handleAddCitationOptimistic, handleRetryCitationSave, resolveCitationId, handleAddNote, handleUpdateNote,
    handleDeleteNote, handleDeleteCitations, handleUpdateCitation,
    handleBulkUpdateCitationSource, handleCreateAuthor, handleCreateAuthorFolder, handleRenameAuthorFolder, handleDeleteAuthorFolder,
    handleMoveAuthorToFolder, handleRemoveAuthorFromFolder, handleDeleteAuthorCascade, handlePreviewAuthorDeletion,
    handleDeleteBookCascade, handlePreviewBookDeletion, handleCreateBook,
    handleCreateProject, handleRenameProject, handleDeleteProject, handleRenameAuthor, handleRenameBook, handleUpdateBookMemo,
    handleLoadChapterBlocks, cancelChapterBlockLoad, handleCreateChapterBlock, handleDeleteChapterBlock,
    handleDropCitationToProject, handleAddCitationsToProject, handleCreateProjectWithCitations, handleReorderProjects,
    mutationError, clearMutationError
  } = useArchiveData(session);

  const handleCommitCitationDeletes = React.useCallback(async (citationIds: string[]) => {
    const didDelete = await handleDeleteCitations(citationIds);
    if (didDelete && session?.user?.id) {
      removePdfReaderCitationHighlights(session.user.id, citationIds);
    }
    return didDelete;
  }, [handleDeleteCitations, session?.user?.id]);

  const {
    pendingDeletes,
    hiddenCitationIds,
    requestDeleteCitation,
    requestDeleteCitations,
    undoDeleteCitation,
    commitPendingDeletes,
    commitPendingDeletesForAuthor,
    commitPendingDeletesForBook,
  } = useUndoableCitationDelete({
    ownerKey: session?.user?.id ?? null,
    citations: canonicalCitations,
    onCommitDelete: handleCommitCitationDeletes,
  });

  const hiddenCitationIdSet = React.useMemo(
    () => new Set(hiddenCitationIds),
    [hiddenCitationIds]
  );
  const citations = React.useMemo(
    () => hiddenCitationIdSet.size === 0
      ? canonicalCitations
      : canonicalCitations.filter((citation) => !hiddenCitationIdSet.has(citation.id)),
    [canonicalCitations, hiddenCitationIdSet]
  );
  const projects = React.useMemo(() => hiddenCitationIdSet.size === 0
    ? canonicalProjects
    : canonicalProjects.map((project) => {
      const citationIds = project.citationIds.filter((citationId) => !hiddenCitationIdSet.has(citationId));
      return citationIds.length === project.citationIds.length ? project : { ...project, citationIds };
    }), [canonicalProjects, hiddenCitationIdSet]);

  const {
    searchTerm, setSearchTerm, selectedProjectId, selectedBookId, selectedAuthorId, isBookView, isAuthorView, isHomeView, handleProjectSelect, handleHomeSelect,
    handleTreeItemClick, treeData, filteredCitations, viewTitle,
    editorPrefill, filter, sortField, dateDirection, pageDirection,
    handleDateSortClick, handlePageSortClick, handleAuthorSourceSelect, handleBookSourceSelect,
    handleReorderBookAt, handleReorderAuthorAt, libraryOrderError, libraryOrderSaving, clearLibraryOrderError
  } = useArchiveFilter(
    citations,
    authors,
    authorFolders,
    authorFolderMemberships,
    books,
    projects,
    username,
    session?.user?.id,
    fetchData
  );

  const [passageNoteCitationId, setPassageNoteCitationId] = React.useState<string | null>(null);
  const [isMobileBookMemoOpen, setIsMobileBookMemoOpen] = React.useState(false);
  const [isDesktopBookMemoOpen, setIsDesktopBookMemoOpen] = React.useState(true);
  const selectedBook = selectedBookId ? books.find((book) => book.id === selectedBookId) ?? null : null;
  const passageNoteCitation = passageNoteCitationId
    ? citations.find((citation) => citation.id === passageNoteCitationId) ?? null
    : null;

  React.useEffect(() => {
    setPassageNoteCitationId(null);
    setIsMobileBookMemoOpen(false);
  }, [isBookView, selectedBookId, session?.user?.id]);

  React.useEffect(() => {
    if (passageNoteCitationId && !passageNoteCitation) setPassageNoteCitationId(null);
  }, [passageNoteCitation, passageNoteCitationId]);

  const handlePassageNoteCitationChange = React.useCallback((citationId: string | null) => {
    setPassageNoteCitationId(citationId);
    if (citationId) setIsMobileBookMemoOpen(false);
  }, []);

  const openDesktopBookMemo = React.useCallback(() => {
    setIsDesktopBookMemoOpen(true);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>('textarea[aria-label="책 전체 메모"]')?.focus();
    });
  }, []);

  const closeDesktopBookMemo = React.useCallback(() => {
    setIsDesktopBookMemoOpen(false);
    window.requestAnimationFrame(() => {
      document.getElementById('book-memo-open-button')?.focus();
    });
  }, []);

  const {
    selectedIds, isCopying, bulkError, clearBulkError, reportBulkError, handleToggleSelect, handleSelectAll,
    handleBatchCopy, handleBatchAddToProject,
    handleBatchCreateAndAddToProject, setSelectedIds
  } = useBulkSelection(
    filteredCitations,
    session,
    resolveCitationId,
    username,
    handleAddCitationsToProject,
    handleCreateProjectWithCitations
  );

  useAppShellState({
    sessionUserId: session?.user?.id,
    fetchData,
    selectedBookId,
    handleLoadChapterBlocks,
    cancelChapterBlockLoad,
  });
  const { viewMode, openArchive, openReader } = useAppViewMode({ isMobileApp });
  const [readerInitialMeta, setReaderInitialMeta] = React.useState<{
    userId: string;
    meta: PdfReaderMeta;
  } | null>(null);
  const handleSignOutWithReaderCleanup = React.useCallback(async () => {
    await commitPendingDeletes();
    if (session?.user?.id) clearPdfReaderSession(session.user.id);
    setReaderInitialMeta(null);
    await handleSignOut();
  }, [commitPendingDeletes, handleSignOut, session?.user?.id]);

  const { openSettings, settingsPanelProps } = useSettingsPanelController({
    isMobile: isMobileApp,
    username,
    avatarUrl,
    preferences,
    onThemeChange: setTheme,
    onFontFamilyChange: setFontFamily,
    onBaseFontPtChange: setBaseFontPt,
    onCitationWidthRemChange: setCitationWidthRem,
    onUpdateUsername: handleUpdateUsername,
    onUpdateAvatar: handleUpdateAvatar,
    onSignOut: handleSignOutWithReaderCleanup,
  });
  const handleRetryLoad = () => {
    if (loadError) return fetchData();
    if (selectedBookId) return handleLoadChapterBlocks(selectedBookId);
    return Promise.resolve();
  };
  const isSelectedChapterLoading = selectedBookId !== null && chapterLoadingBookId === selectedBookId;

  const settingsPanel = <SettingsPanel {...settingsPanelProps} />;
  const actionErrors = [
    mutationError ? { id: 'mutation', message: mutationError, dismiss: clearMutationError } : null,
    bulkError ? { id: 'bulk', message: bulkError, dismiss: clearBulkError } : null,
    libraryOrderError ? { id: 'library-order', message: libraryOrderError, dismiss: clearLibraryOrderError } : null,
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const mutationAlerts = actionErrors.length > 0 ? (
    <div className="fixed right-4 top-4 z-[90] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {actionErrors.map((error) => (
        <div
          key={error.id}
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-[var(--shadow-popover)] dark:border-red-500/30 dark:bg-[#2b2020] dark:text-red-100"
        >
          <p className="min-w-0 flex-1 leading-5">{error.message}</p>
          <button
            type="button"
            onClick={error.dismiss}
            className="min-h-8 shrink-0 rounded-lg px-2 font-semibold transition-[background-color,transform] hover:bg-red-100 active:scale-95 dark:hover:bg-red-300/10 motion-reduce:transition-none"
          >
            닫기
          </button>
        </div>
      ))}
    </div>
  ) : null;
  const networkNotice = !isOnline ? (
    <div
      role="status"
      className="fixed left-1/2 top-3 z-[95] w-[min(28rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-xl bg-[var(--text-main)] px-4 py-2.5 text-center text-sm font-medium text-[var(--bg-main)] shadow-[var(--shadow-popover)]"
    >
      오프라인입니다. 실패한 문장은 이 기기에 임시 보관됩니다.
    </div>
  ) : null;
  const handleRenameBookAndKeepSelection = async (bookId: string, name: string) => {
    const sourceBook = books.find((book) => book.id === bookId);
    const wasSelected = selectedBookId === bookId;
    const result = await handleRenameBook(bookId, name);
    if (!result) return false;
    if (!sourceBook) return true;

    const targetBook = books.find((book) => book.id === result.bookId) ?? sourceBook;
    updatePdfReaderBook(session.user.id, bookId, {
      bookId: result.bookId,
      author: targetBook.author,
      title: result.bookTitle,
    });
    if (!wasSelected) return true;

    handleBookSourceSelect({
      ...targetBook,
      id: result.bookId,
      title: result.bookTitle,
      sortIndex: result.bookSortIndex,
      memo: result.bookMemo,
    });
    return true;
  };
  const handleRenameAuthorAndKeepSelection = async (authorId: string, name: string) => {
    const selectedBook = selectedBookId ? books.find((book) => book.id === selectedBookId) : undefined;
    const sourceBooks = books.filter((book) => book.authorId === authorId);
    const wasSelectedAuthor = filter?.type === 'author' && filter.authorId === authorId;
    const result = await handleRenameAuthor(authorId, name);
    if (!result) return false;

    sourceBooks.forEach((sourceBook) => {
      const merge = result.bookMerges.find((entry) => entry.fromBookId === sourceBook.id);
      updatePdfReaderBook(session.user.id, sourceBook.id, {
        bookId: merge?.toBookId ?? sourceBook.id,
        author: result.authorName,
        title: merge?.toBookTitle ?? sourceBook.title,
      });
    });

    if (selectedBook?.authorId === result.fromAuthorId) {
      const merge = result.bookMerges.find((entry) => entry.fromBookId === selectedBook.id);
      const targetId = merge?.toBookId ?? selectedBook.id;
      const targetBook = books.find((book) => book.id === targetId) ?? selectedBook;
      handleBookSourceSelect({
        ...targetBook,
        id: targetId,
        title: merge?.toBookTitle ?? targetBook.title,
        sortIndex: merge?.toBookSortIndex ?? targetBook.sortIndex,
        memo: merge?.toBookMemo ?? targetBook.memo,
        authorId: result.authorId,
        author: result.authorName,
        authorSortIndex: result.authorSortIndex,
        isSelf: result.isSelf,
      });
    } else if (wasSelectedAuthor) {
      handleTreeItemClick({
        id: `author-${result.authorId}`,
        label: result.authorName,
        type: 'author',
        data: { authorId: result.authorId, author: result.authorName, book: '' },
      });
    }
    return true;
  };
  const handleDeleteAuthorAndCleanup = async (authorId: string) => {
    const sourceBookIds = books.filter((book) => book.authorId === authorId).map((book) => book.id);
    const didCommitPendingDeletes = await commitPendingDeletesForAuthor(authorId, sourceBookIds);
    if (!didCommitPendingDeletes) {
      reportBulkError('삭제 대기 중인 문장을 확정하지 못해 저자 삭제를 중단했습니다.');
      return undefined;
    }
    const result = await handleDeleteAuthorCascade(authorId);
    if (!result) return undefined;
    const readerSession = readPdfReaderSession(session.user.id);
    if (readerSession?.meta.bookId && result.deletedBookIds.includes(readerSession.meta.bookId)) {
      clearPdfReaderSession(session.user.id);
      setReaderInitialMeta(null);
      openArchive();
    }
    return result;
  };
  const handleDeleteBookAndCleanup = async (bookId: string) => {
    const deletedBook = books.find((book) => book.id === bookId);
    const didCommitPendingDeletes = await commitPendingDeletesForBook(bookId);
    if (!didCommitPendingDeletes) {
      reportBulkError('삭제 대기 중인 문장을 확정하지 못해 책 삭제를 중단했습니다.');
      return undefined;
    }
    const result = await handleDeleteBookCascade(bookId);
    if (!result) return undefined;
    const readerSession = readPdfReaderSession(session.user.id);
    if (readerSession?.meta.bookId === bookId) {
      clearPdfReaderSession(session.user.id);
      setReaderInitialMeta(null);
      openArchive();
    }
    if (selectedBookId === bookId) {
      const author = deletedBook
        ? authors.find((entry) => entry.id === deletedBook.authorId)
        : undefined;
      if (author) handleAuthorSourceSelect(author);
      else handleHomeSelect();
    }
    return result;
  };
  const sessionUserId = session.user.id;
  const hasActivePdfSession = hasPdfReaderSession(sessionUserId);
  const handleBeforeReadPdf = () =>
    !hasPdfReaderSession(sessionUserId) ||
    window.confirm('현재 열려 있는 PDF를 닫고 새 책의 PDF를 읽을까요?');
  const handleOpenPdfForBook = (book: BookSource) => {
    clearPdfReaderSession(sessionUserId);
    setReaderInitialMeta({
      userId: sessionUserId,
      meta: { bookId: book.id, author: book.author, title: book.title },
    });
    openReader();
  };
  const handleContinuePdf = () => {
    setReaderInitialMeta(null);
    openReader();
  };
  const selectedAuthor = selectedAuthorId
    ? authors.find((author) => author.id === selectedAuthorId)
    : undefined;
  const handleBatchDeleteRequest = () => {
    const selectedCitations = filteredCitations.filter((citation) => selectedIds.has(citation.id));
    const savingIds = selectedCitations
      .filter((citation) => citation.saveStatus === 'saving')
      .map((citation) => citation.id);
    const readyIds = selectedCitations
      .filter((citation) => citation.saveStatus !== 'saving')
      .map((citation) => citation.id);

    requestDeleteCitations(readyIds);
    setSelectedIds(new Set(savingIds));
    if (savingIds.length > 0) {
      reportBulkError(`저장 중인 ${savingIds.length}개 항목은 저장이 끝난 뒤 삭제할 수 있습니다.`);
    } else {
      clearBulkError();
    }
  };
  const archiveContent = isHomeView ? (
    <LibraryHome
      authors={authors}
      books={books}
      citations={citations}
      username={username}
      loading={dataLoading}
      loadError={loadError}
      onRetry={fetchData}
      onCreateAuthor={handleCreateAuthor}
      onAuthorSelect={handleAuthorSourceSelect}
      onRenameAuthor={handleRenameAuthorAndKeepSelection}
      onDeleteAuthor={handleDeleteAuthorAndCleanup}
      onPreviewAuthorDelete={handlePreviewAuthorDeletion}
      isMobileApp={isMobileApp}
    />
  ) : isAuthorView && selectedAuthor && !searchTerm ? (
    <AuthorBooks
      author={selectedAuthor}
      username={username}
      books={books}
      citations={citations}
      isMobileApp={isMobileApp}
      loading={dataLoading}
      loadError={loadError}
      onRetry={fetchData}
      onBack={handleHomeSelect}
      onCreateBook={handleCreateBook}
      onBookSelect={handleBookSourceSelect}
      onReadPdf={handleOpenPdfForBook}
      onBeforeReadPdf={handleBeforeReadPdf}
      onContinuePdf={hasActivePdfSession ? handleContinuePdf : undefined}
      onRenameBook={handleRenameBookAndKeepSelection}
      onDeleteBook={handleDeleteBookAndCleanup}
      onPreviewBookDelete={handlePreviewBookDeletion}
    />
  ) : (
    <ArchiveScreen {...createArchiveScreenProps({
      isMobileApp,
      title: viewTitle,
      username,
      editorPrefill,
      isBookView,
      onBackToAuthor: selectedAuthor ? () => handleAuthorSourceSelect(selectedAuthor) : undefined,
      authorName: selectedAuthor ? (selectedAuthor.isSelf ? username : selectedAuthor.name) : undefined,
      sortField,
      dateDirection,
      pageDirection,
      onAddCitation: handleAddCitationOptimistic,
      onRetryCitationSave: handleRetryCitationSave,
      onDateSortClick: handleDateSortClick,
      onPageSortClick: handlePageSortClick,
      projects,
      citations: filteredCitations,
      allCitations: citations,
      selectedProjectId,
      selectedBookId,
      chapterBlocksByBook,
      dataLoading: dataLoading || isSelectedChapterLoading,
      loadError: loadError ?? chapterLoadError,
      onRetryLoad: handleRetryLoad,
      authLoading,
      searchTerm,
      selectedIds,
      selectedFilter: filter,
      isCopying,
      onSelectAll: handleSelectAll,
      onCopy: handleBatchCopy,
      onBatchDeleteRequest: handleBatchDeleteRequest,
      onCancelSelection: () => setSelectedIds(new Set()),
      onAddToProject: handleBatchAddToProject,
      onCreateAndAddToProject: handleBatchCreateAndAddToProject,
      onCreateChapterBlock: handleCreateChapterBlock,
      onDeleteChapterBlock: handleDeleteChapterBlock,
      chapterActionsDisabled: isSelectedChapterLoading,
      onToggleSelect: handleToggleSelect,
      onAddNote: handleAddNote,
      onUpdateNote: handleUpdateNote,
      onDeleteNote: handleDeleteNote,
      onDeleteCitation: requestDeleteCitation,
      onUpdateCitation: handleUpdateCitation,
      passageNoteCitationId,
      onPassageNoteCitationChange: handlePassageNoteCitationChange,
    })} />
  );
  const mobileLayoutProps = createMobileLayoutProps({
    title: '410pages',
    projects,
    selectedProjectId,
    onProjectSelect: handleProjectSelect,
    onCreateProject: handleCreateProject,
    books,
    citations,
    isHomeView,
    selectedBookId,
    onHomeSelect: handleHomeSelect,
    onBookSelect: handleBookSourceSelect,
    treeData,
    onTreeItemClick: handleTreeItemClick,
    authorFolderLoading,
    authorFolderLoadError,
    onRetryAuthorFolders: retryAuthorFolders,
    onCreateAuthorFolder: handleCreateAuthorFolder,
    onRenameAuthorFolder: handleRenameAuthorFolder,
    onDeleteAuthorFolder: handleDeleteAuthorFolder,
    onMoveAuthorToFolder: handleMoveAuthorToFolder,
    onRemoveAuthorFromFolder: handleRemoveAuthorFromFolder,
    onRenameAuthor: handleRenameAuthorAndKeepSelection,
    onDeleteAuthor: handleDeleteAuthorAndCleanup,
    onPreviewAuthorDelete: handlePreviewAuthorDeletion,
    username,
    avatarUrl,
    onSignOut: handleSignOutWithReaderCleanup,
    onSearch: setSearchTerm,
    searchTerm,
    selectedFilter: filter,
    onOpenSettings: openSettings,
    showBookMemoAction: isBookView && Boolean(selectedBook),
    onOpenBookMemo: () => {
      setPassageNoteCitationId(null);
      setIsMobileBookMemoOpen(true);
    },
  });
  const readerScreenProps = createReaderScreenProps({
    username,
    onBack: openArchive,
    citations,
    projects,
    pendingDeleteCitationIds: hiddenCitationIds,
    onAddCitation: handleAddCitation,
    onRetryCitationSave: handleRetryCitationSave,
    onAddNote: handleAddNote,
    onUpdateNote: handleUpdateNote,
    onDeleteNote: handleDeleteNote,
    onDeleteCitation: requestDeleteCitation,
    onUpdateCitation: handleUpdateCitation,
    dataLoading,
    authLoading,
    sessionUserId,
    initialMeta: readerInitialMeta?.userId === sessionUserId ? readerInitialMeta.meta : undefined,
    onBulkUpdateCitationSource: handleBulkUpdateCitationSource,
  });
  const mainLayoutProps = createMainLayoutProps({
    leftPanel: passageNoteCitation ? (
      <PassageNotesPanel
        citation={passageNoteCitation}
        onClose={() => setPassageNoteCitationId(null)}
        onAddNote={handleAddNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
      />
    ) : undefined,
    rightPanel: isBookView && selectedBook ? (
      <BookMemoPanel
        userId={session.user.id}
        book={selectedBook}
        onSave={handleUpdateBookMemo}
        onClose={closeDesktopBookMemo}
      />
    ) : undefined,
    rightPanelOpen: isDesktopBookMemoOpen,
    projects,
    selectedProjectId,
    onProjectSelect: handleProjectSelect,
    onDropCitationToProject: handleDropCitationToProject,
    onCreateProject: handleCreateProject,
    onRenameProject: handleRenameProject,
    onDeleteProject: handleDeleteProject,
    onRenameAuthor: handleRenameAuthorAndKeepSelection,
    onRenameBook: handleRenameBookAndKeepSelection,
    books,
    citations,
    isHomeView,
    selectedBookId,
    onHomeSelect: handleHomeSelect,
    onBookSelect: handleBookSourceSelect,
    onReorderProjects: handleReorderProjects,
    treeData,
    onTreeItemClick: handleTreeItemClick,
    authorFolderLoading,
    authorFolderLoadError,
    onRetryAuthorFolders: retryAuthorFolders,
    onCreateAuthorFolder: handleCreateAuthorFolder,
    onRenameAuthorFolder: handleRenameAuthorFolder,
    onDeleteAuthorFolder: handleDeleteAuthorFolder,
    onMoveAuthorToFolder: handleMoveAuthorToFolder,
    onRemoveAuthorFromFolder: handleRemoveAuthorFromFolder,
    onDeleteAuthor: handleDeleteAuthorAndCleanup,
    onPreviewAuthorDelete: handlePreviewAuthorDeletion,
    avatarUrl,
    onSearch: setSearchTerm,
    searchTerm,
    selectedFilter: filter,
    onReorderBookAt: handleReorderBookAt,
    onReorderAuthorAt: handleReorderAuthorAt,
    libraryOrderSaving,
    onOpenSettings: openSettings,
  });

  if (isMobileApp) {
    return (
      <>
        <MobileLayout {...mobileLayoutProps}>{archiveContent}</MobileLayout>
        {passageNoteCitation ? (
          <>
            <button type="button" className="fixed inset-0 z-40 bg-black/35" onClick={() => setPassageNoteCitationId(null)} aria-label="구절 메모 닫기" />
            <div className="fixed inset-x-0 bottom-0 z-50 h-[min(78dvh,42rem)]">
              <PassageNotesPanel
                citation={passageNoteCitation}
                mobile
                onClose={() => setPassageNoteCitationId(null)}
                onAddNote={handleAddNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
              />
            </div>
          </>
        ) : null}
        {isMobileBookMemoOpen && selectedBook ? (
          <>
            <button type="button" className="fixed inset-0 z-40 bg-black/35" onClick={() => setIsMobileBookMemoOpen(false)} aria-label="책 전체 메모 닫기" />
            <div className="fixed inset-x-0 bottom-0 z-50 h-[min(72dvh,38rem)]">
              <BookMemoPanel
                userId={session.user.id}
                book={selectedBook}
                mobile
                onClose={() => setIsMobileBookMemoOpen(false)}
                onSave={handleUpdateBookMemo}
              />
            </div>
          </>
        ) : null}
        {settingsPanel}
        {networkNotice}
        {mutationAlerts}
        <UndoDeleteToasts pendingDeletes={pendingDeletes} onUndo={undoDeleteCitation} />
      </>
    );
  }

  if (viewMode === 'reader') {
    return (
      <>
        <ReaderScreen key={sessionUserId} {...readerScreenProps} />
        {networkNotice}
        {mutationAlerts}
        <UndoDeleteToasts pendingDeletes={pendingDeletes} onUndo={undoDeleteCitation} />
      </>
    );
  }

  return (
    <>
      <MainLayout {...mainLayoutProps}>{archiveContent}</MainLayout>
      {isBookView && selectedBook && !isDesktopBookMemoOpen ? (
        <button
          id="book-memo-open-button"
          type="button"
          onClick={openDesktopBookMemo}
          className="fixed right-4 top-[calc(3.15rem+0.5rem+0.5px)] z-30 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] transition-[background-color,color,transform] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)] active:scale-95 motion-reduce:transition-none"
          aria-label="책 전체 메모 열기"
          title="책 전체 메모 열기"
        >
          <NotebookPen size={18} />
        </button>
      ) : null}
      {settingsPanel}
      {networkNotice}
      {mutationAlerts}
      <UndoDeleteToasts pendingDeletes={pendingDeletes} onUndo={undoDeleteCitation} />
    </>
  );
};

const AppShell: React.FC = () => {
  const authStatus = useAuthStatus();

  if (authStatus.isPasswordRecovery) {
    return (
      <Auth
        isPasswordRecovery
        onPasswordRecoveryComplete={authStatus.completePasswordRecovery}
      />
    );
  }

  if (authStatus.loading && !authStatus.session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] text-sm text-[var(--text-muted)]" role="status">
        세션 확인 중…
      </div>
    );
  }

  if (!authStatus.session) return <Auth />;

  return (
    <AuthenticatedAppShell
      key={authStatus.session.user.id}
      authStatus={authStatus}
    />
  );
};

export default AppShell;
