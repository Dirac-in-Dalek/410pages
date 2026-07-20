import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react';
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
    const dateLabel = `작성일 · ${dateDirection === 'asc' ? '오래된순' : '최신순'}`;
    const pageLabel = `페이지 · ${pageDirection === 'asc' ? '오름차순' : '내림차순'}`;
    const activeSortLabel = isDateActive ? dateLabel : pageLabel;
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const columnClassName = getArchiveReadingColumnClass({ isBookView });

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!filterRef.current?.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    const getMenuButtonClass = (isActive: boolean) =>
        `type-label-bounded flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-[background-color,color,transform] active:scale-95 motion-reduce:transition-none ${
            isActive
                ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]'
        }`;

    const handleDateSelect = () => {
        onDateSortClick();
    };

    const handlePageSelect = () => {
        onPageSortClick();
    };

    return (
        <div className="pt-5 md:pt-6 lg:pt-7 pb-1">
            <div className={columnClassName}>
                <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="truncate text-[1.8rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{title}</h2>
                        <p className="mt-1 text-[0.9rem] text-[var(--text-secondary)]">수집한 문장과 단어를 정리하고 다시 읽어보세요.</p>
                    </div>
                    <div
                        ref={filterRef}
                        className="relative shrink-0"
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') setIsFilterOpen(false);
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen((prev) => !prev)}
                            className="type-label-bounded inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--border-main)] bg-[var(--bg-card)] px-3.5 py-1.5 text-[var(--text-main)] shadow-[var(--shadow-card)] transition-[background-color,transform] hover:bg-[var(--sidebar-hover)] active:scale-95 motion-reduce:transition-none"
                            aria-label={`정렬: ${activeSortLabel}`}
                            aria-expanded={isFilterOpen}
                            aria-haspopup="menu"
                            title={`정렬: ${activeSortLabel}`}
                        >
                            <SlidersHorizontal size={14} />
                            <span className="hidden sm:inline">정렬</span>
                            <span className="sm:hidden">
                                {isDateActive
                                    ? dateDirection === 'asc' ? '오래된순' : '최신순'
                                    : pageDirection === 'asc' ? '페이지 ↑' : '페이지 ↓'}
                            </span>
                            <span className="hidden text-[var(--text-muted)] sm:inline">{activeSortLabel}</span>
                            <ChevronDown size={14} className={`transition-transform motion-reduce:transition-none ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isFilterOpen ? (
                            <div
                                role="menu"
                                className="absolute right-0 top-full z-[120] mt-1 w-48 overflow-hidden rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-1.5 text-[var(--text-main)] shadow-[var(--shadow-popover)]"
                            >
                                <button
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={isDateActive}
                                    onClick={handleDateSelect}
                                    className={getMenuButtonClass(isDateActive)}
                                >
                                    <span>{dateLabel}</span>
                                    {isDateActive ? <Check size={14} /> : null}
                                </button>
                                <button
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={isPageActive}
                                    onClick={handlePageSelect}
                                    className={getMenuButtonClass(isPageActive)}
                                >
                                    <span>{pageLabel}</span>
                                    {isPageActive ? <Check size={14} /> : null}
                                </button>
                            </div>
                        ) : null}
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
