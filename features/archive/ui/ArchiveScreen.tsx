import React from 'react';
import { BulkActionToolbar } from '../../../components/BulkActionToolbar';
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
  onMoveChapterBlock?: (bookId: string, id: string, createdAtSort: number) => Promise<boolean> | boolean;
  onRenameChapterBlock?: (bookId: string, id: string, label: string) => Promise<boolean> | boolean;
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden" style={bookStyle}>
      <div className="min-h-0 flex-1 overflow-y-auto" data-archive-scroll>
        <div className={inlinePassageNotes ? columnClassName : undefined}>
        <ArchiveHeader
          title={title}
          showEditor={showEditor && !isBookView}
          username={username}
          editorPrefill={editorPrefill}
          isBookView={isBookView}
          compactBookHeader={inlinePassageNotes}
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

      <div className={isMobileApp ? 'pb-8 mt-3' : 'pb-10 mt-1 md:mt-2'}>
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
            onRenameChapterBlock={onRenameChapterBlock}
            onDeleteChapterBlock={onDeleteChapterBlock}
            chapterActionsDisabled={chapterActionsDisabled}
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
        <div className={`shrink-0 bg-[var(--bg-main)] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 ${inlinePassageNotes ? '' : 'px-3 sm:px-5'}`}>
          <div className={columnClassName}>
            <CitationEditor
              onAddCitation={onAddCitation}
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
