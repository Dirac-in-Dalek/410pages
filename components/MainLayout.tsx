import React from 'react';
import { PanelLeftClose, PanelLeftOpen, Search, UserCircle2 } from 'lucide-react';
import { AuthorDeletePreview, BookSource, Citation, DeleteAuthorCascadeResult, Project, SidebarItem } from '../types';
import { useSidebarResize } from './main-layout/useSidebarResize';
import { ProjectSidebar } from '../features/archive/ui/ProjectSidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  rightPanelOpen?: boolean;
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
    isResizingLeft,
    startLeftResize, adjustLeftWidth,
    rightWidth, isResizingRight, startRightResize, adjustRightWidth,
  } = useSidebarResize();
  const homePanelId = React.useId();
  const homeContainerRef = React.useRef<HTMLDivElement>(null);
  const mainRef = React.useRef<HTMLElement>(null);

  React.useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
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
  }, [hasInlinePassageNotes, homePanelOpen, leftWidth, rightWidth, rightPanel, rightPanelOpen, onHomePanelOpenChange, onRightPanelOpenChange]);

  return (
    <div className="font-size-app flex h-screen w-full flex-col overflow-hidden bg-[var(--bg-main)] font-sans text-[var(--text-main)] transition-colors duration-200">
      <button
        type="button"
        aria-label={homePanelOpen ? '홈 패널 접기' : '홈 패널 펼치기'}
        title={homePanelOpen ? '홈 패널 접기' : '홈 패널 펼치기'}
        aria-expanded={homePanelOpen}
        aria-controls={homePanelId}
        data-passage-note-trigger
        onClick={() => {
          if (!homePanelOpen && hasInlinePassageNotes) onCloseInlinePassageNotes?.();
          onHomePanelOpenChange?.(!homePanelOpen);
        }}
        style={{ left: 16 }}
        className="fixed top-[calc(3.15rem+0.5rem+0.5px)] z-30 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] transition-[background-color,color,transform] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)] active:scale-95 motion-reduce:transition-none"
      >
        {homePanelOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
      </button>
      <header className="border-b border-[var(--border-main)] bg-[var(--bg-card)]">
        <div className="flex h-[3.15rem] items-center gap-4 px-5">
          <div className="brand-wordmark shrink-0 text-[1.25rem] text-[var(--accent)]" style={{ width: 112 }}>
            <span className="brand-number">410</span><span className="brand-text">pages</span>
          </div>

          <div className="flex min-w-0 flex-1 justify-center">
            <label className="flex h-9 w-full max-w-[34rem] items-center rounded-full border border-transparent bg-[var(--bg-input)] px-4 transition-colors focus-within:border-[var(--accent-border)]">
              <Search size={16} className="mr-2 shrink-0 text-[var(--text-secondary)]" />
              <input
                value={searchTerm}
                onChange={(event) => onSearch?.(event.target.value)}
                aria-label="문장, 저자 또는 책 검색"
                placeholder="문장, 저자 또는 책 검색…"
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

      <div className="flex min-h-0 flex-1">
        <div ref={homeContainerRef} id={homePanelId} aria-hidden={!homePanelOpen} inert={!homePanelOpen}
          style={{ width: homePanelOpen ? leftWidth : 0 }}
          className={`relative h-full shrink-0 overflow-hidden ${isResizingLeft ? 'transition-none' : 'transition-[width,opacity] duration-200'} motion-reduce:transition-none [&>aside]:h-full ${homePanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {leftPanel ? (
          <div className="relative h-full shrink-0" style={{ width: `${leftWidth}px` }}>
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
          isHomeView={isHomeView}
          onHomeSelect={onHomeSelect}
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
          width={leftWidth}
          isResizing={isResizingLeft}
          onStartResize={startLeftResize}
        />}
          <div role="separator" aria-label="홈 패널 너비 조절" aria-orientation="vertical" aria-valuemin={232} aria-valuemax={960} aria-valuenow={leftWidth} tabIndex={homePanelOpen ? 0 : -1}
            data-passage-note-trigger onMouseDown={startLeftResize}
            onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); adjustLeftWidth(event.key === 'ArrowRight' ? 16 : -16); } }}
            className="absolute inset-y-0 right-0 z-40 w-2 cursor-col-resize hover:bg-[var(--accent-border)] focus-visible:bg-[var(--accent-border)]" />
        </div>

        <main ref={mainRef} style={{ '--book-reference-width': `calc(100vw - ${leftWidth}px - ${rightPanel ? rightWidth : 0}px)`, '--book-left-reference': `${leftWidth}px` } as React.CSSProperties} className="flex min-w-0 flex-1 flex-col bg-[var(--bg-main)] transition-colors duration-200">
          {children}
        </main>
        {rightPanel ? (
          <div
            aria-hidden={!rightPanelOpen}
            inert={!rightPanelOpen}
            style={{ width: rightPanelOpen ? rightWidth : 0 }}
            className={[
              'relative h-full shrink-0 overflow-hidden motion-reduce:transition-none',
              isResizingRight ? 'transition-none' : 'transition-[width,opacity] duration-200',
              rightPanelOpen ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none',
            ].join(' ')}
          >
            {rightPanel}
            <div role="separator" aria-label="메모 패널 너비 조절" aria-orientation="vertical" aria-valuemin={232} aria-valuemax={960} aria-valuenow={rightWidth} tabIndex={rightPanelOpen ? 0 : -1}
              data-passage-note-trigger onMouseDown={startRightResize}
              onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); adjustRightWidth(event.key === 'ArrowLeft' ? 16 : -16); } }}
              className="absolute inset-y-0 left-0 z-40 w-2 cursor-col-resize hover:bg-[var(--accent-border)] focus-visible:bg-[var(--accent-border)]" />
          </div>
        ) : null}
      </div>
    </div>
  );
};
