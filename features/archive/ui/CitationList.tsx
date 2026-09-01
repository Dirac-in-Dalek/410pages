import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Copy, MessageCircle, MoreHorizontal, RefreshCw, X } from 'lucide-react';
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
import { useModalFocus } from '../../../shared/ui/useModalFocus';
import { formatCitationRecoveryText, writeTextToClipboard } from '../../../lib/citationCopy';
import { FlatCitationHighlightText } from './FlatCitationHighlightText';

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
    chapterActionsDisabled = false,
    passageNoteCitationId = null,
    onPassageNoteCitationChange,
}) => {
    const [activeInsertId, setActiveInsertId] = useState<string | null>(null);
    const [overflowingCitationIds, setOverflowingCitationIds] = useState<Set<string>>(() => new Set());
    const [expandedCitationIds, setExpandedCitationIds] = useState<Set<string>>(() => new Set());
    const [detailCitationId, setDetailCitationId] = useState<string | null>(null);
    const [copiedRecoveryCitationId, setCopiedRecoveryCitationId] = useState<string | null>(null);
    const suppressPassageClickRef = useRef<string | null>(null);
    const detailDialogRef = useModalFocus<HTMLElement>(Boolean(detailCitationId), () => setDetailCitationId(null));
    const bookId = chapterBlocks[0]?.bookId ?? citations.find((citation) => citation.bookId)?.bookId;
    const currentSortField: 'date' | 'page' = isBookView ? 'date' : sortField ?? 'page';
    const currentDateDirection: 'asc' | 'desc' = isBookView ? 'asc' : dateDirection ?? 'desc';
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
    const renderRows = buildCitationRenderRows(citations, baseItems, allCitations, isBookView);
    const visibleSentenceIds = renderRows
        .filter((item) => item.type === 'sentence')
        .map((item) => item.id);
    const visibleSentenceIdsKey = visibleSentenceIds.join('\u0000');
    const hasVisibleSentences = visibleSentenceIds.length > 0;
    const allVisibleCitationsExpanded =
        hasVisibleSentences && visibleSentenceIds.every((id) => expandedCitationIds.has(id));
    const activeCitation = citations.find((citation) => citation.id === detailCitationId) ?? null;

    useEffect(() => {
        if (!detailCitationId) return;
        if (!citations.some((citation) => citation.id === detailCitationId)) setDetailCitationId(null);
    }, [detailCitationId, citations]);

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

    const togglePassageNotes = (citationId: string) => {
        onPassageNoteCitationChange?.(passageNoteCitationId === citationId ? null : citationId);
    };

    const handleCopyRecoveryText = async (citation: typeof citations[number]) => {
        try {
            await writeTextToClipboard(formatCitationRecoveryText(citation, username));
            setCopiedRecoveryCitationId(citation.id);
            window.setTimeout(() => setCopiedRecoveryCitationId(null), 1600);
        } catch (error) {
            console.error('Failed to copy failed citation:', error);
        }
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

        const result = await Promise.resolve(
            onCreateChapterBlock({
                ...input,
                label,
            })
        );
        if (result === false) return false;
        setActiveInsertId(null);
        return true;
    };

    if (loading && renderRows.length === 0) {
        return <div className="type-body py-20 text-center text-[var(--text-muted)]" role="status">항목을 불러오는 중…</div>;
    }

    if (renderRows.length === 0) {
        return (
            <div className={[
                'type-body py-20 text-center text-[var(--text-muted)]',
                isBookView ? 'border-y border-[var(--border-main)]' : 'rounded-xl border-2 border-dashed border-[var(--border-main)]',
            ].join(' ')}>
                <p>{searchTerm ? '검색 결과가 없습니다.' : '아직 수집한 항목이 없습니다.'}</p>
                <p className="type-body-muted mt-2">{searchTerm ? '다른 검색어를 입력해보세요.' : `${isBookView ? '아래' : '위'} 입력창에서 문장이나 단어를 추가해보세요.`}</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {hasVisibleSentences && !isBookView ? (
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
                            {item.type === 'sentence' && isBookView ? (
                                <div
                                    data-testid={`citation-${item.citation.id}`}
                                    className={[
                                        'group flex items-start border-b border-[var(--border-main)] transition-[background-color,color] duration-150',
                                        selectedIds.has(item.citation.id) ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--sidebar-hover)]',
                                        item.citation.saveStatus === 'failed' ? 'bg-red-50/60 dark:bg-red-500/10' : '',
                                    ].join(' ')}
                                >
                                    <label className="flex min-h-14 w-11 shrink-0 cursor-pointer items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(item.citation.id)}
                                            onChange={(event) => onToggleSelect(item.citation.id, event.target.checked)}
                                            aria-label={`문장 선택: ${item.citation.text.slice(0, 40)}`}
                                            className={[
                                                'h-4 w-4 rounded border-[var(--border-main)] text-[var(--accent)] transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]',
                                                selectedIds.has(item.citation.id) ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
                                            ].join(' ')}
                                        />
                                    </label>
                                    <div className="min-w-0 flex-1">
                                        <div
                                            data-passage-note-trigger
                                            onClick={() => {
                                                if (suppressPassageClickRef.current === item.citation.id) {
                                                    suppressPassageClickRef.current = null;
                                                    return;
                                                }
                                                togglePassageNotes(item.citation.id);
                                            }}
                                            className="w-full cursor-pointer px-1 py-5 text-left active:scale-[0.99]"
                                        >
                                            <FlatCitationHighlightText
                                                citation={item.citation}
                                                disabled={Boolean(item.citation.saveStatus)}
                                                onUpdate={onUpdateCitation}
                                                onHighlight={() => {
                                                    suppressPassageClickRef.current = item.citation.id;
                                                    window.setTimeout(() => {
                                                        if (suppressPassageClickRef.current === item.citation.id) {
                                                            suppressPassageClickRef.current = null;
                                                        }
                                                    }, 0);
                                                }}
                                            />
                                            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.76rem] text-[var(--text-muted)]">
                                                {item.citation.page ? <span>{item.citation.page}쪽</span> : null}
                                                <span>{new Date(item.citation.createdAt).toLocaleDateString('ko-KR')}</span>
                                                <button
                                                    type="button"
                                                    data-passage-note-trigger
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        togglePassageNotes(item.citation.id);
                                                    }}
                                                    className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 transition-[background-color,color,transform] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)] active:scale-95"
                                                    aria-label={`구절 메모 ${passageNoteCitationId === item.citation.id ? '닫기' : '열기'}: ${item.citation.text.slice(0, 40)}`}
                                                    aria-expanded={passageNoteCitationId === item.citation.id}
                                                >
                                                    <MessageCircle size={13} /> 메모 {item.citation.notes.length}
                                                </button>
                                                {item.citation.saveStatus === 'saving' ? <span role="status">저장 중…</span> : null}
                                            </span>
                                        </div>
                                        {item.citation.saveStatus === 'failed' ? (
                                            <div role="alert" className="mb-3 flex min-h-11 flex-wrap items-center gap-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[0.8rem] text-red-900 dark:bg-red-500/10 dark:text-red-100">
                                                <span className="mr-auto inline-flex items-center gap-1.5 font-medium">
                                                    <AlertCircle size={14} /> 저장 실패
                                                </span>
                                                <button
                                                    type="button"
                                                    aria-label="실패한 문장 복사"
                                                    onClick={() => void handleCopyRecoveryText(item.citation)}
                                                    className="inline-flex min-h-10 touch-manipulation items-center gap-1 rounded-lg px-2 font-medium transition-[background-color,transform] hover:bg-red-100 active:scale-95 dark:hover:bg-red-300/10 motion-reduce:transition-none"
                                                >
                                                    <Copy size={13} />
                                                    {copiedRecoveryCitationId === item.citation.id ? '복사됨' : '복사'}
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label="문장 다시 저장"
                                                    onClick={() => void Promise.resolve(onRetryCitationSave(item.citation.id))}
                                                    className="inline-flex min-h-10 touch-manipulation items-center gap-1 rounded-lg bg-red-700 px-2.5 font-semibold text-white transition-[background-color,transform] hover:bg-red-800 active:scale-95 dark:bg-red-300 dark:text-red-950 motion-reduce:transition-none"
                                                >
                                                    <RefreshCw size={13} /> 다시 저장
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDetailCitationId(item.citation.id)}
                                        className="mt-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] opacity-0 transition-[background-color,opacity,transform] hover:bg-[var(--bg-input)] focus-visible:opacity-100 active:scale-95 group-hover:opacity-100"
                                        aria-label="문장 편집 및 삭제 열기"
                                    >
                                        <MoreHorizontal size={17} />
                                    </button>
                                </div>
                            ) : item.type === 'sentence' ? (
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
                                    username={username}
                                    selectedIds={selectedIds}
                                    onToggleSelect={onToggleSelect}
                                    onRetrySave={onRetryCitationSave}
                                    onUpdate={onUpdateCitation}
                                />
                            ) : (
                                <ChapterBlockCard
                                    id={item.block.id}
                                    label={item.block.label}
                                    onDelete={!chapterActionsDisabled && onDeleteChapterBlock ? (blockId) => {
                                        void Promise.resolve(onDeleteChapterBlock(item.block.bookId, blockId));
                                    } : undefined}
                                />
                            )}
                            {isBookView && onCreateChapterBlock && index < renderRows.length - 1 && canShowInsertAfter && (activeInsertId === null || activeInsertId === `after-${item.id}`) ? (
                                <div className={`group flex items-center justify-center ${activeInsertId === `after-${item.id}` ? 'my-1.5 min-h-12' : '-mt-2.5 h-5'}`}>
                                    <ChapterBlockInsertButton
                                        isEditing={activeInsertId === `after-${item.id}`}
                                        disabled={chapterActionsDisabled}
                                        onOpen={() => setActiveInsertId(`after-${item.id}`)}
                                        onCancel={() => setActiveInsertId(null)}
                                        onSubmit={async (label) => {
                                            return handleCreateChapterBlock(
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
                {isBookView && onCreateChapterBlock && renderRows.length > 0 && renderRows[renderRows.length - 1].type !== 'chapter_block' && (activeInsertId === null || activeInsertId === 'end') ? (
                    <div className={`group flex items-center justify-center ${activeInsertId === 'end' ? 'my-1.5 min-h-12' : '-mt-2.5 h-5'}`}>
                        <ChapterBlockInsertButton
                            isEditing={activeInsertId === 'end'}
                            disabled={chapterActionsDisabled}
                            onOpen={() => setActiveInsertId('end')}
                            onCancel={() => setActiveInsertId(null)}
                            onSubmit={async (label) => {
                                const lastItem = renderRows[renderRows.length - 1];
                                return handleCreateChapterBlock(
                                    lastItem ? { pageSort: lastItem.pageSort, createdAtSort: lastItem.createdAtSort } : undefined,
                                    undefined,
                                    label
                                );
                            }}
                        />
                    </div>
                ) : null}
            </div>
            {activeCitation ? (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-40 bg-black/30"
                        onClick={() => setDetailCitationId(null)}
                        aria-label="문장 상세 닫기"
                    />
                    <aside
                        ref={detailDialogRef}
                        role="dialog"
                        tabIndex={-1}
                        aria-modal="true"
                        aria-labelledby="citation-detail-title"
                        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[34rem] flex-col overflow-hidden bg-[var(--bg-card)] shadow-[var(--shadow-panel)]"
                    >
                        <div className="flex min-h-14 items-center justify-between border-b border-[var(--border-main)] px-4">
                            <div>
                                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Citation detail</p>
                                <h2 id="citation-detail-title" className="text-sm font-semibold text-[var(--text-main)]">문장 상세</h2>
                            </div>
                            <button
                                type="button"
                                autoFocus
                                onClick={() => setDetailCitationId(null)}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-muted)] transition-[background-color,transform] hover:bg-[var(--sidebar-hover)] active:scale-95"
                                aria-label="문장 상세 닫기"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-[var(--bg-main)] p-3 sm:p-5">
                            <CitationCard
                                index={0}
                                citation={activeCitation}
                                username={username}
                                selectedFilter={selectedFilter}
                                projectNames={projects.filter((project) => project.citationIds.includes(activeCitation.id)).map((project) => project.name)}
                                showDetailActions
                                isSelected={selectedIds.has(activeCitation.id)}
                                onToggleSelect={onToggleSelect}
                                onAddNote={onAddNote}
                                onUpdateNote={onUpdateNote}
                                onDeleteNote={onDeleteNote}
                                onDelete={(id) => {
                                    onDeleteCitation(id);
                                    setDetailCitationId(null);
                                }}
                                onUpdate={onUpdateCitation}
                                onRetrySave={onRetryCitationSave}
                            />
                        </div>
                    </aside>
                </>
            ) : null}
        </div>
    );
};
