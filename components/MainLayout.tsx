import React from 'react';
import { getArchiveSearchLabel } from '../features/archive/logic/archiveSort';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Search, UserCircle2 } from 'lucide-react';
import { AuthorDeletePreview, BookSource, Citation, DeleteAuthorCascadeResult, Project, SidebarItem } from '../types';
import { useSidebarResize } from './main-layout/useSidebarResize';
import { BookReadingWorkspace, type ReadingScrollPosition } from './main-layout/BookReadingWorkspace';
import { getReadingWorkspaceMetrics } from './main-layout/getReadingWorkspaceMetrics';
import { ProjectSidebar } from '../features/archive/ui/ProjectSidebar';
import { DEFAULT_BASE_FONT_PT } from '../features/settings/policy/userPreferences';

interface MainLayoutProps {
  children: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  rightPanelOpen?: boolean;
  bookReadingWorkspace?: boolean;
  resizeStorageKeyPrefix?: string;
  homePanelOpen?: boolean;
  onHomePanelOpenChange?: (open: boolean) => void;
  hasInlinePassageNotes?: boolean;
  onCloseInlinePassageNotes?: () => void;
  onRightPanelOpenChange?: (open: boolean) => void;
  projects: Project[];
  onProjectSelect: (projectId: string | null) => void;
  selectedProjectId: string | null;
  onDropCitationToProject: (projectId: string, citationId: string) => void;
  onCreateProject: (name: string) => boolean | void | Promise<boolean | void>;
  onRenameProject: (id: string, name: string) => boolean | void | Promise<boolean | void>;
  onDeleteProject: (id: string) => void;
  onRenameAuthor: (authorId: string, name: string) => boolean | void | Promise<boolean | void>;
  onRenameBook: (bookId: string, name: string) => boolean | void | Promise<boolean | void>;
  books: BookSource[];
  citations: Citation[];
  isHomeView: boolean;
  selectedBookId: string | null;
  onHomeSelect: () => void;
  onBookSelect: (book: BookSource) => void;
  onReorderProjects: (dragIndex: number, hoverIndex: number) => void;
  treeData: SidebarItem[];
  onTreeItemClick: (item: SidebarItem) => void;
  authorFolderLoading: boolean;
  authorFolderLoadError: string | null;
  onRetryAuthorFolders: () => void | Promise<void>;
  onCreateAuthorFolder: (name: string) => boolean | void | Promise<boolean | void>;
  onRenameAuthorFolder: (folderId: string, name: string) => boolean | void | Promise<boolean | void>;
  onDeleteAuthorFolder: (folderId: string) => boolean | void | Promise<boolean | void>;
  onMoveAuthorToFolder: (authorId: string, folderId: string) => boolean | void | Promise<boolean | void>;
  onRemoveAuthorFromFolder: (authorId: string) => boolean | void | Promise<boolean | void>;
  onDeleteAuthor: (authorId: string) => Promise<DeleteAuthorCascadeResult | undefined>;
  onPreviewAuthorDelete: (authorId: string) => Promise<AuthorDeletePreview | undefined>;
  avatarUrl?: string | null;
  onSearch?: (term: string) => void;
  searchTerm?: string;
  selectedFilter?: { type: 'author' | 'book'; authorId?: string; bookId?: string; value: string; author?: string } | null;
  onReorderBookAt?: (author: string, dragBook: string, dropIndex: number) => void;
  onReorderAuthorAt?: (groupAuthorIds: string[], dragAuthorId: string, dropIndex: number) => void;
  libraryOrderSaving?: boolean;
  onOpenSettings: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  leftPanel,
  rightPanel,
  rightPanelOpen = true,
  bookReadingWorkspace = false,
  resizeStorageKeyPrefix = '',
  homePanelOpen = true,
  onHomePanelOpenChange,
  hasInlinePassageNotes = false,
  onCloseInlinePassageNotes,
  onRightPanelOpenChange,
  projects,
  onProjectSelect,
  selectedProjectId,
  onDropCitationToProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onRenameAuthor,
  onRenameBook,
  books,
  citations,
  isHomeView,
  selectedBookId,
  onHomeSelect,
  onBookSelect,
  onReorderProjects,
  treeData,
  onTreeItemClick,
  authorFolderLoading,
  authorFolderLoadError,
  onRetryAuthorFolders,
  onCreateAuthorFolder,
  onRenameAuthorFolder,
  onDeleteAuthorFolder,
  onMoveAuthorToFolder,
  onRemoveAuthorFromFolder,
  onDeleteAuthor,
  onPreviewAuthorDelete,
  avatarUrl = null,
  onSearch,
  searchTerm = '',
  selectedFilter = null,
  onReorderBookAt,
  onReorderAuthorAt,
  libraryOrderSaving,
  onOpenSettings
}) => {
  const {
    leftWidth,
    leftWidthPreference,
    isResizingLeft,
    startLeftResize, adjustLeftWidth,
    rightWidth, isResizingRight, startRightResize, adjustRightWidth,
  } = useSidebarResize(resizeStorageKeyPrefix);
  const homePanelId = React.useId();
  const memoPanelId = React.useId();
  const homeToggleRef = React.useRef<HTMLButtonElement>(null);
  const memoToggleRef = React.useRef<HTMLButtonElement>(null);
  const homeContainerRef = React.useRef<HTMLDivElement>(null);
  const mainRef = React.useRef<HTMLElement>(null);
  const [libraryOverlayOpen, setLibraryOverlayOpen] = React.useState(false);
  const libraryState = React.useRef<'inline' | 'auto-closed' | 'user-closed' | 'overlay'>(homePanelOpen ? 'inline' : 'user-closed');
  const bookScrollPositions = React.useRef(new Map<string, ReadingScrollPosition>()).current;
  const [readingEnvironment, setReadingEnvironment] = React.useState(() => ({
    viewportWidth: typeof window === 'undefined' ? 1024 : window.innerWidth,
    viewportHeight: typeof window === 'undefined' ? 768 : window.innerHeight,
    userFontPt: DEFAULT_BASE_FONT_PT,
  }));
  React.useLayoutEffect(() => {
    const root = document.documentElement;
    const read = () => {
      const style = getComputedStyle(root);
      const preview = style.getPropertyValue('--reading-font-preview-pt').trim();
      const base = style.getPropertyValue('--font-base-pt').trim();
      const next = {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        userFontPt: parseFloat(preview || base) || DEFAULT_BASE_FONT_PT,
      };
      setReadingEnvironment(current => current.viewportWidth === next.viewportWidth && current.viewportHeight === next.viewportHeight && current.userFontPt === next.userFontPt ? current : next);
    };
    const observer = new MutationObserver(read);
    if (bookReadingWorkspace) observer.observe(root, { attributes: true, attributeFilter: ['style', 'data-font'] });
    window.addEventListener('resize', read);
    read();
    return () => { observer.disconnect(); window.removeEventListener('resize', read); };
  }, [bookReadingWorkspace]);
  const readingMetrics = React.useMemo(() => getReadingWorkspaceMetrics({
    ...readingEnvironment,
    sidebarWidthPreference: leftWidthPreference,
    sidebarOpen: homePanelOpen,
    memoChrome: 14,
  }), [readingEnvironment, leftWidthPreference, homePanelOpen]);
  const openReadingMetrics = React.useMemo(() => getReadingWorkspaceMetrics({
    ...readingEnvironment,
    sidebarWidthPreference: leftWidthPreference,
    sidebarOpen: true,
    memoChrome: 14,
  }), [readingEnvironment, leftWidthPreference]);
  const sidebarWidthBounds = bookReadingWorkspace ? {
    min: readingMetrics.sidebarPreferenceMinimum,
    max: readingMetrics.sidebarPreferenceMaximum,
  } : { min: 232, max: Math.min(960, Math.max(232, readingEnvironment.viewportWidth - 320)) };
  const displayedLeftWidth = bookReadingWorkspace ? readingMetrics.sidebarWidth : Math.min(leftWidth, sidebarWidthBounds.max);
  const displayedRightWidth = bookReadingWorkspace ? readingMetrics.memo : rightWidth;

  React.useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    if (bookReadingWorkspace) return;
    const fitComments = () => {
      main.style.setProperty('--book-main-left', `${main.getBoundingClientRect().left}px`);
      if (!hasInlinePassageNotes) return;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      // Compare the available left margin, not the combined quote/comment width.
      const column = main.querySelector<HTMLElement>('[data-book-column]');
      if (!column) return;
      const gutter = column.getBoundingClientRect().left + 3 * rem - main.getBoundingClientRect().left;
      const finalGutter = gutter + (!homePanelOpen ? (homeContainerRef.current?.getBoundingClientRect().width || 0) : 0);
      if (main.clientWidth > 0 && finalGutter < 19 * rem) {
        if (homePanelOpen) onHomePanelOpenChange?.(false);
        else if (rightPanel && rightPanelOpen) onRightPanelOpenChange?.(false);
      }
    };
    fitComments();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fitComments);
    observer?.observe(main);
    window.addEventListener('resize', fitComments);
    return () => { observer?.disconnect(); window.removeEventListener('resize', fitComments); };
  }, [bookReadingWorkspace, hasInlinePassageNotes, homePanelOpen, leftWidth, rightWidth, rightPanel, rightPanelOpen, onHomePanelOpenChange, onRightPanelOpenChange]);

  React.useLayoutEffect(() => {
    if (!bookReadingWorkspace) return;
    if (homePanelOpen && readingMetrics.belowSuggestedCommentMinimum) {
      libraryState.current = 'auto-closed';
      onHomePanelOpenChange?.(false);
      return;
    }
    if (!homePanelOpen && libraryState.current === 'auto-closed' && openReadingMetrics.commentText >= openReadingMetrics.minimumCommentSuggestion * 1.15) {
      libraryState.current = 'inline';
      onHomePanelOpenChange?.(true);
    }
  }, [bookReadingWorkspace, homePanelOpen, onHomePanelOpenChange, openReadingMetrics.commentText, openReadingMetrics.minimumCommentSuggestion, readingMetrics.belowSuggestedCommentMinimum]);
  React.useEffect(() => {
    if (homePanelOpen && libraryOverlayOpen) setLibraryOverlayOpen(false);
  }, [homePanelOpen, libraryOverlayOpen]);
  React.useEffect(() => {
    if (bookReadingWorkspace || !libraryOverlayOpen) return;
    libraryState.current = 'user-closed';
    setLibraryOverlayOpen(false);
  }, [bookReadingWorkspace, libraryOverlayOpen]);
  const closeLibraryOverlay = React.useCallback(() => {
    setLibraryOverlayOpen(false);
    libraryState.current = 'user-closed';
    homeToggleRef.current?.focus({ preventScroll: true });
  }, []);
  const toggleLibrary = () => {
    if (!bookReadingWorkspace) {
      if (!homePanelOpen && hasInlinePassageNotes) onCloseInlinePassageNotes?.();
      onHomePanelOpenChange?.(!homePanelOpen);
      return;
    }
    if (bookReadingWorkspace && libraryOverlayOpen) {
      closeLibraryOverlay();
      return;
    }
    if (homePanelOpen) {
      libraryState.current = 'user-closed';
      onHomePanelOpenChange?.(false);
      return;
    }
    const canOpenInline = openReadingMetrics.commentText >= openReadingMetrics.minimumCommentSuggestion * 1.15;
    if (canOpenInline) {
      libraryState.current = 'inline';
      onHomePanelOpenChange?.(true);
    } else {
      libraryState.current = 'overlay';
      setLibraryOverlayOpen(true);
    }
  };
  const activeLibraryOverlay = bookReadingWorkspace && libraryOverlayOpen;
  const libraryVisible = homePanelOpen || activeLibraryOverlay;
  React.useEffect(() => {
    if (!activeLibraryOverlay) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') closeLibraryOverlay(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [activeLibraryOverlay, closeLibraryOverlay]);

  const libraryToggle = (
    <button
      id="library-toggle"
      ref={homeToggleRef}
      type="button"
      aria-label={libraryVisible ? '홈 패널 접기' : '홈 패널 펼치기'}
      title={libraryVisible ? '서재 접기' : '서재 펼치기'}
      aria-expanded={libraryVisible}
      aria-controls={homePanelId}
      data-passage-note-trigger
      onClick={toggleLibrary}
      style={bookReadingWorkspace ? { left: (libraryVisible ? displayedLeftWidth : 0) + 12 } : undefined}
      className={bookReadingWorkspace
        ? 'book-library-toggle fixed z-50 flex items-center justify-center rounded-lg bg-[var(--bg-main)] text-[var(--text-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]'
        : 'inline-flex h-9 shrink-0 gap-1.5 px-2 items-center justify-center rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] transition-[background-color,color,transform] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)] active:scale-95 motion-reduce:transition-none'}
    >
      {libraryVisible ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
      {!bookReadingWorkspace ? <span className="text-sm">서재</span> : null}
    </button>
  );

  return (
    <div data-reading-responsive={bookReadingWorkspace || undefined}
      data-reading-resizing={bookReadingWorkspace && isResizingLeft || undefined}
      style={bookReadingWorkspace ? readingMetrics.cssVariables as React.CSSProperties : undefined}
      className={`${bookReadingWorkspace ? 'reading-responsive ' : ''}font-size-app isolate flex h-screen w-full flex-col overflow-hidden bg-[var(--bg-main)] font-sans text-[var(--text-main)] transition-colors duration-200`}>
      <header className="border-b border-[var(--border-main)] bg-[var(--bg-card)]">
        <div className="flex h-[3.15rem] items-center gap-3 px-4">
          {!bookReadingWorkspace ? libraryToggle : null}

          <button type="button" onClick={onHomeSelect} aria-label="410pages 홈으로 이동" title="홈으로 이동"
            aria-current={isHomeView ? 'page' : undefined}
            className="brand-wordmark min-h-11 shrink-0 items-center rounded-md text-left text-[1.25rem] text-[var(--accent)] transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]" style={{ width: 112 }}>
            <span className="brand-number">410</span><span className="brand-text">pages</span>
          </button>

          <div className="flex min-w-0 flex-1 justify-center">
            <label className="flex h-9 w-full max-w-[34rem] items-center rounded-full border border-transparent bg-[var(--bg-input)] px-4 transition-colors focus-within:border-[var(--accent-border)]">
              <Search size={16} className="mr-2 shrink-0 text-[var(--text-secondary)]" />
              <input
                value={searchTerm}
                onChange={(event) => onSearch?.(event.target.value)}
                aria-label={getArchiveSearchLabel(selectedFilter, selectedProjectId)}
                placeholder={getArchiveSearchLabel(selectedFilter, selectedProjectId)}
                className="type-body-bounded h-full w-full border-none bg-transparent p-0 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:ring-0"
              />
            </label>
          </div>

          <div
            className="flex shrink-0 items-center justify-end gap-2"
            style={{ width: 112 }}
          >
            <button
              type="button"
              onClick={onOpenSettings}
              id="settings-trigger"
              className="flex h-10 w-10 touch-manipulation items-center justify-center overflow-hidden rounded-full bg-[var(--bg-input)] text-[var(--text-secondary)] transition-[background-color,color,transform] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)] active:scale-95 motion-reduce:transition-none"
              aria-label="계정 및 설정 열기"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserCircle2 size={20} />
              )}
            </button>
          </div>
        </div>
      </header>

      {bookReadingWorkspace ? libraryToggle : null}
      {bookReadingWorkspace && rightPanel && selectedBookId ? (
        <button id="book-memo-open-button" ref={memoToggleRef} type="button" data-passage-note-trigger
          aria-label={rightPanelOpen ? '메모 접기' : '메모 펼치기'} title={rightPanelOpen ? '메모 접기' : '메모 펼치기'}
          aria-expanded={rightPanelOpen} aria-controls={memoPanelId}
          onClick={() => { memoToggleRef.current?.focus({ preventScroll: true }); onRightPanelOpenChange?.(!rightPanelOpen); }}
          className="book-memo-toggle fixed z-50 flex items-center justify-center rounded-lg bg-[var(--bg-main)] text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
          {rightPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {activeLibraryOverlay ? <button type="button" aria-label="서재 닫기" onClick={closeLibraryOverlay}
          style={{ top: 'var(--reading-header-height, 50.4px)' }} className="fixed inset-x-0 bottom-0 z-40 bg-black/20" /> : null}
        <div ref={homeContainerRef} id={homePanelId} aria-hidden={!libraryVisible} inert={!libraryVisible}
          data-library-state={activeLibraryOverlay ? 'overlay' : homePanelOpen ? 'inline' : bookReadingWorkspace ? libraryState.current : 'user-closed'}
          style={{ width: libraryVisible ? displayedLeftWidth : 0, ...(activeLibraryOverlay ? { top: 'var(--reading-header-height, 50.4px)' } : {}) }}
          className={`${activeLibraryOverlay ? 'fixed bottom-0 left-0 z-50 h-auto shadow-[var(--shadow-panel)]' : 'relative h-full'} shrink-0 overflow-hidden ${isResizingLeft ? 'transition-none' : bookReadingWorkspace ? 'reading-library-panel' : 'transition-[width,opacity] duration-200'} motion-reduce:transition-none [&>aside]:h-full ${libraryVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {leftPanel ? (
          <div className="relative h-full shrink-0" style={{ width: `${displayedLeftWidth}px` }}>
            {leftPanel}
          </div>
        ) : <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectSelect={onProjectSelect}
          onDropCitationToProject={onDropCitationToProject}
          onCreateProject={onCreateProject}
          onRenameProject={onRenameProject}
          onDeleteProject={onDeleteProject}
          onReorderProjects={onReorderProjects}
          books={books}
          citations={citations}
          treeData={treeData}
          selectedBookId={selectedBookId}
          selectedFilter={selectedFilter}
          onBookSelect={onBookSelect}
          onTreeItemClick={onTreeItemClick}
          authorFolderLoading={authorFolderLoading}
          authorFolderLoadError={authorFolderLoadError}
          onRetryAuthorFolders={onRetryAuthorFolders}
          onCreateAuthorFolder={onCreateAuthorFolder}
          onRenameAuthorFolder={onRenameAuthorFolder}
          onDeleteAuthorFolder={onDeleteAuthorFolder}
          onMoveAuthorToFolder={onMoveAuthorToFolder}
          onRemoveAuthorFromFolder={onRemoveAuthorFromFolder}
          onDeleteAuthor={onDeleteAuthor}
          onPreviewAuthorDelete={onPreviewAuthorDelete}
          onRenameAuthor={onRenameAuthor}
          onRenameBook={onRenameBook}
          onReorderBookAt={onReorderBookAt}
          onReorderAuthorAt={onReorderAuthorAt}
          libraryOrderSaving={libraryOrderSaving}
          width={displayedLeftWidth}
          isResizing={isResizingLeft}
          onStartResize={event => startLeftResize(event, bookReadingWorkspace ? readingMetrics.sidebarScale : 1, sidebarWidthBounds)}
        />}
          <div role="separator" aria-label="홈 패널 너비 조절" aria-orientation="vertical" aria-valuemin={bookReadingWorkspace ? readingMetrics.sidebarMinimumWidth : sidebarWidthBounds.min} aria-valuemax={bookReadingWorkspace ? readingMetrics.sidebarMaximumWidth : sidebarWidthBounds.max} aria-valuenow={displayedLeftWidth} tabIndex={libraryVisible ? 0 : -1}
            data-passage-note-trigger onMouseDown={event => startLeftResize(event, bookReadingWorkspace ? readingMetrics.sidebarScale : 1, sidebarWidthBounds)}
            onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); adjustLeftWidth(event.key === 'ArrowRight' ? 16 : -16, bookReadingWorkspace ? readingMetrics.sidebarScale : 1, sidebarWidthBounds); } }}
            className="absolute inset-y-0 right-0 z-40 w-2 cursor-col-resize hover:bg-[var(--accent-border)] focus-visible:bg-[var(--accent-border)]" />
        </div>

        <main ref={mainRef} inert={activeLibraryOverlay} style={{ '--book-reference-width': hasInlinePassageNotes ? `calc(100vw - ${displayedLeftWidth}px - ${bookReadingWorkspace ? 0 : rightPanel ? displayedRightWidth : 0}px)` : '100cqw', '--book-left-reference': hasInlinePassageNotes ? `${displayedLeftWidth}px` : 'var(--book-main-left, 0px)' } as React.CSSProperties} className="flex min-w-0 flex-1 flex-col bg-[var(--bg-main)] transition-colors duration-200">
          {bookReadingWorkspace && rightPanel && selectedBookId ? <BookReadingWorkspace bookId={selectedBookId} scrollPositions={bookScrollPositions} memo={rightPanel} memoOpen={rightPanelOpen} memoPanelId={memoPanelId}>{children}</BookReadingWorkspace> : children}
        </main>
        {rightPanel && !bookReadingWorkspace ? (
          <div
            aria-hidden={!rightPanelOpen}
            inert={!rightPanelOpen}
            style={{ width: rightPanelOpen ? displayedRightWidth : 0 }}
            className={[
              'relative h-full shrink-0 overflow-hidden motion-reduce:transition-none',
              isResizingRight ? 'transition-none' : 'transition-[width,opacity] duration-200',
              rightPanelOpen ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none',
            ].join(' ')}
          >
            {rightPanel}
            <div role="separator" aria-label="메모 패널 너비 조절" aria-orientation="vertical" aria-valuemin={232} aria-valuemax={960} aria-valuenow={displayedRightWidth} tabIndex={rightPanelOpen ? 0 : -1}
              data-passage-note-trigger onMouseDown={startRightResize}
              onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); adjustRightWidth(event.key === 'ArrowLeft' ? 16 : -16); } }}
              className="absolute inset-y-0 left-0 z-40 w-2 cursor-col-resize hover:bg-[var(--accent-border)] focus-visible:bg-[var(--accent-border)]" />
          </div>
        ) : null}
      </div>
    </div>
  );
};
