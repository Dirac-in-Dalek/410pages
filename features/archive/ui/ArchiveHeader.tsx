import React from 'react';
import { CitationEditor } from '../../citation-entry/ui/CitationEditor';
import type { ArchiveHeaderProps } from '../contract/archiveUiContract';
import { getArchiveReadingColumnClass } from './archiveReadingColumn';

export const ArchiveHeader: React.FC<ArchiveHeaderProps> = ({
    title,
    showEditor,
    username,
    editorPrefill,
    isBookView = false,
    onAddCitation,
    sortField,
    dateDirection,
    pageDirection,
    onDateSortClick,
    onPageSortClick,
}) => {
    const isDateActive = sortField === 'date';
    const isPageActive = sortField === 'page';
    const dateLabel = isDateActive ? `Date ${dateDirection === 'asc' ? '↓' : '↑'}` : 'Date';
    const pageLabel = isPageActive ? `Page ${pageDirection === 'asc' ? '↓' : '↑'}` : 'Page';
    const columnClassName = getArchiveReadingColumnClass({ isBookView });

    const getButtonClass = (isActive: boolean) =>
        `type-label-bounded shrink-0 inline-flex items-center rounded-full border px-3.5 py-1.5 transition-colors active:scale-95 ${
            isActive
                ? 'border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-main)] shadow-[var(--shadow-card)]'
                : 'border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]'
        }`;

    return (
        <div className="pt-5 md:pt-6 lg:pt-7 pb-1">
            <div className={columnClassName}>
                <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="truncate text-[1.8rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{title}</h2>
                        <p className="mt-1 text-[0.9rem] text-[var(--text-secondary)]">Capture, sort, and revisit your saved notes.</p>
                    </div>
                    <div className="shrink-0 inline-flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onDateSortClick}
                            className={getButtonClass(isDateActive)}
                            aria-label={isDateActive ? `Sort by date: ${dateDirection === 'asc' ? 'ascending' : 'descending'}` : 'Sort by date'}
                            title={isDateActive ? `Sort by date: ${dateDirection === 'asc' ? 'ascending' : 'descending'}` : 'Sort by date'}
                        >
                            <span>{dateLabel}</span>
                        </button>
                        <button
                            type="button"
                            onClick={onPageSortClick}
                            className={getButtonClass(isPageActive)}
                            aria-label={isPageActive ? `Sort by page: ${pageDirection === 'asc' ? 'ascending' : 'descending'}` : 'Sort by page'}
                            title={isPageActive ? `Sort by page: ${pageDirection === 'asc' ? 'ascending' : 'descending'}` : 'Sort by page'}
                        >
                            <span>{pageLabel}</span>
                        </button>
                    </div>
                </div>
                {showEditor ? (
                    <div className="mb-3 md:mb-4">
                        <CitationEditor
                            onAddCitation={onAddCitation}
                            prefillData={editorPrefill}
                            username={username}
                            sequentialPageEntry={isBookView}
                            autoFocusText={isBookView}
                            hideSourceFields={isBookView}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
};
