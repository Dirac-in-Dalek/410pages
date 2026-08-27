import React, { useEffect, useRef, useState } from 'react';
import {
  Book,
  ChevronDown,
  ChevronRight,
  Folder,
  Home,
  LogOut,
  Menu,
  Settings,
  Plus,
} from 'lucide-react';
import type { AuthorDeletePreview, BookSource, Citation, DeleteAuthorCascadeResult, Project, SidebarItem } from '../types';
import { findRecentlyCitedBooks } from '../features/archive/logic/archiveTree';
import {
  EditorialListButton,
  EditorialProfileCard,
  EditorialSearchField,
  EditorialSectionLabel,
  EditorialSheet,
  EditorialSheetHeader,
  EditorialToolbarButton,
} from '../shared/ui/sidebar/SidebarPrimitives';
import { LibrarySidebarTree } from '../features/archive/ui/LibrarySidebarTree';
import { ProjectCreateComposer } from '../shared/ui/project/ProjectCreateComposer';
import { useModalFocus } from '../shared/ui/useModalFocus';

interface MobileLayoutProps {
  children: React.ReactNode;
  title: string;
  projects: Project[];
  books: BookSource[];
  citations: Citation[];
  isHomeView: boolean;
  selectedProjectId: string | null;
  selectedBookId: string | null;
  onHomeSelect: () => void;
  onBookSelect: (book: BookSource) => void;
  onProjectSelect: (projectId: string | null) => void;
  onCreateProject: (name: string) => boolean | void | Promise<boolean | void>;
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
  onRenameAuthor: (authorId: string, name: string) => boolean | void | Promise<boolean | void>;
  onDeleteAuthor: (authorId: string) => Promise<DeleteAuthorCascadeResult | undefined>;
  onPreviewAuthorDelete: (authorId: string) => Promise<AuthorDeletePreview | undefined>;
  onSearch?: (term: string) => void;
  searchTerm?: string;
  selectedFilter?: { type: 'author' | 'book'; authorId?: string; bookId?: string; value: string; author?: string } | null;
  username?: string;
  avatarUrl?: string | null;
  onSignOut?: () => void;
  onOpenSettings: () => void;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  projects,
  books = [],
  citations = [],
  isHomeView = false,
  selectedProjectId,
  selectedBookId = null,
  onHomeSelect,
  onBookSelect,
  onProjectSelect,
  onCreateProject,
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
  onRenameAuthor,
  onDeleteAuthor,
  onPreviewAuthorDelete,
  onSearch,
  searchTerm = '',
  selectedFilter = null,
  username = 'Researcher',
  avatarUrl = null,
  onSignOut,
  onOpenSettings,
}) => {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [isAllBooksOpen, setIsAllBooksOpen] = useState(false);
  const [isFoldersOpen, setIsFoldersOpen] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingAuthorFolder, setIsCreatingAuthorFolder] = useState(false);
  const [isSubmittingAuthorFolder, setIsSubmittingAuthorFolder] = useState(false);
  const [newAuthorFolderName, setNewAuthorFolderName] = useState('');
  const navigationDialogRef = useModalFocus<HTMLDivElement>(isNavigationOpen, () => setIsNavigationOpen(false));
  const projectCreateInFlightRef = useRef(false);
  const authorFolderCreateInFlightRef = useRef(false);
  const recentBooks = findRecentlyCitedBooks(citations, books);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const closeNavigation = () => setIsNavigationOpen(false);

  const submitCreateProject = async () => {
    const trimmed = newProjectName.trim();
    if (!trimmed || projectCreateInFlightRef.current) return;
    projectCreateInFlightRef.current = true;
    setIsSubmittingProject(true);
    try {
      const didCreate = await Promise.resolve(onCreateProject(trimmed));
      if (didCreate === false) return;
    } finally {
      projectCreateInFlightRef.current = false;
      setIsSubmittingProject(false);
    }
    setNewProjectName('');
    setIsCreatingProject(false);
  };

  const submitAuthorFolder = async () => {
    const trimmed = newAuthorFolderName.trim();
    if (!trimmed || authorFolderCreateInFlightRef.current) return;
    authorFolderCreateInFlightRef.current = true;
    setIsSubmittingAuthorFolder(true);
    try {
      const didCreate = await Promise.resolve(onCreateAuthorFolder(trimmed));
      if (didCreate === false) return;
      setNewAuthorFolderName('');
      setIsCreatingAuthorFolder(false);
      setIsAllBooksOpen(true);
    } finally {
      authorFolderCreateInFlightRef.current = false;
      setIsSubmittingAuthorFolder(false);
    }
  };

  return (
    <div className="font-size-app flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)]">
      <header className="border-b border-[var(--border-main)] bg-[var(--bg-card)] pt-[env(safe-area-inset-top)]">
        <div className="flex h-[3.25rem] items-center justify-between gap-3 px-4">
          <h1 className="type-title-bounded truncate font-semibold tracking-[-0.012em]">{title}</h1>
          <div className="flex items-center gap-2">
            <EditorialToolbarButton active={isNavigationOpen} onClick={() => setIsNavigationOpen(true)} ariaLabel="탐색 열기">
              <Menu size={18} />
            </EditorialToolbarButton>
            <EditorialToolbarButton onClick={onOpenSettings} ariaLabel="설정 열기">
              <Settings size={17} />
            </EditorialToolbarButton>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>

      {isNavigationOpen ? (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-black/35" onClick={closeNavigation} aria-label="탐색 닫기" />
          <EditorialSheet side="left" isOpen widthClassName="w-[88vw] max-w-[21rem]">
            <div ref={navigationDialogRef} role="dialog" aria-modal="true" aria-label="탐색" tabIndex={-1} className="flex h-full flex-col pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
              <EditorialSheetHeader title="410pages" onClose={closeNavigation} />
              <div data-library-sidebar-scroll="true" className="flex-1 overflow-y-auto p-3 overscroll-contain">
                <EditorialListButton
                  active={isHomeView}
                  onClick={() => {
                    onHomeSelect();
                    closeNavigation();
                  }}
                  className={[
                    'mb-5 flex min-h-11 items-center justify-center gap-2',
                    isHomeView ? '!border-transparent !bg-[var(--accent-soft)] !text-[var(--accent-strong)]' : '',
                  ].join(' ')}
                >
                  <Home size={16} /> 홈
                </EditorialListButton>

                <EditorialSectionLabel>최근 문장을 저장한 책</EditorialSectionLabel>
                <div className="mb-4 space-y-0.5">
                  {recentBooks.length ? recentBooks.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => {
                        onBookSelect(book);
                        closeNavigation();
                      }}
                      aria-current={selectedBookId === book.id ? 'page' : undefined}
                      className={[
                        'flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-[background-color,transform] hover:bg-[var(--sidebar-hover)] active:scale-95',
                        selectedBookId === book.id ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--text-secondary)]',
                      ].join(' ')}
                    >
                      <Book size={14} className="shrink-0" />
                      <span className="min-w-0">
                        <span className="block truncate text-[0.88rem] font-medium">{book.title}</span>
                        <span className="block truncate text-[0.74rem] text-[var(--text-muted)]">{book.author}</span>
                      </span>
                    </button>
                  )) : <p className="px-2 py-2 text-sm text-[var(--text-muted)]">저장된 문장이 없습니다.</p>}
                </div>

                <div className="flex items-center gap-1" aria-busy={authorFolderLoading}>
                  <button type="button" onClick={() => setIsAllBooksOpen((value) => !value)} aria-expanded={isAllBooksOpen} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-left text-xs font-semibold uppercase tracking-[0.09em] text-[var(--text-muted)] active:scale-95">
                    {isAllBooksOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    저자와 책
                  </button>
                  <button type="button" onClick={() => { setIsCreatingAuthorFolder(true); setIsAllBooksOpen(true); }} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[var(--text-muted)] active:scale-95" aria-label="저자 폴더 만들기"><Plus size={16} />폴더 추가</button>
                </div>
                {authorFolderLoadError ? (
                  <div role="alert" className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-500/10 dark:text-red-100">
                    <span>{authorFolderLoadError}</span>
                    <button type="button" onClick={() => void onRetryAuthorFolders()} className="min-h-9 shrink-0 rounded-lg px-2 font-semibold active:scale-95">다시 시도</button>
                  </div>
                ) : null}
                {isCreatingAuthorFolder ? (
                  <form className="mb-2 flex items-center gap-1.5" onKeyDown={(event) => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} onSubmit={(event) => { event.preventDefault(); void submitAuthorFolder(); }}>
                    <input autoFocus value={newAuthorFolderName} onChange={(event) => setNewAuthorFolderName(event.target.value)} placeholder="저자 폴더 이름" aria-label="저자 폴더 이름" className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]" />
                    <button type="submit" disabled={!newAuthorFolderName.trim() || isSubmittingAuthorFolder} className="min-h-11 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white disabled:opacity-50">저장</button>
                    <button type="button" onClick={() => { setIsCreatingAuthorFolder(false); setNewAuthorFolderName(''); }} className="min-h-11 rounded-lg px-2 text-xs text-[var(--text-muted)]">취소</button>
                  </form>
                ) : null}
                {isAllBooksOpen ? (
                  <LibrarySidebarTree
                    embedded
                    mobile
                    treeData={treeData}
                    onTreeItemClick={onTreeItemClick}
                    onItemSelected={closeNavigation}
                    selectedFilter={selectedFilter}
                    onRenameAuthor={onRenameAuthor}
                    books={books}
                    citations={citations}
                    onRenameAuthorFolder={onRenameAuthorFolder}
                    onDeleteAuthorFolder={onDeleteAuthorFolder}
                    onMoveAuthorToFolder={onMoveAuthorToFolder}
                    onRemoveAuthorFromFolder={onRemoveAuthorFromFolder}
                    onDeleteAuthor={onDeleteAuthor}
                    onPreviewAuthorDelete={onPreviewAuthorDelete}
                  />
                ) : null}

                <button
                  type="button"
                  onClick={() => setIsFoldersOpen((value) => !value)}
                  aria-expanded={isFoldersOpen}
                  className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-lg px-1 text-left text-xs font-semibold uppercase tracking-[0.09em] text-[var(--text-muted)] active:scale-95"
                >
                  {isFoldersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  폴더
                </button>
                {isFoldersOpen ? (
                  <div className="space-y-0.5">
                    {projects.map((project) => (
                      <EditorialListButton
                        key={project.id}
                        active={selectedProjectId === project.id}
                        className={[
                          'flex min-h-11 items-center gap-2',
                          selectedProjectId === project.id ? '!border-transparent !bg-[var(--accent-soft)] !text-[var(--accent-strong)]' : '',
                        ].join(' ')}
                        onClick={() => {
                          onProjectSelect(project.id);
                          closeNavigation();
                        }}
                      >
                        <Folder size={15} /> <span className="truncate">{project.name}</span>
                      </EditorialListButton>
                    ))}
                    <ProjectCreateComposer
                      compact
                      isCreating={isCreatingProject}
                      value={newProjectName}
                      placeholder="폴더 이름"
                      onStart={() => setIsCreatingProject(true)}
                      onChange={setNewProjectName}
                      onSubmit={submitCreateProject}
                      isSubmitting={isSubmittingProject}
                      onCancel={() => {
                        setIsCreatingProject(false);
                        setNewProjectName('');
                      }}
                    />
                  </div>
                ) : null}

                <div className="my-4 h-px bg-[var(--border-main)]" />
                <EditorialSearchField value={searchTerm} onChange={onSearch} placeholder="문장, 저자 또는 책 검색" />
                <EditorialProfileCard username={username} avatarUrl={avatarUrl} subtitle="나의 독서 아카이브">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => { onOpenSettings(); closeNavigation(); }} className="flex min-h-11 items-center justify-center gap-1 rounded-lg bg-[var(--bg-input)] text-sm text-[var(--text-muted)] active:scale-95"><Settings size={14} /> 설정</button>
                    <button type="button" onClick={onSignOut} className="flex min-h-11 items-center justify-center gap-1 rounded-lg bg-[var(--bg-input)] text-sm text-[var(--text-muted)] active:scale-95"><LogOut size={14} /> 로그아웃</button>
                  </div>
                </EditorialProfileCard>
              </div>
            </div>
          </EditorialSheet>
        </>
      ) : null}

    </div>
  );
};
