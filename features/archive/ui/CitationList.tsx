import React, { useState } from 'react';
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
                                    isSelected={selectedIds.has(item.citation.id)}
                                    onToggleSelect={onToggleSelect}
                                    onAddNote={onAddNote}
                                    onUpdateNote={onUpdateNote}
                                    onDeleteNote={onDeleteNote}
                                    onDelete={onDeleteCitation}
                                    onUpdate={onUpdateCitation}
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
                                <div className="group -mt-2.5 flex h-5 items-center justify-center">
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
                    <div className="group -mt-2.5 flex h-5 items-center justify-center">
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
