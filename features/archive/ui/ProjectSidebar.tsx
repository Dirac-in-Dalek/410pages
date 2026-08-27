import React, { useEffect, useRef, useState } from 'react';
import { Book, ChevronDown, ChevronRight, Edit2, Home, Plus, Trash2 } from 'lucide-react';
import type { Project } from '../../../types';
import type {
  ProjectDropIndicator,
  ProjectSidebarProps,
} from '../contract/projectSidebarContract';
import {
  buildProjectListIndicator,
  buildProjectPanelIndicator,
  getProjectDropPosition,
  hasProjectSortType,
  PROJECT_SORT_MIME,
  resolveProjectDragIndex,
} from '../../../shared/lib/projectSidebar';
import { ProjectSidebarProjectsSection } from './ProjectSidebarProjectsSection';
import { LibrarySidebarTree } from './LibrarySidebarTree';
import { findRecentlyCitedBooks } from '../logic/archiveTree';
import { EditorialListButton, EditorialSectionLabel } from '../../../shared/ui/sidebar/SidebarPrimitives';

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  selectedProjectId,
  onProjectSelect,
  onDropCitationToProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onReorderProjects,
  books = [],
  citations = [],
  treeData = [],
  selectedBookId = null,
  selectedFilter,
  isHomeView = false,
  onHomeSelect,
  onBookSelect,
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
  onRenameAuthor,
  onRenameBook,
  onReorderBookAt,
  width,
  isResizing,
  onStartResize,
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; projectId: string } | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [projectDropIndicator, setProjectDropIndicator] = useState<ProjectDropIndicator | null>(null);
  const [activeProjectDragIndex, setActiveProjectDragIndex] = useState<number | null>(null);
  const [projectDragCenterOffsetY, setProjectDragCenterOffsetY] = useState(0);
  const [isAllBooksOpen, setIsAllBooksOpen] = useState(true);
  const [isFoldersOpen, setIsFoldersOpen] = useState(true);
  const [isCreatingAuthorFolder, setIsCreatingAuthorFolder] = useState(false);
  const [newAuthorFolderName, setNewAuthorFolderName] = useState('');
  const [isSubmittingAuthorFolder, setIsSubmittingAuthorFolder] = useState(false);
  const recentBooks = findRecentlyCitedBooks(citations, books);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const createInFlightRef = useRef(false);
  const renameInFlightRef = useRef(false);
  const authorFolderCreateInFlightRef = useRef(false);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleCitationDragOver = (event: React.DragEvent, projectId?: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (projectId && !isManageMode && dragOverProjectId !== projectId) {
      setDragOverProjectId(projectId);
    }
  };

  const handleDropOnProject = (event: React.DragEvent, projectId: string) => {
    event.preventDefault();
    setDragOverProjectId(null);

    try {
      const rawData = event.dataTransfer.getData('application/json');
      if (!rawData) return;

      const data = JSON.parse(rawData);
      if (data.type === 'citation') {
        onDropCitationToProject(projectId, data.id);
      }
    } catch (error) {
      console.error('Failed to parse drop data', error);
    }
  };

  const handleProjectDragStart = (event: React.DragEvent, index: number) => {
    const row = event.currentTarget as HTMLElement;
    const rect = row.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    event.dataTransfer.setData(PROJECT_SORT_MIME, index.toString());
    event.dataTransfer.effectAllowed = 'move';
    setActiveProjectDragIndex(index);
    setProjectDragCenterOffsetY(centerY - event.clientY);
    setProjectDropIndicator(null);
    setDragOverProjectId(null);
  };

  const getProjectDragIndex = (event: React.DragEvent) =>
    resolveProjectDragIndex(event.dataTransfer.getData.bind(event.dataTransfer), activeProjectDragIndex);

  const clearProjectDragState = () => {
    setProjectDropIndicator(null);
    setActiveProjectDragIndex(null);
    setProjectDragCenterOffsetY(0);
  };

  const isProjectSortDrag = (event: React.DragEvent) =>
    hasProjectSortType(Array.from(event.dataTransfer.types ?? [])) || activeProjectDragIndex !== null;

  const handleProjectRowDragOver = (event: React.DragEvent, projectId: string, index: number) => {
    if (!isProjectSortDrag(event)) return;
    const dragIndex = getProjectDragIndex(event);
    if (dragIndex === null) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';

    const position = getProjectDropPosition(event.clientY, projectDragCenterOffsetY, (event.currentTarget as HTMLElement).getBoundingClientRect());
    const dropIndex = position === 'before' ? index : index + 1;
    setProjectDropIndicator({ projectId, position, dropIndex });
  };

  const handleProjectRowDrop = (event: React.DragEvent, _projectId: string, index: number) => {
    if (!isProjectSortDrag(event)) return;
    const dragIndex = getProjectDragIndex(event);
    if (dragIndex === null) {
      clearProjectDragState();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const position = getProjectDropPosition(event.clientY, projectDragCenterOffsetY, (event.currentTarget as HTMLElement).getBoundingClientRect());
    const dropIndex = position === 'before' ? index : index + 1;
    if (dragIndex !== dropIndex) {
      onReorderProjects(dragIndex, dropIndex);
    }
    clearProjectDragState();
  };

  const handleProjectListDragOver = (event: React.DragEvent, listProjects: Project[]) => {
    if (!isProjectSortDrag(event) || listProjects.length === 0) return;
    const dragIndex = getProjectDragIndex(event);
    if (dragIndex === null) return;

    const container = event.currentTarget as HTMLElement;
    const rowElements = Array.from(container.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node.dataset.projectRowIndex !== undefined
    );
    const indicator = buildProjectListIndicator(
      rowElements.map((row, index) => {
        const rect = row.getBoundingClientRect();
        return { projectId: listProjects[index].id, top: rect.top, height: rect.height };
      }),
      event.clientY,
      projectDragCenterOffsetY
    );
    if (!indicator) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setProjectDropIndicator(indicator);
  };

  const handleProjectListDrop = (event: React.DragEvent, listProjects: Project[]) => {
    if (!isProjectSortDrag(event) || listProjects.length === 0) return;
    const dragIndex = getProjectDragIndex(event);
    if (dragIndex === null) {
      clearProjectDragState();
      return;
    }

    const container = event.currentTarget as HTMLElement;
    const rowElements = Array.from(container.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node.dataset.projectRowIndex !== undefined
    );
    const indicator =
      projectDropIndicator ??
      buildProjectListIndicator(
        rowElements.map((row, index) => {
          const rect = row.getBoundingClientRect();
          return { projectId: listProjects[index].id, top: rect.top, height: rect.height };
        }),
        event.clientY,
        projectDragCenterOffsetY
      );
    if (!indicator) {
      clearProjectDragState();
      return;
    }

    event.preventDefault();
    onReorderProjects(dragIndex, indicator.dropIndex);
    clearProjectDragState();
  };

  const handleProjectsPanelDragOver = (event: React.DragEvent, projectIds: string[]) => {
    if (!isProjectSortDrag(event) || projectIds.length === 0) return;
    const dragIndex = getProjectDragIndex(event);
    if (dragIndex === null) return;
    const target = event.target as HTMLElement;
    if (target?.closest?.('[data-project-row-index]')) return;

    const panelRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const indicator = buildProjectPanelIndicator({
      projectIds,
      clientY: event.clientY,
      centerOffsetY: projectDragCenterOffsetY,
      top: panelRect.top,
      height: panelRect.height,
    });
    if (!indicator) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setProjectDropIndicator(indicator);
  };

  const handleProjectsPanelDrop = (event: React.DragEvent, projectIds: string[]) => {
    if (!isProjectSortDrag(event) || projectIds.length === 0) return;
    const dragIndex = getProjectDragIndex(event);
    if (dragIndex === null) {
      clearProjectDragState();
      return;
    }
    const target = event.target as HTMLElement;
    if (target?.closest?.('[data-project-row-index]')) return;

    const panelRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const indicator = buildProjectPanelIndicator({
      projectIds,
      clientY: event.clientY,
      centerOffsetY: projectDragCenterOffsetY,
      top: panelRect.top,
      height: panelRect.height,
    });
    if (!indicator) {
      clearProjectDragState();
      return;
    }

    event.preventDefault();
    onReorderProjects(dragIndex, indicator.dropIndex);
    clearProjectDragState();
  };

  const handleContextMenu = (event: React.MouseEvent, projectId: string) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, projectId });
  };

  const startRename = (id: string, currentName: string) => {
    setEditingProjectId(id);
    setEditingName(currentName);
    setContextMenu(null);
    setIsManageMode(false);
  };

  const submitRename = async () => {
    if (renameInFlightRef.current) return;
    if (editingProjectId && editingName.trim()) {
      renameInFlightRef.current = true;
      try {
        const didRename = await Promise.resolve(onRenameProject(editingProjectId, editingName.trim()));
        if (didRename === false) return;
      } finally {
        renameInFlightRef.current = false;
      }
    }
    setEditingProjectId(null);
  };

  const cancelRename = () => {
    setEditingProjectId(null);
    setEditingName('');
  };

  const submitCreate = async () => {
    if (createInFlightRef.current) return;
    if (newProjectName.trim()) {
      createInFlightRef.current = true;
      setIsSubmittingCreate(true);
      try {
        const didCreate = await Promise.resolve(onCreateProject(newProjectName.trim()));
        if (didCreate === false) return;
      } finally {
        createInFlightRef.current = false;
        setIsSubmittingCreate(false);
      }
    }
    setIsCreating(false);
    setNewProjectName('');
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
    <aside
      style={{ width: `${width}px` }}
      className="relative z-20 flex flex-shrink-0 flex-col border-r border-[var(--border-main)] bg-[var(--bg-sidebar)] shadow-[var(--shadow-sidebar)] transition-colors duration-200"
    >
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-[var(--bg-card)] border border-[var(--border-main)] shadow-[var(--shadow-popover)] rounded-md py-1 w-32"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="type-label-bounded w-full text-left px-4 py-2 hover:bg-[var(--sidebar-hover)] text-[var(--text-main)] flex items-center"
            onClick={() =>
              startRename(
                contextMenu.projectId,
                projects.find((project) => project.id === contextMenu.projectId)?.name || ''
              )
            }
          >
            <Edit2 size={12} className="mr-2" /> 이름 변경
          </button>
          <button
            className="type-label-bounded w-full text-left px-4 py-2 hover:bg-[var(--sidebar-hover)] text-red-600 flex items-center"
            onClick={() => {
              setDeletingProjectId(contextMenu.projectId);
              setContextMenu(null);
            }}
          >
            <Trash2 size={12} className="mr-2" /> 삭제
          </button>
        </div>
      )}

      <div
        onMouseDown={onStartResize}
        className="absolute top-0 -right-1 w-2 h-full cursor-col-resize z-30 group"
      >
        <div className={`w-[2px] h-full mx-auto transition-colors ${isResizing ? 'bg-[var(--accent)]' : 'group-hover:bg-[var(--accent-border)]'}`} />
      </div>

      <div
        className="flex-1 overflow-y-auto px-3 py-4"
        onDragOver={(event) => handleProjectsPanelDragOver(event, projects.map((project) => project.id))}
        onDrop={(event) => handleProjectsPanelDrop(event, projects.map((project) => project.id))}
        onDragLeave={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX >= rect.right ||
            event.clientY < rect.top ||
            event.clientY >= rect.bottom
          ) {
            setDragOverProjectId(null);
            if (activeProjectDragIndex !== null) setProjectDropIndicator(null);
          }
        }}
      >
        <div className="mb-4 px-1">
          <div className="brand-wordmark text-[1.25rem] text-[var(--accent)]">
            <span className="brand-number">410</span><span className="brand-text">pages</span>
          </div>
          <p className="mt-1 text-[0.78rem] text-[var(--text-muted)]">문장이 머무는 서재</p>
        </div>

        <EditorialListButton
          active={isHomeView}
          onClick={onHomeSelect}
          className={[
            'mb-5 flex min-h-10 items-center gap-2',
            isHomeView ? '!border-transparent !bg-[var(--accent-soft)] !text-[var(--accent-strong)]' : '',
          ].join(' ')}
        >
          <Home size={16} />
          홈
        </EditorialListButton>

        <EditorialSectionLabel>최근 문장을 저장한 책</EditorialSectionLabel>
        <div className="mb-4 space-y-0.5">
          {recentBooks.length ? recentBooks.map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => onBookSelect(book)}
              aria-current={selectedBookId === book.id ? 'page' : undefined}
              className={[
                'group flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-[background-color,color,transform] active:scale-95',
                selectedBookId === book.id
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]',
              ].join(' ')}
            >
              <Book size={14} className="shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-[0.86rem] font-medium">{book.title}</span>
                <span className="block truncate text-[0.72rem] text-[var(--text-muted)]">{book.author}</span>
              </span>
            </button>
          )) : (
            <p className="px-2 py-2 text-[0.78rem] text-[var(--text-muted)]">저장된 문장이 없습니다.</p>
          )}
        </div>

        <div className="flex items-center gap-1" aria-busy={authorFolderLoading}>
          <button type="button" onClick={() => setIsAllBooksOpen((value) => !value)} aria-expanded={isAllBooksOpen} className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-left text-[0.78rem] font-semibold uppercase tracking-[0.09em] text-[var(--text-muted)] transition-[color,transform] active:scale-95">
            {isAllBooksOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            저자와 책
          </button>
          <button type="button" onClick={() => { setIsCreatingAuthorFolder(true); setIsAllBooksOpen(true); }} className="flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[var(--text-muted)] transition-[background-color,transform] hover:bg-[var(--sidebar-hover)] active:scale-95" aria-label="저자 폴더 만들기"><Plus size={15} />폴더 추가</button>
        </div>
        {authorFolderLoadError ? (
          <div role="alert" className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-800 dark:bg-red-500/10 dark:text-red-100">
            <span>{authorFolderLoadError}</span>
            <button type="button" onClick={() => void onRetryAuthorFolders()} className="min-h-9 shrink-0 rounded-lg px-2 font-semibold hover:bg-red-100 active:scale-95 dark:hover:bg-red-300/10">다시 시도</button>
          </div>
        ) : null}
        {isCreatingAuthorFolder ? (
          <form className="mb-2 flex items-center gap-1.5" onKeyDown={(event) => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} onSubmit={(event) => { event.preventDefault(); void submitAuthorFolder(); }}>
            <input autoFocus value={newAuthorFolderName} onChange={(event) => setNewAuthorFolderName(event.target.value)} placeholder="저자 폴더 이름" aria-label="저자 폴더 이름" className="min-h-10 min-w-0 flex-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-2.5 text-sm focus:border-[var(--accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]" />
            <button type="submit" disabled={!newAuthorFolderName.trim() || isSubmittingAuthorFolder} className="min-h-10 rounded-lg bg-[var(--accent)] px-2.5 text-xs font-semibold text-white disabled:opacity-50">{isSubmittingAuthorFolder ? '저장 중' : '저장'}</button>
            <button type="button" disabled={isSubmittingAuthorFolder} onClick={() => { setIsCreatingAuthorFolder(false); setNewAuthorFolderName(''); }} className="min-h-10 rounded-lg px-2 text-xs text-[var(--text-muted)]">취소</button>
          </form>
        ) : null}
        {isAllBooksOpen ? (
          <LibrarySidebarTree
            embedded
            treeData={treeData}
            onTreeItemClick={onTreeItemClick}
            selectedFilter={selectedFilter}
            onReorderBookAt={onReorderBookAt}
            onRenameAuthor={onRenameAuthor}
            onRenameBook={onRenameBook}
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

        <div className="my-3 h-px bg-[var(--border-main)]" />
        <ProjectSidebarProjectsSection
          projects={projects}
          selectedProjectId={selectedProjectId}
          isManageMode={isManageMode}
          isCreating={isCreating}
          newProjectName={newProjectName}
          isSubmittingCreate={isSubmittingCreate}
          editingProjectId={editingProjectId}
          deletingProjectId={deletingProjectId}
          editingName={editingName}
          dragOverProjectId={dragOverProjectId}
          projectDropIndicator={projectDropIndicator}
          activeProjectDragIndex={activeProjectDragIndex}
          onNewProjectNameChange={setNewProjectName}
          onEditingNameChange={setEditingName}
          onToggleManageMode={() => {
            setIsManageMode((value) => !value);
            setDeletingProjectId(null);
          }}
          isExpanded={isFoldersOpen}
          onToggleExpanded={() => setIsFoldersOpen((value) => !value)}
          onProjectSelect={onProjectSelect}
          onStartCreate={() => setIsCreating(true)}
          onSubmitCreate={submitCreate}
          onCancelCreate={() => {
            setIsCreating(false);
            setNewProjectName('');
          }}
          onStartRename={startRename}
          onSubmitRename={submitRename}
          onCancelRename={cancelRename}
          onRequestDelete={setDeletingProjectId}
          onCancelDelete={() => setDeletingProjectId(null)}
          onConfirmDelete={(projectId) => {
            onDeleteProject(projectId);
            setDeletingProjectId(null);
          }}
          onContextMenu={handleContextMenu}
          onCitationDragOver={handleCitationDragOver}
          onProjectDrop={handleDropOnProject}
          onProjectDragStart={handleProjectDragStart}
          onProjectRowDragOver={handleProjectRowDragOver}
          onProjectRowDrop={handleProjectRowDrop}
          onProjectDragEnd={clearProjectDragState}
          onProjectListDragOver={handleProjectListDragOver}
          onProjectListDrop={handleProjectListDrop}
          isProjectSortDrag={isProjectSortDrag}
        />
      </div>

    </aside>
  );
};
