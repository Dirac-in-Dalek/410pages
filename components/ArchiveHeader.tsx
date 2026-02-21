import React from 'react';
import { CitationEditor } from './CitationEditor';
import { AddCitationInput } from '../types';

interface ArchiveHeaderProps {
    title: string;
    showEditor: boolean;
    username: string;
    editorPrefill?: { author: string, book: string };
    onAddCitation: (data: AddCitationInput) => void | Promise<unknown>;
    sortField: 'date' | 'page';
    dateDirection: 'asc' | 'desc';
    pageDirection: 'asc' | 'desc';
    onDateSortClick: () => void;
    onPageSortClick: () => void;
}

export const ArchiveHeader: React.FC<ArchiveHeaderProps> = ({
    title,
    showEditor,
    username,
    editorPrefill,
    onAddCitation,
    sortField,
    dateDirection,
    pageDirection,
    onDateSortClick,
    onPageSortClick
}) => {
    const isDateActive = sortField === 'date';
    const isPageActive = sortField === 'page';
    const dateLabel = isDateActive ? `Date ${dateDirection === 'asc' ? '↑' : '↓'}` : 'Date';
    const pageLabel = isPageActive ? `Page ${pageDirection === 'asc' ? '↑' : '↓'}` : 'Page';

    const getButtonClass = (isActive: boolean) => (
        `shrink-0 inline-flex items-center px-3 py-2 text-xs md:text-sm rounded-xl border transition-colors ${isActive
            ? 'border-[var(--text-main)] text-[var(--text-main)] bg-[var(--sidebar-hover)]'
            : 'border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--sidebar-hover)]'
        }`
    );

    return (
        <div className="pt-6 md:pt-10 pb-0">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <h2 className="font-serif text-2xl md:text-4xl text-[var(--text-main)] truncate">
                        {title}
                    </h2>
                    <div className="shrink-0 inline-flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onDateSortClick}
                            className={getButtonClass(sortField === 'date')}
                            aria-label={isDateActive ? `Sort by date: ${dateDirection === 'asc' ? 'ascending' : 'descending'}` : 'Sort by date'}
                            title={isDateActive ? `Sort by date: ${dateDirection === 'asc' ? 'ascending' : 'descending'}` : 'Sort by date'}
                        >
                            <span>{dateLabel}</span>
                        </button>
                        <button
                            type="button"
                            onClick={onPageSortClick}
                            className={getButtonClass(sortField === 'page')}
                            aria-label={isPageActive ? `Sort by page: ${pageDirection === 'asc' ? 'ascending' : 'descending'}` : 'Sort by page'}
                            title={isPageActive ? `Sort by page: ${pageDirection === 'asc' ? 'ascending' : 'descending'}` : 'Sort by page'}
                        >
                            <span>{pageLabel}</span>
                        </button>
                    </div>
                </div>
                <div className="h-px bg-[var(--border-main)] mb-4 md:mb-6"></div>
                {showEditor && (
                    <div className="mb-4">
                        <CitationEditor
                            onAddCitation={onAddCitation}
                            prefillData={editorPrefill}
                            username={username}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
