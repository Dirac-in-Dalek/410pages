import React, { useEffect, useRef, useState } from 'react';
import { MainLayout } from './components/MainLayout';
import { Auth } from './Auth';
import { MobileLayout } from './components/MobileLayout';
import { useAuthStatus } from './hooks/useAuthStatus';
import { useArchiveData } from './hooks/useArchiveData';
import { useArchiveFilter } from './hooks/useArchiveFilter';
import { useBulkSelection } from './hooks/useBulkSelection';
import { BulkActionToolbar } from './components/BulkActionToolbar';
import { ConfirmModal } from './components/ConfirmModal';
import { ArchiveHeader } from './components/ArchiveHeader';
import { CitationList } from './components/CitationList';
import { PdfReaderPage } from './components/pdf-reader/PdfReaderPage';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { useUserPreferences } from './hooks/useUserPreferences';

const App: React.FC = () => {
  const { preferences, setTheme, setFontFamily, setBaseFontPt } = useUserPreferences();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsDisplayName, setSettingsDisplayName] = useState('Researcher');
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  // --- Mobile App Mode Check ---
  const [isMobileApp, setIsMobileApp] = useState(false);
  useEffect(() => {
    const widthQuery = window.matchMedia('(max-width: 1024px)');
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    const checkMobileApp = () => setIsMobileApp(widthQuery.matches || coarsePointerQuery.matches);

    const addQueryListener = (query: MediaQueryList, listener: () => void) => {
      if (query.addEventListener) {
        query.addEventListener('change', listener);
      } else {
        query.addListener(listener);
      }
    };

    const removeQueryListener = (query: MediaQueryList, listener: () => void) => {
      if (query.removeEventListener) {
        query.removeEventListener('change', listener);
      } else {
        query.removeListener(listener);
      }
    };

    checkMobileApp();
    addQueryListener(widthQuery, checkMobileApp);
    addQueryListener(coarsePointerQuery, checkMobileApp);
    window.addEventListener('orientationchange', checkMobileApp);
    window.addEventListener('resize', checkMobileApp);

    return () => {
      removeQueryListener(widthQuery, checkMobileApp);
      removeQueryListener(coarsePointerQuery, checkMobileApp);
      window.removeEventListener('orientationchange', checkMobileApp);
      window.removeEventListener('resize', checkMobileApp);
    };
  }, []);

  // --- Logic Hooks ---
  const {
    session, username, avatarUrl, loading: authLoading,
    handleUpdateUsername, handleUpdateAvatar, handleSignOut
  } = useAuthStatus();
  const displayNameCommitVersionRef = useRef(0);
  const avatarCommitVersionRef = useRef(0);
  const previousCommittedUsernameRef = useRef(username);

  const {
    projects, setProjects, citations, setCitations, chapterBlocksByBook, loading: dataLoading,
    fetchData, handleAddCitation, handleAddNote, handleUpdateNote,
    handleDeleteNote, handleDeleteCitation, handleUpdateCitation,
    handleBulkUpdateCitationSource,
    handleCreateProject, handleRenameProject, handleDeleteProject, handleRenameAuthor, handleRenameBook,
    handleLoadChapterBlocks, handleCreateChapterBlock, handleDeleteChapterBlock,
    handleDropCitationToProject, handleReorderProjects
  } = useArchiveData(session);

  const {
    searchTerm, setSearchTerm, selectedProjectId, selectedBookId, isBookView, handleProjectSelect,
    handleTreeItemClick, treeData, filteredCitations, viewTitle,
    editorPrefill, filter, sortField, dateDirection, pageDirection,
    handleDateSortClick, handlePageSortClick,
    handleReorderAuthorAt, handleReorderBookAt
  } = useArchiveFilter(citations, projects, username, session?.user?.id);

  const {
    selectedIds, isCopying, handleToggleSelect, handleSelectAll,
    handleBatchCopy, handleBatchDelete, handleBatchAddToProject,
    handleBatchCreateAndAddToProject, setSelectedIds
  } = useBulkSelection(filteredCitations, session, username, setCitations, setProjects);

  // --- UI State ---
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [viewMode, setViewMode] = useState<'archive' | 'reader'>('archive');

  // --- Effects ---
  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session?.user.id, fetchData]);

  useEffect(() => {
    if (!selectedBookId) {
      return;
    }

    void handleLoadChapterBlocks(selectedBookId);
  }, [handleLoadChapterBlocks, selectedBookId]);

  useEffect(() => {
    if (isMobileApp && viewMode === 'reader') {
      setViewMode('archive');
    }
  }, [isMobileApp, viewMode]);

  useEffect(() => {
    const previousCommittedUsername = previousCommittedUsernameRef.current;
    if (username !== previousCommittedUsername) {
      setDisplayNameError(null);
      setSettingsDisplayName((currentDraft) =>
        currentDraft === previousCommittedUsername ? username : currentDraft
      );
      previousCommittedUsernameRef.current = username;
    }
  }, [username]);

  // --- RENDER ---
  if (!session) return <Auth />;

  const resetSettingsDisplayNameState = () => {
    displayNameCommitVersionRef.current += 1;
    avatarCommitVersionRef.current += 1;
    setSettingsDisplayName(username);
    setDisplayNameError(null);
    setAvatarError(null);
    setIsSavingDisplayName(false);
    setIsSavingAvatar(false);
  };

  const openSettings = () => {
    resetSettingsDisplayNameState();
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    resetSettingsDisplayNameState();
    setIsSettingsOpen(false);
  };

  const commitSettingsDisplayName = async (nextDisplayName: string) => {
    const submittedDisplayName = nextDisplayName;
    const trimmedDisplayName = nextDisplayName.trim();
    const trimmedUsername = username.trim();

    if (!trimmedDisplayName || trimmedDisplayName === trimmedUsername || isSavingDisplayName) {
      return;
    }

    const commitVersion = displayNameCommitVersionRef.current;
    setIsSavingDisplayName(true);
    setDisplayNameError(null);
    try {
      const didSave = await handleUpdateUsername(trimmedDisplayName);
      if (commitVersion !== displayNameCommitVersionRef.current) {
        return;
      }

      if (didSave) {
        setSettingsDisplayName((currentDraft) =>
          currentDraft === submittedDisplayName ? trimmedDisplayName : currentDraft
        );
        setDisplayNameError(null);
      } else {
        setDisplayNameError('이름 저장에 실패했습니다.');
      }
    } finally {
      if (commitVersion === displayNameCommitVersionRef.current) {
        setIsSavingDisplayName(false);
      }
    }
  };

  const commitSettingsAvatar = async (file: File) => {
    if (isSavingAvatar) {
      return false;
    }

    if (!file.type.startsWith('image/')) {
      setAvatarError('이미지 파일만 업로드할 수 있습니다.');
      return false;
    }

    const commitVersion = avatarCommitVersionRef.current;
    setIsSavingAvatar(true);
    setAvatarError(null);

    try {
      const didSave = await handleUpdateAvatar(file);
      if (commitVersion !== avatarCommitVersionRef.current) {
        return;
      }

      if (!didSave) {
        setAvatarError('프로필 사진 저장에 실패했습니다.');
        return false;
      }

      return true;
    } finally {
      if (commitVersion === avatarCommitVersionRef.current) {
        setIsSavingAvatar(false);
      }
    }
  };

  const archiveContent = (
    <div className="h-full overflow-y-auto">
      <ArchiveHeader
        title={viewTitle}
        showEditor={!searchTerm && !selectedProjectId}
        username={username}
        editorPrefill={editorPrefill}
        isBookView={isBookView}
        onAddCitation={handleAddCitation}
        sortField={sortField}
        dateDirection={dateDirection}
        pageDirection={pageDirection}
        onDateSortClick={handleDateSortClick}
        onPageSortClick={handlePageSortClick}
      />

      <div className={isMobileApp ? 'pb-28 mt-3' : 'pb-20 mt-4'}>
        <div className={isMobileApp ? 'max-w-5xl mx-auto px-3' : 'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8'}>
          <BulkActionToolbar
            selectedCount={selectedIds.size}
            totalCount={filteredCitations.length}
            projects={projects}
            isCopying={isCopying}
            onSelectAll={handleSelectAll}
            onCopy={handleBatchCopy}
            onDeleteRequest={() => setShowBatchDeleteModal(true)}
            onCancel={() => setSelectedIds(new Set())}
            onAddToProject={handleBatchAddToProject}
            onCreateAndAddToProject={handleBatchCreateAndAddToProject}
          />

          <ConfirmModal
            isOpen={showBatchDeleteModal}
            title="Delete citations?"
            message={
              <>
                <span className="font-bold text-[var(--text-main)]">{selectedIds.size}</span> citation(s) will be permanently deleted. This action cannot be undone.
              </>
            }
            onConfirm={() => {
              handleBatchDelete();
              setShowBatchDeleteModal(false);
            }}
            onCancel={() => setShowBatchDeleteModal(false)}
          />

          <CitationList
            citations={filteredCitations}
            projects={projects}
            username={username}
            loading={dataLoading || authLoading}
            searchTerm={searchTerm}
            selectedIds={selectedIds}
            chapterBlocks={selectedBookId ? chapterBlocksByBook[selectedBookId] || [] : []}
            selectedFilter={filter}
            isBookView={isBookView}
            sortField={sortField}
            dateDirection={dateDirection}
            pageDirection={pageDirection}
            onCreateChapterBlock={handleCreateChapterBlock}
            onDeleteChapterBlock={handleDeleteChapterBlock}
            onToggleSelect={handleToggleSelect}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onDeleteCitation={handleDeleteCitation}
            onUpdateCitation={handleUpdateCitation}
          />
        </div>
      </div>
    </div>
  );

  const settingsPanel = (
    <SettingsPanel
      isOpen={isSettingsOpen}
      isMobile={isMobileApp}
      displayName={settingsDisplayName}
      savedDisplayName={username}
      avatarUrl={avatarUrl}
      preferences={preferences}
      isSavingDisplayName={isSavingDisplayName}
      isSavingAvatar={isSavingAvatar}
      avatarError={avatarError}
      displayNameError={displayNameError}
      onClose={closeSettings}
      onDisplayNameChange={setSettingsDisplayName}
      onDisplayNameCommit={commitSettingsDisplayName}
      onAvatarChange={commitSettingsAvatar}
      onThemeChange={setTheme}
      onFontFamilyChange={setFontFamily}
      onBaseFontPtChange={setBaseFontPt}
      onSignOut={handleSignOut}
    />
  );

  if (isMobileApp) {
    return (
      <>
        <MobileLayout
          title="410pages"
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectSelect={handleProjectSelect}
          onCreateProject={handleCreateProject}
          treeData={treeData}
          onTreeItemClick={handleTreeItemClick}
          username={username}
          avatarUrl={avatarUrl}
          onSignOut={handleSignOut}
          onSearch={setSearchTerm}
          searchTerm={searchTerm}
          selectedFilter={filter}
          onOpenSettings={openSettings}
        >
          {archiveContent}
        </MobileLayout>
        {settingsPanel}
      </>
    );
  }

  if (viewMode === 'reader') {
    return (
      <PdfReaderPage
        username={username}
        onBack={() => setViewMode('archive')}
        citations={citations}
        projects={projects}
        loading={dataLoading || authLoading}
        onAddCitation={handleAddCitation}
        onAddNote={handleAddNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        onDeleteCitation={handleDeleteCitation}
        onUpdateCitation={handleUpdateCitation}
        onBulkUpdateCitationSource={handleBulkUpdateCitationSource}
      />
    );
  }

  return (
    <>
      <MainLayout
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectSelect={handleProjectSelect}
        onDropCitationToProject={handleDropCitationToProject}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
        onRenameAuthor={handleRenameAuthor}
        onRenameBook={handleRenameBook}
        onReorderProjects={handleReorderProjects}
        treeData={treeData}
        onTreeItemClick={handleTreeItemClick}
        username={username}
        avatarUrl={avatarUrl}
        onUpdateUsername={handleUpdateUsername}
        onSignOut={handleSignOut}
        onSearch={setSearchTerm}
        searchTerm={searchTerm}
        selectedFilter={filter}
        onReorderAuthorAt={handleReorderAuthorAt}
        onReorderBookAt={handleReorderBookAt}
        onOpenPdfReader={() => setViewMode('reader')}
        onOpenSettings={openSettings}
      >
        {archiveContent}
      </MainLayout>
      {settingsPanel}
    </>
  );
};

export default App;
