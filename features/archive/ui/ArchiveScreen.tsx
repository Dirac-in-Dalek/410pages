import { BookComposerDraftStore } from '../../citation-entry/logic/bookComposerDrafts';
import { CitationEditDraftStore } from '../logic/citationEditDrafts';
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { sortBookViewItems, toBookViewItems } from '../../../lib/bookViewItems';
import { changeChapterDepth, getChapterDropPlacement } from '../logic/chapterHierarchy';
import { BookInsertion, changeCitationInsertion, resolveBookInsertion } from '../logic/bookInsertion';
import { BulkActionToolbar } from './BulkActionToolbar';
import type {
  ChapterBlock,
  Citation,
  CreateChapterBlockInput,
  Project,
} from '../../../types';
import { ArchiveHeader } from './ArchiveHeader';
import { getArchiveReadingColumnClass } from './archiveReadingColumn';
import { CitationList } from './CitationList';
import { CitationEditor } from '../../citation-entry/ui/CitationEditor';
import { useBookMetadata } from '../logic/useBookMetadata';

type ArchiveScreenProps = {
  editDrafts?: CitationEditDraftStore;
  composerDrafts?: BookComposerDraftStore;
  isMobileApp: boolean;
  title: string;
  showEditor: boolean;
  username: string;
  editorPrefill?: { author: string; book: string; bookId?: string };
  isBookView: boolean;
  onBackToAuthor?: () => void;
  authorName?: string;
  sortField: 'date' | 'page';
  dateDirection: 'asc' | 'desc';
  pageDirection: 'asc' | 'desc';
  onAddCitation: (data: any) => void | Promise<unknown>;
  onRetryCitationSave: (citationId: string) => void | Promise<unknown>;
  onDateSortClick: () => void;
  onPageSortClick: () => void;
  projects: Project[];
  citations: Citation[];
  allCitations: Citation[];
  chapterBlocks: ChapterBlock[];
  loading: boolean;
  loadError: string | null;
  onRetryLoad: () => void | Promise<void>;
  searchTerm: string;
  selectedIds: Set<string>;
  selectedFilter?: { type: 'author' | 'book'; authorId?: string; bookId?: string; value: string; author?: string } | null;
  isCopying: boolean;
  onSelectAll: () => void;
  onCopy: () => void | Promise<unknown>;
  onDeleteRequest: () => void;
  onCancelSelection: () => void;
  onAddToProject: (projectId: string) => void | Promise<unknown>;
  onCreateAndAddToProject: (name: string) => boolean | void | Promise<boolean | void>;
  onCreateChapterBlock?: (input: CreateChapterBlockInput) => Promise<unknown> | unknown;
  onMoveCitation?: (bookId: string, id: string, createdAtSort: number) => Promise<boolean> | boolean;
  onMoveChapterBlock?: (bookId: string, id: string, createdAtSort: number, depth?: number) => Promise<boolean> | boolean;
  onRenameChapterBlock?: (bookId: string, id: string, label: string, depth?: number) => Promise<boolean> | boolean;
  onDeleteChapterBlock?: (bookId: string, blockId: string) => Promise<unknown> | unknown;
  chapterActionsDisabled?: boolean;
  onToggleSelect: (id: string, selected: boolean) => void;
  onAddNote: (citationId: string, content: string) => void | Promise<unknown>;
  onUpdateNote: (citationId: string, noteId: string, content: string) => void;
  onDeleteNote: (citationId: string, noteId: string) => void;
  onDeleteCitation: (id: string) => void;
  onUpdateCitation: (id: string, data: Partial<Citation>) => void | Promise<unknown>;
  showAllPassageNotes?: boolean;
  onToggleAllPassageNotes?: () => void;
  collapsedDividerIds?: ReadonlySet<string>;
  onToggleDivider?: (id: string) => void;
  passageNoteCitationId?: string | null;
  onPassageNoteCitationChange?: (citationId: string | null) => void;
};

