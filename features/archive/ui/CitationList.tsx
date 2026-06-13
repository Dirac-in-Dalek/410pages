import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ChapterBlockCard } from '../../../components/ChapterBlockCard';
import { ChapterBlockInsertButton } from '../../../components/ChapterBlockInsertButton';
import {
    getDescendingMidpoint,
    getInsertionPageSort,
    getMidpoint,
    sortBookViewItems,
    toBookViewItems,
} from '../../../lib/bookViewItems';
import type { CitationListProps } from '../contract/archiveUiContract';
import { CitationCard } from './CitationCard';

export const CitationList: React.FC<CitationListProps> = ({
    citations,
    projects,
    username,
    loading,
    searchTerm,
    selectedIds,
    onToggleSelect,
    onAddNote,
    onUpdateNote,
    onDeleteNote,
    onDeleteCitation,
    onUpdateCitation,
    onRetryCitationSave,
    chapterBlocks = [],
    selectedFilter = null,
    isBookView = false,
    sortField,
    dateDirection,
    pageDirection,
    onCreateChapterBlock,
    onDeleteChapterBlock,
}) => {
    const [activeInsertId, setActiveInsertId] = useState<string | null>(null);
    const [overflowingCitationIds, setOverflowingCitationIds] = useState<Set<string>>(() => new Set());
    const [expandedCitationIds, setExpandedCitationIds] = useState<Set<string>>(() => new Set());
    const bookId = chapterBlocks[0]?.bookId ?? citations.find((citation) => citation.bookId)?.bookId;
    const currentSortField: 'date' | 'page' = sortField ?? 'page';
    const currentDateDirection: 'asc' | 'desc' = dateDirection ?? 'desc';
    const currentPageDirection: 'asc' | 'desc' = pageDirection ?? 'asc';
    const direction: 'asc' | 'desc' = currentSortField === 'date' ? currentDateDirection : currentPageDirection;
    const bookViewItems = isBookView
        ? sortBookViewItems(toBookViewItems(citations, chapterBlocks), currentSortField, direction)
        : citations.map((citation) => ({
              type: 'citation' as const,
              id: citation.id,
              citation,
          }));
    const visibleCitationIdsKey = bookViewItems
        .filter((item) => item.type === 'citation')
        .map((item) => item.id)
        .join('\u0000');
    const hasExpandableCitations = overflowingCitationIds.size > 0;
    const allExpandableCitationsExpanded =
        hasExpandableCitations && [...overflowingCitationIds].every((id) => expandedCitationIds.has(id));

    const handleTextOverflowChange = useCallback((id: string, isOverflowing: boolean) => {
        setOverflowingCitationIds((prev) => {
            const alreadyTracked = prev.has(id);
            if (alreadyTracked === isOverflowing) return prev;

            const next = new Set(prev);
            if (isOverflowing) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });

        if (!isOverflowing) {
            setExpandedCitationIds((prev) => {
                if (!prev.has(id)) return prev;

                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }, []);

    const handleTextExpandedChange = useCallback((id: string, isExpanded: boolean) => {
        setExpandedCitationIds((prev) => {
            const alreadyExpanded = prev.has(id);
            if (alreadyExpanded === isExpanded) return prev;

            const next = new Set(prev);
            if (isExpanded) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    }, []);

    const handleToggleAllCitationText = () => {
        setExpandedCitationIds((prev) => {
            const next = new Set(prev);
            if (allExpandableCitationsExpanded) {
                overflowingCitationIds.forEach((id) => next.delete(id));
            } else {
                overflowingCitationIds.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    useEffect(() => {
        const visibleIds = new Set(visibleCitationIdsKey ? visibleCitationIdsKey.split('\u0000') : []);
        setOverflowingCitationIds((prev) => {
            const next = new Set([...prev].filter((id) => visibleIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
        setExpandedCitationIds((prev) => {
            const next = new Set([...prev].filter((id) => visibleIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [visibleCitationIdsKey]);

    const buildChapterBlockInput = (
        leftItem?: { pageSort?: number; createdAtSort: number },
        rightItem?: { pageSort?: number; createdAtSort: number }
    ) => {
        if (!bookId) return null;

        const pageSort = getInsertionPageSort(leftItem?.pageSort, rightItem?.pageSort);
        const createdAtSort =
            currentSortField === 'date' && direction === 'asc'
                ? getMidpoint(leftItem?.createdAtSort, rightItem?.createdAtSort)
                : getDescendingMidpoint(leftItem?.createdAtSort, rightItem?.createdAtSort);

        return {
            bookId,
            pageSort,
            createdAtSort: createdAtSort ?? Date.now(),
        };
    };

    const handleCreateChapterBlock = async (
        leftItem?: { pageSort?: number; createdAtSort: number },
        rightItem?: { pageSort?: number; createdAtSort: number },
        label?: string
    ) => {
        if (!onCreateChapterBlock || !label) return;

        const input = buildChapterBlockInput(leftItem, rightItem);
        if (!input) return;

        await Promise.resolve(
            onCreateChapterBlock({
                ...input,
                label,
            })
        );
        setActiveInsertId(null);
    };

    if (loading) {
        return <div className="type-body text-center py-20 text-[var(--text-muted)]">Loading your citations...</div>;
    }

    if (bookViewItems.length === 0) {
        return (
            <div className="type-body text-center py-20 text-[var(--text-muted)] border-2 border-dashed border-[var(--border-main)] rounded-xl">
                <p>{searchTerm ? 'No matches found.' : 'No citations found in this view.'}</p>
                <p className="type-body-muted mt-2">{searchTerm ? 'Try another keyword.' : 'Drag items from the right or type above.'}</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {hasExpandableCitations ? (
            <div className="mb-2 flex justify-end">
                <button
                    type="button"
                    aria-label="Toggle all citations"
                    aria-pressed={allExpandableCitationsExpanded}
                    onClick={handleToggleAllCitationText}
                    className="type-label-bounded inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-1.5 text-[0.82rem] font-medium text-[var(--text-muted)] shadow-sm transition-all hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)] active:scale-95"
                >
                    {allExpandableCitationsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {allExpandableCitationsExpanded ? 'Collapse all' : 'Expand all'}
                </button>
            </div>
            ) : null}
            <div className="flex flex-col">
                {bookViewItems.map((item, index) => {
                    const citation = item.type === 'citation' ? item.citation : undefined;
                    const nextItem = bookViewItems[index + 1];
                    const canShowInsertAfter =
                        item.type !== 'chapter_block' && nextItem?.type !== 'chapter_block';
                    const citationProjects = citation
                        ? projects.filter((project) => project.citationIds.includes(citation.id)).map((project) => project.name)
                        : [];

                    return (
                        <React.Fragment key={item.id}>
                            {item.type === 'citation' ? (
                                <CitationCard
                                    index={index}
                                    citation={item.citation}
                                    username={username}
                                    selectedFilter={selectedFilter}
                                    projectNames={citationProjects}
                                    isTextExpanded={expandedCitationIds.has(item.citation.id)}
                                    onTextExpandedChange={handleTextExpandedChange}
                                    onTextOverflowChange={handleTextOverflowChange}
                                    isSelected={selectedIds.has(item.citation.id)}
                                    onToggleSelect={onToggleSelect}
                                    onAddNote={onAddNote}
                                    onUpdateNote={onUpdateNote}
                                    onDeleteNote={onDeleteNote}
                                    onDelete={onDeleteCitation}
                                    onUpdate={onUpdateCitation}
                                    onRetrySave={onRetryCitationSave}
                                />
                            ) : (
                                <ChapterBlockCard
                                    id={item.block.id}
                                    label={item.block.label}
                                    onDelete={(blockId) => {
                                        void Promise.resolve(onDeleteChapterBlock?.(item.block.bookId, blockId));
                                    }}
                                />
                            )}
                            {isBookView && index < bookViewItems.length - 1 && canShowInsertAfter && (activeInsertId === null || activeInsertId === `after-${item.id}`) ? (
                                <div className={`group flex items-center justify-center ${activeInsertId === `after-${item.id}` ? 'my-1.5 min-h-12' : '-mt-2.5 h-5'}`}>
                                    <ChapterBlockInsertButton
                                        isEditing={activeInsertId === `after-${item.id}`}
                                        onOpen={() => setActiveInsertId(`after-${item.id}`)}
                                        onCancel={() => setActiveInsertId(null)}
                                        onSubmit={async (label) => {
                                            await handleCreateChapterBlock(
                                                { pageSort: item.pageSort, createdAtSort: item.createdAtSort },
                                                bookViewItems[index + 1],
                                                label
                                            );
                                        }}
                                    />
                                </div>
                            ) : null}
                        </React.Fragment>
                    );
                })}
                {isBookView && bookViewItems.length > 0 && bookViewItems[bookViewItems.length - 1].type !== 'chapter_block' && (activeInsertId === null || activeInsertId === 'end') ? (
                    <div className={`group flex items-center justify-center ${activeInsertId === 'end' ? 'my-1.5 min-h-12' : '-mt-2.5 h-5'}`}>
                        <ChapterBlockInsertButton
                            isEditing={activeInsertId === 'end'}
                            onOpen={() => setActiveInsertId('end')}
                            onCancel={() => setActiveInsertId(null)}
                            onSubmit={async (label) => {
                                const lastItem = bookViewItems[bookViewItems.length - 1];
                                await handleCreateChapterBlock(
                                    lastItem ? { pageSort: lastItem.pageSort, createdAtSort: lastItem.createdAtSort } : undefined,
                                    undefined,
                                    label
                                );
                            }}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
};
