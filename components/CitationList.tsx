import React, { useState } from 'react';
import { ChapterBlock, Citation, CreateChapterBlockInput, Project } from '../types';
import { CitationCard } from './CitationCard';
import { ChapterBlockCard } from './ChapterBlockCard';
import { ChapterBlockInsertButton } from './ChapterBlockInsertButton';
import {
    getDescendingMidpoint,
    getInsertionPageSort,
    sortBookViewItems,
    toBookViewItems,
    getMidpoint,
} from '../lib/bookViewItems';

interface CitationListProps {
    citations: Citation[];
    projects: Project[];
    username: string;
    loading: boolean;
    searchTerm: string;
    selectedIds: Set<string>;
    onToggleSelect: (id: string, selected: boolean) => void;
    onAddNote: (citationId: string, content: string) => void;
    onUpdateNote: (citationId: string, noteId: string, content: string) => void;
    onDeleteNote: (citationId: string, noteId: string) => void;
    onDeleteCitation: (id: string) => void;
    onUpdateCitation: (id: string, data: Partial<Citation>) => void;
    chapterBlocks?: ChapterBlock[];
    isBookView?: boolean;
    sortField?: 'date' | 'page';
    dateDirection?: 'asc' | 'desc';
    pageDirection?: 'asc' | 'desc';
    onCreateChapterBlock?: (input: CreateChapterBlockInput) => Promise<unknown> | unknown;
    onDeleteChapterBlock?: (bookId: string, blockId: string) => Promise<unknown> | unknown;
}

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
    isBookView = false,
    sortField = 'page',
    dateDirection = 'desc',
    pageDirection = 'asc',
    onCreateChapterBlock,
    onDeleteChapterBlock
}) => {
    const [activeInsertId, setActiveInsertId] = useState<string | null>(null);
    const bookId = chapterBlocks[0]?.bookId ?? citations.find((citation) => citation.bookId)?.bookId;
    const direction = sortField === 'date' ? dateDirection : pageDirection;
    const bookViewItems = isBookView
        ? sortBookViewItems(toBookViewItems(citations, chapterBlocks), sortField, direction)
        : citations.map((citation) => ({
            type: 'citation' as const,
            id: citation.id,
            citation,
        }));

    const buildChapterBlockInput = (leftItem?: { pageSort?: number; createdAtSort: number }, rightItem?: { pageSort?: number; createdAtSort: number }) => {
        if (!bookId) return null;

        const pageSort = getInsertionPageSort(leftItem?.pageSort, rightItem?.pageSort);
        const createdAtSort = sortField === 'date' && direction === 'asc'
            ? getMidpoint(leftItem?.createdAtSort, rightItem?.createdAtSort)
            : getDescendingMidpoint(leftItem?.createdAtSort, rightItem?.createdAtSort);

        return {
            bookId,
            pageSort,
            createdAtSort: createdAtSort ?? Date.now(),
        };
    };

    const handleCreateChapterBlock = async (leftItem?: { pageSort?: number; createdAtSort: number }, rightItem?: { pageSort?: number; createdAtSort: number }, label?: string) => {
        if (!onCreateChapterBlock || !label) return;

        const input = buildChapterBlockInput(leftItem, rightItem);
        if (!input) return;

        await Promise.resolve(onCreateChapterBlock({
            ...input,
            label,
        }));
        setActiveInsertId(null);
    };

    if (loading) {
        return (
            <div className="type-body text-center py-20 text-[var(--text-muted)]">
                Loading your citations...
            </div>
        );
    }

    if (bookViewItems.length === 0) {
        return (
            <div className="type-body text-center py-20 text-[var(--text-muted)] border-2 border-dashed border-[var(--border-main)] rounded-xl">
                <p>{searchTerm ? 'No matches found.' : 'No citations found in this view.'}</p>
                <p className="type-body-muted mt-2">
                    {searchTerm ? 'Try another keyword.' : 'Drag items from the right or type above.'}
                </p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="flex flex-col">
                {bookViewItems.map((item, index) => {
                    const citation = item.type === 'citation' ? item.citation : undefined;
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
                            {isBookView && index < bookViewItems.length - 1 && (activeInsertId === null || activeInsertId === `after-${item.id}`) ? (
                                <div className="group flex justify-center py-0.5">
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
                {isBookView && bookViewItems.length > 0 && (activeInsertId === null || activeInsertId === 'end') ? (
                    <div className="group flex justify-center py-0.5">
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