export const ArchiveScreen: React.FC<ArchiveScreenProps> = ({
  isMobileApp,
  editDrafts,
  composerDrafts,
  title,
  showEditor,
  username,
  editorPrefill,
  isBookView,
  onBackToAuthor,
  authorName,
  sortField,
  dateDirection,
  pageDirection,
  onAddCitation,
  onRetryCitationSave,
  onDateSortClick,
  onPageSortClick,
  projects,
  citations,
  allCitations,
  chapterBlocks,
  loading,
  loadError,
  onRetryLoad,
  searchTerm,
  selectedIds,
  selectedFilter,
  isCopying,
  onSelectAll,
  onCopy,
  onDeleteRequest,
  onCancelSelection,
  onAddToProject,
  onCreateAndAddToProject,
  onCreateChapterBlock,
  onMoveChapterBlock,
  onMoveCitation,
  onRenameChapterBlock,
  onDeleteChapterBlock,
  chapterActionsDisabled,
  onToggleSelect,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onDeleteCitation,
  onUpdateCitation,
  showAllPassageNotes = false,
  onToggleAllPassageNotes,
  collapsedDividerIds,
  onToggleDivider,
  passageNoteCitationId,
  onPassageNoteCitationChange,
}) => {
  const localComposerDrafts = useRef(new BookComposerDraftStore()).current;
  const drafts = composerDrafts ?? localComposerDrafts;
  const bookId = editorPrefill?.bookId ?? (selectedFilter?.type === 'book' ? selectedFilter.bookId : undefined);
  const scope = bookId ?? '';
  const composer = useSyncExternalStore(drafts.subscribe, () => drafts.get(scope));
  const insertion = composer?.insertion ?? null;
  const chapterMode = composer?.chapterMode ?? false;
  const savingInsertion = composer?.saving ?? false;
  const insertionError = composer?.error ?? '';
  const setInsertion = (update: React.SetStateAction<BookInsertion | null>) => drafts.patch(scope, {
    insertion: typeof update === 'function' ? update(drafts.get(scope)?.insertion ?? null) : update,
  });
  const setChapterMode = (enabled: boolean) => drafts.patch(scope, { chapterMode: enabled });
  const setInsertionError = (error: string) => drafts.patch(scope, { error });
  const [focusRequest, setFocusRequest] = useState(0);
  const screenRef = useRef<HTMLDivElement>(null);
  const bookItems = sortBookViewItems(toBookViewItems(allCitations.filter(c => c.bookId === bookId), chapterBlocks.filter(c => c.bookId === bookId)), 'date', 'asc');
  const target = resolveBookInsertion(bookItems, insertion ?? { depth: 0 });
  const requestedDepth = insertion?.depth ?? target?.previousDepth ?? 0;
  const chapterPlacement = target ? getChapterDropPlacement(chapterBlocks.filter(c => c.bookId === bookId), 'book-insertion-preview', target.position, requestedDepth) : null;
  const previewDepth = chapterMode ? chapterPlacement?.depth ?? 0 : target?.previousDepth ?? 0;
  const parentLabel = chapterMode ? chapterPlacement?.parent?.label : target?.parent?.label;
  const locationLabel = `${parentLabel ? `${parentLabel} 안` : '최상위'} · ${chapterMode ? '챕터' : '인용문'} 삽입`;

  useEffect(() => {
    if (!insertion) return;
    const frame = requestAnimationFrame(() => screenRef.current?.querySelector('[data-testid="book-insertion-preview"]')?.scrollIntoView?.({ block: 'nearest' }));
    return () => cancelAnimationFrame(frame);
  }, [insertion, chapterMode]);

  const latestCollapsed = useRef(collapsedDividerIds);
  latestCollapsed.current = collapsedDividerIds;
  const revealTarget = (next: BookInsertion) => {
    const resolved = resolveBookInsertion(bookItems, next);
    if (!resolved?.parent) return;
    let depth = resolved.depths.get(resolved.parent.id)!;
    for (const chapter of [...resolved.chapters].reverse()) {
      if (chapter.createdAtSort > resolved.parent.createdAtSort || resolved.depths.get(chapter.id)! > depth) continue;
      if (latestCollapsed.current?.has(chapter.id)) onToggleDivider?.(chapter.id);
      depth = resolved.depths.get(chapter.id)! - 1;
    }
  };
  useEffect(() => {
    if (!composer?.revealInsertion || loading) return;
    revealTarget(composer.revealInsertion);
    drafts.patch(scope, { revealInsertion: undefined });
  }, [composer?.revealInsertion, loading]);
  const selectInsertion = (afterId: string | null, depth: number) => {
    if (drafts.get(scope)?.saving) return;
    const next = { afterId, depth };
    setInsertion(next); revealTarget(next); setInsertionError(''); setFocusRequest(n => n + 1);
  };
  const changeLevel = (direction: 'in' | 'out') => {
    if (!target || drafts.get(scope)?.saving) return;
    const current = insertion ?? { depth: requestedDepth };
    const next = chapterMode
      ? { ...current, depth: changeChapterDepth(previewDepth, target.previousDepth, direction) }
      : changeCitationInsertion(bookItems, current, direction);
    setInsertion(next); revealTarget(next);
  };
  const submitAtInsertion: ArchiveScreenProps['onAddCitation'] = async data => {
    if (!bookId || !target || chapterActionsDisabled) {
      setInsertionError('삽입 위치를 확인할 수 없습니다. 구분선을 다시 선택해 주세요.');
      return { ok: false };
    }
    setInsertionError('');
    try {
      const result = chapterMode
        ? await onCreateChapterBlock?.({ bookId, label: data.text.trim(), createdAtSort: target.position, depth: previewDepth })
        : await onAddCitation({ ...data, bookId, createdAtSort: target.position });
      if ((chapterMode && !onCreateChapterBlock) || result === false || (result && typeof result === 'object' && 'ok' in result && result.ok === false)) throw new Error('Save failed');
      drafts.patch(scope, { insertion: null, chapterMode: false, revealInsertion: insertion ?? { depth: requestedDepth } });
      return { ok: true };
    } catch {
      setInsertionError('저장하지 못했습니다. 내용과 삽입 위치를 유지했습니다. 다시 시도해 주세요.');
      return { ok: false };
    }
  };

  useBookMetadata(title, authorName || editorPrefill?.author || '', isBookView && !searchTerm);
  const inlinePassageNotes = isBookView && !isMobileApp;
  const columnClassName = inlinePassageNotes
    ? 'w-[var(--book-column-size)] ml-[var(--book-column-left)]'
    : getArchiveReadingColumnClass({ isBookView, isMobileApp });
  const bookStyle = inlinePassageNotes ? {
    containerType: 'inline-size',
    '--book-column-size': 'min(var(--citation-column-width), calc(var(--book-reference-width, 100cqw) - 3rem))',
    '--book-column-left': 'calc(var(--book-left-reference, 0px) - var(--book-main-left, 0px) + (var(--book-reference-width, 100cqw) - var(--book-column-size)) / 2)',
  } as React.CSSProperties : undefined;

  return (
    <div ref={screenRef} className="flex h-full min-h-0 flex-col overflow-hidden" style={bookStyle}>
      <div className="min-h-0 flex-1 overflow-y-auto" data-archive-scroll>
        <div className={inlinePassageNotes ? columnClassName : undefined}>
        <ArchiveHeader
          title={title}
          showEditor={showEditor && !isBookView}
          username={username}
          editorPrefill={editorPrefill}
          isBookView={isBookView}
          compactBookHeader={inlinePassageNotes}
          isMobileApp={isMobileApp}
          onBackToAuthor={onBackToAuthor}
          authorName={authorName}
          onAddCitation={onAddCitation}
          sortField={sortField}
          dateDirection={dateDirection}
          pageDirection={pageDirection}
          onDateSortClick={onDateSortClick}
          onPageSortClick={onPageSortClick}
        />
        </div>

      <div className={isMobileApp ? 'pb-4 mt-1' : 'pb-6 mt-1'}>
        <div className={columnClassName} data-book-column={inlinePassageNotes || undefined}>
          {loadError ? (
            <div
              role="alert"
              className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100"
            >
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => void onRetryLoad()}
                className="min-h-10 rounded-lg px-3 font-semibold transition-[background-color,transform] hover:bg-red-100 active:scale-95 dark:hover:bg-red-300/10 motion-reduce:transition-none"
              >
                다시 시도
              </button>
            </div>
          ) : null}

          <BulkActionToolbar
            selectedCount={selectedIds.size}
            totalCount={citations.length}
            projects={projects}
            isCopying={isCopying}
            onSelectAll={onSelectAll}
            onCopy={onCopy}
            onDeleteRequest={onDeleteRequest}
            onCancel={onCancelSelection}
            onAddToProject={onAddToProject}
            onCreateAndAddToProject={onCreateAndAddToProject}
          />

          {loadError && citations.length === 0 && chapterBlocks.length === 0 ? null : <CitationList
            onSelectInsertion={showEditor && isBookView ? selectInsertion : undefined}
            insertionPreview={insertion && target ? { position: target.position, depth: previewDepth, chapterMode, label: locationLabel } : undefined}
            editDrafts={editDrafts}
            collapsedDividerIds={collapsedDividerIds}
            onToggleDivider={onToggleDivider}
            citations={citations}
            allCitations={allCitations}
            projects={projects}
            username={username}
            loading={loading}
            searchTerm={searchTerm}
            selectedIds={selectedIds}
            chapterBlocks={chapterBlocks}
            selectedFilter={selectedFilter}
            isBookView={isBookView}
            inlinePassageNotes={inlinePassageNotes}
            showAllPassageNotes={showAllPassageNotes}
            onToggleAllPassageNotes={onToggleAllPassageNotes}
            sortField={sortField}
            dateDirection={dateDirection}
            pageDirection={pageDirection}
            onCreateChapterBlock={onCreateChapterBlock}
            onMoveChapterBlock={onMoveChapterBlock}
            onMoveCitation={onMoveCitation}
            onRenameChapterBlock={onRenameChapterBlock}
            onDeleteChapterBlock={onDeleteChapterBlock}
            chapterActionsDisabled={chapterActionsDisabled || savingInsertion}
            onToggleSelect={onToggleSelect}
            onAddNote={onAddNote}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
            onDeleteCitation={onDeleteCitation}
            onUpdateCitation={onUpdateCitation}
            onRetryCitationSave={onRetryCitationSave}
            passageNoteCitationId={passageNoteCitationId}
            onPassageNoteCitationChange={onPassageNoteCitationChange}
          />}
        </div>
      </div>
      </div>
      {showEditor && isBookView ? (
        <div className={`shrink-0 bg-[var(--bg-main)] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 ${inlinePassageNotes ? '' : 'px-3 sm:px-5'}`}>
          <div className={columnClassName}>
            {insertionError && <p role="alert" className="mb-1 text-sm text-red-600">{insertionError}</p>}
            <CitationEditor
              onAddCitation={submitAtInsertion}
              draftScope={bookId}
              draftStore={drafts}
              chapterMode={chapterMode}
              onChapterModeChange={enabled => {
                if (drafts.get(scope)?.saving) return;
                setChapterMode(enabled);
                setInsertion(current => current ?? { depth: target?.previousDepth ?? 0 });
                setFocusRequest(n => n + 1);
              }}
              onHierarchyKey={changeLevel}
              insertionLabel={insertion ? locationLabel : undefined}
              onCancelInsertion={insertion ? () => { setInsertion(null); setInsertionError(''); } : undefined}
              focusRequest={focusRequest}
              readOnly={Boolean(chapterActionsDisabled) || savingInsertion}
              prefillData={editorPrefill}
              username={username}
              sequentialPageEntry
              autoFocusText
              hideSourceFields
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
