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
import { buildCitationRenderRows } from '../logic/citationRenderRows';
import type { CitationListProps } from '../contract/archiveUiContract';
import { CitationCard } from './CitationCard';
import { WordCardGroup } from './WordCardGroup';

export const CitationList: React.FC<CitationListProps> = ({
    citations,
    allCitations = citations,
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
    const sentenceCitations = citations.filter((citation) => (citation.kind || 'sentence') === 'sentence');
    const baseItems = isBookView
        ? sortBookViewItems(toBookViewItems(sentenceCitations, chapterBlocks), currentSortField, direction)
        : sentenceCitations.map((citation) => ({
              type: 'citation' as const,
              id: citation.id,
              citation,
              pageSort: citation.pageSort,
              createdAtSort: citation.createdAt,
          }));
    const renderRows = buildCitationRenderRows(citations, baseItems, allCitations);
    const visibleSentenceIds = renderRows
        .filter((item) => item.type === 'sentence')
        .map((item) => item.id);
    const visibleSentenceIdsKey = visibleSentenceIds.join('\u0000');
    const hasVisibleSentences = visibleSentenceIds.length > 0;
    const allVisibleCitationsExpanded =
        hasVisibleSentences && visibleSentenceIds.every((id) => expandedCitationIds.has(id));

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
            if (allVisibleCitationsExpanded) {
                visibleSentenceIds.forEach((id) => next.delete(id));
            } else {
                visibleSentenceIds.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    useEffect(() => {
        const visibleIds = new Set(visibleSentenceIdsKey ? visibleSentenceIdsKey.split('\u0000') : []);
        setOverflowingCitationIds((prev) => {
            const next = new Set([...prev].filter((id) => visibleIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
        setExpandedCitationIds((prev) => {
            const next = new Set([...prev].filter((id) => visibleIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [visibleSentenceIdsKey]);

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
        return <div className="type-body py-20 text-center text-[var(--text-muted)]" role="status">항목을 불러오는 중…</div>;
    }

    if (renderRows.length === 0) {
        return (
            <div className="type-body text-center py-20 text-[var(--text-muted)] border-2 border-dashed border-[var(--border-main)] rounded-xl">
                <p>{searchTerm ? '검색 결과가 없습니다.' : '아직 수집한 항목이 없습니다.'}</p>
                <p className="type-body-muted mt-2">{searchTerm ? '다른 검색어를 입력해보세요.' : '위 입력창에서 문장이나 단어를 추가해보세요.'}</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {hasVisibleSentences ? (
            <div className="mb-1.5 flex justify-start px-2">
                <button
                    type="button"
                    aria-label={allVisibleCitationsExpanded ? '문장 모두 접기' : '문장 모두 펼치기'}
                    aria-pressed={allVisibleCitationsExpanded}
                    onClick={handleToggleAllCitationText}
                    className="type-label-bounded inline-flex min-h-11 items-center gap-1 rounded-md px-1.5 py-1 text-[0.82rem] font-medium text-[var(--text-muted)] transition-[background-color,color,transform] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)] active:scale-95 motion-reduce:transition-none sm:min-h-8"
                >
                    {allVisibleCitationsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {allVisibleCitationsExpanded ? '문장 모두 접기' : '문장 모두 펼치기'}
                </button>
            </div>
            ) : null}
            <div className="flex flex-col">
                {renderRows.map((item, index) => {
                    const citation = item.type === 'sentence' ? item.citation : undefined;
                    const nextItem = renderRows[index + 1];
                    const canShowInsertAfter =
                        item.type !== 'chapter_block' &&
                        nextItem?.type !== 'chapter_block' &&
                        nextItem?.type !== 'word_group';
                    const citationProjects = citation
                        ? projects.filter((project) => project.citationIds.includes(citation.id)).map((project) => project.name)
                        : [];

                    return (
                        <React.Fragment key={item.id}>
                            {item.type === 'sentence' ? (
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
                            ) : item.type === 'word_group' ? (
                                <WordCardGroup
                                    citations={item.citations}
                                    selectedIds={selectedIds}
                                    onToggleSelect={onToggleSelect}
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
                            {isBookView && index < renderRows.length - 1 && canShowInsertAfter && (activeInsertId === null || activeInsertId === `after-${item.id}`) ? (
                                <div className={`group flex items-center justify-center ${activeInsertId === `after-${item.id}` ? 'my-1.5 min-h-12' : '-mt-2.5 h-5'}`}>
                                    <ChapterBlockInsertButton
                                        isEditing={activeInsertId === `after-${item.id}`}
                                        onOpen={() => setActiveInsertId(`after-${item.id}`)}
                                        onCancel={() => setActiveInsertId(null)}
                                        onSubmit={async (label) => {
                                            await handleCreateChapterBlock(
                                                { pageSort: item.pageSort, createdAtSort: item.createdAtSort },
                                                renderRows[index + 1],
                                                label
                                            );
                                        }}
                                    />
                                </div>
                            ) : null}
                        </React.Fragment>
                    );
                })}
                {isBookView && renderRows.length > 0 && renderRows[renderRows.length - 1].type !== 'chapter_block' && (activeInsertId === null || activeInsertId === 'end') ? (
                    <div className={`group flex items-center justify-center ${activeInsertId === 'end' ? 'my-1.5 min-h-12' : '-mt-2.5 h-5'}`}>
                        <ChapterBlockInsertButton
                            isEditing={activeInsertId === 'end'}
                            onOpen={() => setActiveInsertId('end')}
                            onCancel={() => setActiveInsertId(null)}
                            onSubmit={async (label) => {
                                const lastItem = renderRows[renderRows.length - 1];
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
