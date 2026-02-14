import React, { useState, useEffect } from 'react';
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

import { useDarkMode } from './hooks/useDarkMode';

const App: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
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
    session, username, loading: authLoading,
    handleUpdateUsername, handleSignOut
  } = useAuthStatus();

  const {
    projects, setProjects, citations, setCitations, loading: dataLoading,
    fetchData, handleAddCitation, handleAddNote, handleUpdateNote,
    handleDeleteNote, handleDeleteCitation, handleUpdateCitation,
    handleCreateProject, handleRenameProject, handleDeleteProject,
    handleDropCitationToProject, handleReorderProjects
  } = useArchiveData(session);

  const {
    searchTerm, setSearchTerm, selectedProjectId, handleProjectSelect,
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

  // --- Effects ---
  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session?.user.id, fetchData]);

  // --- RENDER ---
  if (!session) return <Auth />;

  const archiveContent = (
    <div className="h-full overflow-y-auto">
      <ArchiveHeader
        title={viewTitle}
        showEditor={!searchTerm && !selectedProjectId}
        username={username}
        editorPrefill={editorPrefill}
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
            title="삭제하시겠습니까?"
            message={
              <>
                선택한 <span className="font-bold text-[var(--text-main)]">{selectedIds.size}</span>개의 인용구가 영구히 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
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

  if (isMobileApp) {
    return (
      <MobileLayout
        title={viewTitle}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectSelect={handleProjectSelect}
        onCreateProject={handleCreateProject}
        treeData={treeData}
        onTreeItemClick={handleTreeItemClick}
        username={username}
        onSignOut={handleSignOut}
        onSearch={setSearchTerm}
        searchTerm={searchTerm}
        selectedFilter={filter}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      >
        {archiveContent}
      </MobileLayout>
    );
  }

  return (
    <MainLayout
      projects={projects}
      selectedProjectId={selectedProjectId}
      onProjectSelect={handleProjectSelect}
      onDropCitationToProject={handleDropCitationToProject}
      onCreateProject={handleCreateProject}
      onRenameProject={handleRenameProject}
      onDeleteProject={handleDeleteProject}
      onReorderProjects={handleReorderProjects}
      treeData={treeData}
      onTreeItemClick={handleTreeItemClick}
      username={username}
      onUpdateUsername={handleUpdateUsername}
      onSignOut={handleSignOut}
      onSearch={setSearchTerm}
      searchTerm={searchTerm}
      selectedFilter={filter}
      onReorderAuthorAt={handleReorderAuthorAt}
      onReorderBookAt={handleReorderBookAt}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
    >
      {archiveContent}
    </MainLayout>
  );
};

export default App;
