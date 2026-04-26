import React from 'react';
import { BulkActionToolbar } from '../../../components/BulkActionToolbar';
import { ConfirmModal } from '../../../components/ConfirmModal';
import type {
  ChapterBlock,
  Citation,
  CreateChapterBlockInput,
  Project,
} from '../../../types';
import { ArchiveHeader } from './ArchiveHeader';
import { getArchiveReadingColumnClass } from './archiveReadingColumn';
import { CitationList } from './CitationList';

type ArchiveScreenProps = {
  isMobileApp: boolean;
  title: string;
  showEditor: boolean;
  username: string;
  editorPrefill?: { author: string; book: string };
  isBookView: boolean;
  sortField: 'date' | 'page';
  dateDirection: 'asc' | 'desc';
  pageDirection: 'asc' | 'desc';
  onAddCitation: (data: any) => void | Promise<unknown>;
  onRetryCitationSave: (citationId: string) => void | Promise<unknown>;
  onDateSortClick: () => void;
  onPageSortClick: () => void;
  projects: Project[];
  citations: Citation[];
  chapterBlocks: ChapterBlock[];
  loading: boolean;
  searchTerm: string;
  selectedIds: Set<string>;
  selectedFilter?: { type: 'author' | 'book'; value: string; author?: string } | null;
  isCopying: boolean;
  isBatchDeleteOpen: boolean;
  onSelectAll: () => void;
  onCopy: () => void | Promise<unknown>;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onCancelSelection: () => void;
  onAddToProject: (projectId: string) => void | Promise<unknown>;
  onCreateAndAddToProject: (name: string) => void | Promise<unknown>;
  onCreateChapterBlock?: (input: CreateChapterBlockInput) => Promise<unknown> | unknown;
  onDeleteChapterBlock?: (bookId: string, blockId: string) => Promise<unknown> | unknown;
  onToggleSelect: (id: string, selected: boolean) => void;
  onAddNote: (citationId: string, content: string) => void | Promise<unknown>;
  onUpdateNote: (citationId: string, noteId: string, content: string) => void;
  onDeleteNote: (citationId: string, noteId: string) => void;
  onDeleteCitation: (id: string) => void;
  onUpdateCitation: (id: string, data: Partial<Citation>) => void | Promise<unknown>;
};

export const ArchiveScreen: React.FC<ArchiveScreenProps> = ({
  isMobileApp,
  title,
  showEditor,
  username,
  editorPrefill,
  isBookView,
  sortField,
  dateDirection,
  pageDirection,
  onAddCitation,
  onRetryCitationSave,
  onDateSortClick,
  onPageSortClick,
  projects,
  citations,
  chapterBlocks,
  loading,
  searchTerm,
  selectedIds,
  selectedFilter,
  isCopying,
  isBatchDeleteOpen,
  onSelectAll,
  onCopy,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onCancelSelection,
  onAddToProject,
  onCreateAndAddToProject,
  onCreateChapterBlock,
  onDeleteChapterBlock,
  onToggleSelect,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onDeleteCitation,
  onUpdateCitation,
}) => {
  const columnClassName = getArchiveReadingColumnClass({ isBookView, isMobileApp });

  return (
    <div className="h-full overflow-y-auto">
      <ArchiveHeader
        title={title}
        showEditor={showEditor}
        username={username}
        editorPrefill={editorPrefill}
        isBookView={isBookView}
        onAddCitation={onAddCitation}
        sortField={sortField}
        dateDirection={dateDirection}
        pageDirection={pageDirection}
        onDateSortClick={onDateSortClick}
        onPageSortClick={onPageSortClick}
      />

      <div className={isMobileApp ? 'pb-28 mt-3' : 'pb-20 mt-1 md:mt-2'}>
        <div className={columnClassName}>
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

          <ConfirmModal
            isOpen={isBatchDeleteOpen}
            title="Delete citations?"
            message={
              <>
                <span className="font-bold text-[var(--text-main)]">{selectedIds.size}</span> citation(s) will be permanently deleted. This action cannot be undone.
              </>
            }
            onConfirm={onDeleteConfirm}
            onCancel={onDeleteCancel}
          />

          <CitationList
            citations={citations}
            projects={projects}
            username={username}
            loading={loading}
            searchTerm={searchTerm}
            selectedIds={selectedIds}
            chapterBlocks={chapterBlocks}
            selectedFilter={selectedFilter}
            isBookView={isBookView}
            sortField={sortField}
            dateDirection={dateDirection}
            pageDirection={pageDirection}
            onCreateChapterBlock={onCreateChapterBlock}
            onDeleteChapterBlock={onDeleteChapterBlock}
            onToggleSelect={onToggleSelect}
            onAddNote={onAddNote}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
            onDeleteCitation={onDeleteCitation}
            onUpdateCitation={onUpdateCitation}
            onRetryCitationSave={onRetryCitationSave}
          />
        </div>
      </div>
    </div>
  );
};
