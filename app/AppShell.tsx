import React from 'react';
import { MainLayout } from '../components/MainLayout';
import { Auth } from '../Auth';
import { MobileLayout } from '../components/MobileLayout';
import { useAuthStatus } from '../hooks/useAuthStatus';
import { useArchiveFilter } from '../hooks/useArchiveFilter';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { ArchiveScreen } from '../features/archive/ui/ArchiveScreen';
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

const AppShell: React.FC = () => {
  const { isMobileApp } = useResponsiveMode();
  const {
    session, username, avatarUrl, loading: authLoading,
    handleUpdateUsername, handleUpdateAvatar, handleSignOut
  } = useAuthStatus();
  const { preferences, setTheme, setFontFamily, setBaseFontPt, setCitationWidthRem } =
    useUserPreferences(session?.user?.id ?? null);

  const {
    projects, setProjects, citations, setCitations, chapterBlocksByBook, loading: dataLoading,
    fetchData, handleAddCitation, handleAddCitationOptimistic, handleRetryCitationSave, handleAddNote, handleUpdateNote,
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

  const { showBatchDeleteModal, setShowBatchDeleteModal } = useAppShellState({
    sessionUserId: session?.user?.id,
    fetchData,
    selectedBookId,
    handleLoadChapterBlocks,
  });
  const { viewMode, openArchive, openReader } = useAppViewMode({ isMobileApp });

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
    onSignOut: handleSignOut,
  });

  if (!session) return <Auth />;

  const archiveContent = <ArchiveScreen {...createArchiveScreenProps({
    isMobileApp,
    title: viewTitle,
    username,
    editorPrefill,
    isBookView,
    sortField,
    dateDirection,
    pageDirection,
    onAddCitation: handleAddCitationOptimistic,
    onRetryCitationSave: handleRetryCitationSave,
    onDateSortClick: handleDateSortClick,
    onPageSortClick: handlePageSortClick,
    projects,
    citations: filteredCitations,
    selectedProjectId,
    selectedBookId,
    chapterBlocksByBook,
    dataLoading,
    authLoading,
    searchTerm,
    selectedIds,
    selectedFilter: filter,
    isCopying,
    isBatchDeleteOpen: showBatchDeleteModal,
    onSelectAll: handleSelectAll,
    onCopy: handleBatchCopy,
    onBatchDeleteRequest: () => setShowBatchDeleteModal(true),
    onBatchDeleteConfirm: () => {
      handleBatchDelete();
      setShowBatchDeleteModal(false);
    },
    onBatchDeleteCancel: () => setShowBatchDeleteModal(false),
    onCancelSelection: () => setSelectedIds(new Set()),
    onAddToProject: handleBatchAddToProject,
    onCreateAndAddToProject: handleBatchCreateAndAddToProject,
    onCreateChapterBlock: handleCreateChapterBlock,
    onDeleteChapterBlock: handleDeleteChapterBlock,
    onToggleSelect: handleToggleSelect,
    onAddNote: handleAddNote,
    onUpdateNote: handleUpdateNote,
    onDeleteNote: handleDeleteNote,
    onDeleteCitation: handleDeleteCitation,
    onUpdateCitation: handleUpdateCitation,
  })} />;

  const settingsPanel = <SettingsPanel {...settingsPanelProps} />;
  const mobileLayoutProps = createMobileLayoutProps({
    title: '410pages',
    projects,
    selectedProjectId,
    onProjectSelect: handleProjectSelect,
    onCreateProject: handleCreateProject,
    treeData,
    onTreeItemClick: handleTreeItemClick,
    username,
    avatarUrl,
    onSignOut: handleSignOut,
    onSearch: setSearchTerm,
    searchTerm,
    selectedFilter: filter,
    onOpenSettings: openSettings,
  });
  const readerScreenProps = createReaderScreenProps({
    username,
    onBack: openArchive,
    citations,
    projects,
    onAddCitation: handleAddCitation,
    onAddNote: handleAddNote,
    onUpdateNote: handleUpdateNote,
    onDeleteNote: handleDeleteNote,
    onDeleteCitation: handleDeleteCitation,
    onUpdateCitation: handleUpdateCitation,
    dataLoading,
    authLoading,
    onBulkUpdateCitationSource: handleBulkUpdateCitationSource,
  });
  const mainLayoutProps = createMainLayoutProps({
    projects,
    selectedProjectId,
    onProjectSelect: handleProjectSelect,
    onDropCitationToProject: handleDropCitationToProject,
    onCreateProject: handleCreateProject,
    onRenameProject: handleRenameProject,
    onDeleteProject: handleDeleteProject,
    onRenameAuthor: handleRenameAuthor,
    onRenameBook: handleRenameBook,
    onReorderProjects: handleReorderProjects,
    treeData,
    onTreeItemClick: handleTreeItemClick,
    username,
    avatarUrl,
    onUpdateUsername: handleUpdateUsername,
    onSignOut: handleSignOut,
    onSearch: setSearchTerm,
    searchTerm,
    selectedFilter: filter,
    onReorderAuthorAt: handleReorderAuthorAt,
    onReorderBookAt: handleReorderBookAt,
    onOpenReader: openReader,
    onOpenSettings: openSettings,
  });

  if (isMobileApp) {
    return (
      <>
        <MobileLayout {...mobileLayoutProps}>{archiveContent}</MobileLayout>
        {settingsPanel}
      </>
    );
  }

  if (viewMode === 'reader') {
    return <ReaderScreen {...readerScreenProps} />;
  }

  return (
    <>
      <MainLayout {...mainLayoutProps}>{archiveContent}</MainLayout>
      {settingsPanel}
    </>
  );
};

export default AppShell;
