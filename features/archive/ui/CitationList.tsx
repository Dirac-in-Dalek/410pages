import { CitationEditDraftStore } from '../logic/citationEditDrafts';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Copy, GripVertical, MessageCircle, MoreHorizontal, RefreshCw, X } from 'lucide-react';
import { ChapterBlockCard } from './ChapterBlockCard';
import { ChapterBlockInsertButton } from './ChapterBlockInsertButton';
import { ChapterConnections } from './ChapterConnections';
import { getChapterDepths, getChapterDropPlacement } from '../logic/chapterHierarchy';
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
import { formatCitationRecoveryText, writeTextToClipboard } from '../../../lib/citationCopy';
import { FlatCitationHighlightText } from './FlatCitationHighlightText';
import { PassageNotesPanel } from './PassageNotesPanel';

export const CitationList: React.FC<CitationListProps> = ({
    citations,
    allCitations = citations,
    projects,
    editDrafts,
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
    onMoveChapterBlock,
    onMoveCitation,
    onRenameChapterBlock,
    onDeleteChapterBlock,
    chapterActionsDisabled = false,
    collapsedDividerIds,
    onToggleDivider,
    passageNoteCitationId = null,
    inlinePassageNotes = false,
    showAllPassageNotes = false,
    onToggleAllPassageNotes,
    onPassageNoteCitationChange,
}) => {
    const localEditDrafts = useRef(new CitationEditDraftStore());
    const draftStore = editDrafts ?? localEditDrafts.current;
    const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
    const [draggedCitationId, setDraggedCitationId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<{ id: string; after: boolean; position: number; depth: number; parentLabel?: string; citationParentId?: string } | null>(null);
    const dragOrigin = useRef({ x: 0, depth: 0 });
    const [moveError, setMoveError] = useState(false);
    const movePending = useRef(false);
    const latestCollapsedIds = useRef(collapsedDividerIds);
    latestCollapsedIds.current = collapsedDividerIds;
    const openedCommentIds = useRef(new Set<string>());
    const hasSavedComments = citations.some(citation => citation.notes.length > 0);
    const compareComments = inlinePassageNotes && (showAllPassageNotes || Boolean(passageNoteCitationId));
    const [activeInsertId, setActiveInsertId] = useState<string | null>(null);
    const [chapterDraftDepths, setChapterDraftDepths] = useState<Record<string, number>>({});
    const previewChapterDepth = useCallback((id: string, depth?: number) => {
        setChapterDraftDepths(current => {
            if (current[id] === depth) return current;
            const next = { ...current };
            if (depth === undefined) delete next[id];
            else next[id] = depth;
            return next;
        });
    }, []);
    const chapterListRef = useRef<HTMLDivElement>(null);
    const [overflowingCitationIds, setOverflowingCitationIds] = useState<Set<string>>(() => new Set());
    const [expandedCitationIds, setExpandedCitationIds] = useState<Set<string>>(() => new Set());
    const [detailCitationId, setDetailCitationId] = useState<string | null>(null);
    const [copiedRecoveryCitationId, setCopiedRecoveryCitationId] = useState<string | null>(null);
    const suppressPassageClickRef = useRef<string | null>(null);
    const closeDetail = () => {
        const previousId = detailCitationId;
        setDetailCitationId(null);
        requestAnimationFrame(() => Array.from(document.querySelectorAll<HTMLButtonElement>('[data-citation-detail-trigger]')).find(button => button.dataset.citationDetailTrigger === previousId)?.focus());
    };
    const bookId = (isBookView && selectedFilter?.type === 'book' ? selectedFilter.bookId : undefined)
        ?? chapterBlocks[0]?.bookId ?? citations.find((citation) => citation.bookId)?.bookId;
    useEffect(() => { setDraggedChapterId(null); setDraggedCitationId(null); setDropTarget(null); setMoveError(false); }, [bookId]);
    const currentSortField: 'date' | 'page' = isBookView ? 'date' : sortField ?? 'page';
    const currentDateDirection: 'asc' | 'desc' = isBookView ? 'asc' : dateDirection ?? 'desc';
    const currentPageDirection: 'asc' | 'desc' = pageDirection ?? 'asc';
    const direction: 'asc' | 'desc' = currentSortField === 'date' ? currentDateDirection : currentPageDirection;
    const baseItems = isBookView
        ? sortBookViewItems(toBookViewItems(citations, chapterBlocks), currentSortField, direction)
        : citations.map((citation) => ({
              type: 'citation' as const,
              id: citation.id,
              citation,
              pageSort: citation.pageSort,
              createdAtSort: citation.createdAt,
          }));
    const renderRows = buildCitationRenderRows(baseItems);
    const chapterDepths = getChapterDepths(chapterBlocks);
    const previousDepthByRow = new Map<string, number | undefined>();
    let lastChapterDepth: number | undefined;
    for (const row of renderRows) {
        previousDepthByRow.set(row.id, lastChapterDepth);
        if (row.type === 'chapter_block') lastChapterDepth = chapterDepths.get(row.id) ?? 0;
    }
    const hiddenRowIds = new Set<string>();
    let collapsedDepth: number | null = null;
    for (const row of renderRows) {
        if (row.type === 'chapter_block') {
            const depth = chapterDepths.get(row.id) ?? 0;
            if (collapsedDepth !== null && depth <= collapsedDepth) collapsedDepth = null;
            if (collapsedDepth !== null) hiddenRowIds.add(row.id);
            else if (isBookView && collapsedDividerIds?.has(row.id)) collapsedDepth = depth;
        } else if (collapsedDepth !== null) hiddenRowIds.add(row.id);
    }
    // A separator after a folded chapter is after its whole hidden section.
    const insertionNeighbors = (index: number) => {
        const anchor = renderRows[index];
        if (anchor?.type === 'chapter_block' && collapsedDividerIds?.has(anchor.id)) {
            // Search may omit citations; the folded boundary still includes the complete book.
            const items = sortBookViewItems(toBookViewItems(allCitations.filter(citation => citation.bookId === bookId), chapterBlocks), 'date', 'asc');
            let end = items.findIndex(item => item.id === anchor.id);
            const depth = chapterDepths.get(anchor.id) ?? 0;
            while (end + 1 < items.length) {
                const next = items[end + 1];
                if (next.type === 'chapter_block' && (chapterDepths.get(next.id) ?? 0) <= depth) break;
                end += 1;
            }
            return { left: items[end], right: items[end + 1] };
        }
        let leftIndex = index;
        while (leftIndex >= 0 && leftIndex + 1 < renderRows.length && hiddenRowIds.has(renderRows[leftIndex + 1].id)) leftIndex += 1;
        return { left: renderRows[leftIndex], right: renderRows[leftIndex + 1] };
    };
    const visibleSentenceIds = renderRows
        .filter((item) => item.type === 'sentence' && !hiddenRowIds.has(item.id))
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
        label?: string,
        depth?: number
    ) => {
        if (!onCreateChapterBlock || !label) return;

        const input = buildChapterBlockInput(leftItem, rightItem);
        if (!input) return;

        const result = await Promise.resolve(
            onCreateChapterBlock({
                ...input,
                label,
                ...(depth ? { depth } : {}),
            })
        );
        if (result === false) return false;
        setActiveInsertId(null);
        return true;
    };

    const getMovePosition = (id: string, targetId: string, after: boolean, kind: 'chapter' | 'citation' = 'chapter') => {
        if (!bookId || id === targetId) return null;
        if (kind === 'chapter' ? !chapterBlocks.some(block => block.id === id && block.bookId === bookId)
            : !allCitations.some(c => c.id === id && c.bookId === bookId && !c.saveStatus)) return null;
        const target = renderRows.find(row => row.id === targetId);
        if (!target || (kind === 'citation' && target.type === 'sentence' && target.citation.saveStatus)) return null;
        const targetRowIndex = renderRows.findIndex(row => row.id === targetId);
        const boundaryId = after && kind === 'chapter' ? insertionNeighbors(targetRowIndex).left.id : targetId;
        const rows = sortBookViewItems(toBookViewItems(
            allCitations.filter(c => c.bookId === bookId && (kind !== 'citation' || c.id !== id)),
            chapterBlocks.filter(c => c.bookId === bookId && (kind !== 'chapter' || c.id !== id)),
        ), 'date', 'asc');
        const targetIndex = rows.findIndex(row => row.id === boundaryId);
        if (targetIndex < 0) return null;
        const insertion = targetIndex + (after ? 1 : 0);
        const left = rows[insertion - 1]?.createdAtSort;
        const right = rows[insertion]?.createdAtSort;
        const position = getMidpoint(left, right);
        // Never reorder citations to make room for a chapter.
        return position != null && Number.isFinite(position) && (left == null || position > left) && (right == null || position < right) ? position : null;
    };

    const moveChapter = async (id: string, targetId: string, after: boolean, depth?: number) => {
        if (!bookId || !onMoveChapterBlock || chapterActionsDisabled || movePending.current) return;
        const position = getMovePosition(id, targetId, after);
        if (position == null) { setMoveError(true); return; }
        movePending.current = true;
        setMoveError(false);
        try { if ((depth === undefined ? await onMoveChapterBlock(bookId, id, position) : await onMoveChapterBlock(bookId, id, position, depth)) === false) setMoveError(true); }
        catch { setMoveError(true); }
        finally { movePending.current = false; }
    };
    const citationDropTarget = (citationId: string, targetId: string, after: boolean) => {
        const position = getMovePosition(citationId, targetId, after, 'citation');
        if (position == null) return null;
        const parent = [...chapterBlocks].filter(c => c.bookId === bookId && c.createdAtSort < position)
            .sort((a, b) => b.createdAtSort - a.createdAtSort)[0];
        return { id: targetId, after, position, depth: parent ? chapterDepths.get(parent.id) ?? 0 : 0, parentLabel: parent?.label, citationParentId: parent?.id };
    };
    const startCitationDrag = (event: React.DragEvent, citation: typeof citations[number]) => {
        if (!onMoveCitation || citation.saveStatus || movePending.current || chapterActionsDisabled) { event.preventDefault(); return; }
        event.stopPropagation();
        event.dataTransfer.setData('application/x-410pages-citation', citation.id);
        event.dataTransfer.effectAllowed = 'move';
        setDraggedCitationId(citation.id); setDraggedChapterId(null); setDropTarget(null);
    };
    const prepareWhitespaceDrag = (event: React.MouseEvent<HTMLDivElement>, enabled: boolean) => {
        const target = event.target instanceof Element ? event.target : null;
        let protectedTarget = Boolean(target?.closest('button, input, textarea, select, label, a, summary, [contenteditable], .citation-inline-detail, [data-testid="inline-passage-comments"]'));
        const text = target?.closest('[data-testid^="book-citation-text-"], [data-citation-metadata]');
        if (text && !protectedTarget) {
            const range = document.createRange();
            range.selectNodeContents(text);
            const boxes = typeof range.getClientRects === 'function' ? [...range.getClientRects()] : [];
            // Keep ordinary selection on letters and spaces between words; only the trailing blank area can drag.
            protectedTarget = boxes.length === 0 || boxes.some(box => event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom);
        }
        event.currentTarget.draggable = enabled && event.button === 0 && !protectedTarget;
    };
    const moveCitationTo = async (id: string, target: NonNullable<typeof dropTarget>) => {
        if (!bookId || !onMoveCitation || chapterActionsDisabled || movePending.current) return;
        const position = getMovePosition(id, target.id, target.after, 'citation');
        if (position == null) { setMoveError(true); return; }
        movePending.current = true;
        setMoveError(false);
        try {
            if (await onMoveCitation(bookId, id, position) === false) setMoveError(true);
            else if (target.citationParentId && latestCollapsedIds.current?.has(target.citationParentId)) onToggleDivider?.(target.citationParentId);
        } catch { setMoveError(true); }
        finally { movePending.current = false; }
    };
    const projectDrop = (event: React.DragEvent, targetId: string) => {
        if (draggedCitationId) {
            if (!onMoveCitation || chapterActionsDisabled || movePending.current) return null;
            const row = renderRows.find(row => row.id === targetId);
            const rect = event.currentTarget.querySelector('[data-row-content]')?.getBoundingClientRect();
            if (!row || !rect) return null;
            // Dropping on a chapter means inside that chapter, even when it is folded.
            return citationDropTarget(draggedCitationId, targetId, row.type === 'chapter_block' || event.clientY >= rect.top + rect.height / 2);
        }
        if (!draggedChapterId || !onMoveChapterBlock || chapterActionsDisabled || movePending.current) return null;
        const rect = event.currentTarget.querySelector('[data-row-content]')?.getBoundingClientRect();
        if (!rect) return null;
        const after = event.clientY >= rect.top + rect.height / 2;
        const position = getMovePosition(draggedChapterId, targetId, after);
        if (position == null) return null;
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const step = (parseFloat(getComputedStyle(chapterListRef.current!).getPropertyValue('--chapter-indent-step')) || 1) * rem;
        const requestedDepth = dragOrigin.current.depth + (event.clientX - dragOrigin.current.x) / step;
        const { depth, parent } = getChapterDropPlacement(chapterBlocks.filter(block => block.bookId === bookId), draggedChapterId, position, requestedDepth);
        return { id: targetId, after, position, depth, parentLabel: parent?.label };
    };
    const projectedChapters = chapterBlocks.map(block => chapterDraftDepths[block.id] === undefined
        ? block : { ...block, depth: chapterDraftDepths[block.id] });
    if (activeInsertId && bookId) {
        const index = activeInsertId === 'start' ? -1 : activeInsertId === 'end' ? renderRows.length - 1
            : renderRows.findIndex(row => `after-${row.id}` === activeInsertId);
        const { left, right } = insertionNeighbors(index);
        const input = buildChapterBlockInput(left, right);
        if (input) for (const [id, depth] of Object.entries(chapterDraftDepths)) {
            if (!chapterBlocks.some(block => block.id === id)) projectedChapters.push({ ...input, id, depth, label: '', createdAt: 0 });
        }
    }
    const displayChapterDepths = getChapterDepths(projectedChapters);
    const previewChapters = dropTarget && draggedChapterId ? projectedChapters.map(block => block.id === draggedChapterId
        ? { ...block, createdAtSort: dropTarget.position, depth: dropTarget.depth } : block) : projectedChapters;
    const previewDepths = getChapterDepths(previewChapters);
    const citationOwners = new Map<string, { id?: string; depth: number }>();
    let owner: { id?: string; depth: number } = { depth: 0 };
    for (const item of sortBookViewItems(toBookViewItems(allCitations.filter(c => c.bookId === bookId), projectedChapters.filter(c => c.bookId === bookId)), 'date', 'asc')) {
        if (item.type === 'chapter_block') owner = { id: item.id, depth: displayChapterDepths.get(item.id) ?? 0 };
        else citationOwners.set(item.id, owner);
    }
    const finishDrop = (event: React.DragEvent, target: typeof dropTarget) => {
        if ((!draggedChapterId && !draggedCitationId) || !target) return;
        event.preventDefault();
        event.stopPropagation();
        if (draggedCitationId) void moveCitationTo(draggedCitationId, target);
        else if (draggedChapterId) void moveChapter(draggedChapterId, target.id, target.after, target.depth);
        setDraggedChapterId(null); setDraggedCitationId(null); setDropTarget(null);
    };
    const dropIndicator = dropTarget && <div data-chapter-node={draggedCitationId ? undefined : 'chapter-drop-preview'} data-citation-drop={draggedCitationId ? true : undefined} data-chapter-depth={dropTarget.depth}
        style={{ '--chapter-depth': dropTarget.depth } as React.CSSProperties}
        onDragOver={event => { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; }}
        onDrop={event => finishDrop(event, dropTarget)}
        className={`chapter-drop-indicator ${draggedCitationId ? 'citation-drop-indicator' : ''} relative z-10 h-0 border-t-2 border-[var(--accent)]`}>
        <span data-chapter-anchor className="chapter-drop-anchor" aria-hidden="true" />
        <span role="status" className="absolute bottom-1 left-0 max-w-full truncate rounded px-2 py-1 text-xs font-medium text-[var(--accent)] bg-[var(--bg-card)] shadow-sm">
            {draggedCitationId ? (dropTarget.parentLabel ? `${dropTarget.parentLabel} 안으로 인용문 이동` : '첫 챕터 앞에 인용문 이동') : (dropTarget.parentLabel ? `${dropTarget.parentLabel} 아래 · 하위 ${dropTarget.depth}단계` : '최상위에 놓기')}
        </span>
    </div>;

    const moveByKeyboard = (id: string, direction: -1 | 1) => {
        const visibleRows = renderRows.filter(row => !hiddenRowIds.has(row.id));
        const index = visibleRows.findIndex(row => row.id === id);
        const adjacent = visibleRows[index + direction];
        if (adjacent) void moveChapter(id, adjacent.id, direction === 1);
    };

    if (loading && renderRows.length === 0) {
        return <div className="type-body py-20 text-center text-[var(--text-muted)]" role="status">항목을 불러오는 중…</div>;
    }

    const leadingChapterInsert = isBookView && bookId && onCreateChapterBlock
        && (activeInsertId === null || activeInsertId === 'start') ? (
        <div className={`group chapter-leading-divider ${activeInsertId === 'start' ? 'chapter-divider-editing' : 'chapter-divider-slot'}`}>
                <ChapterBlockInsertButton
                    isEditing={activeInsertId === 'start'}
                    onDepthPreview={previewChapterDepth}
                    label="맨 위에 챕터 추가"
                    disabled={chapterActionsDisabled}
                    onOpen={() => setActiveInsertId('start')}
                    onCancel={() => setActiveInsertId(null)}
                    onSubmit={(label) => {
                        const firstBookItem = sortBookViewItems(
                            toBookViewItems(allCitations.filter((citation) => citation.bookId === bookId), chapterBlocks),
                            'date', 'asc'
                        )[0];
                        return handleCreateChapterBlock(undefined, firstBookItem, label);
                    }}
                />
        </div>
    ) : null;

    if (renderRows.length === 0) {
        return (
            <div className="chapter-list">
                {leadingChapterInsert}
                <div className={[
                    'type-body py-20 text-center text-[var(--text-muted)]',
                    isBookView ? 'border-y border-[var(--border-main)]' : 'rounded-xl border-2 border-dashed border-[var(--border-main)]',
                ].join(' ')}>
                    <p>{searchTerm ? '검색 결과가 없습니다.' : '아직 수집한 항목이 없습니다.'}</p>
                    <p className="type-body-muted mt-2">{searchTerm ? '다른 검색어를 입력해보세요.' : `${isBookView ? '아래' : '위'} 입력창에서 문장이나 단어를 추가해보세요.`}</p>
                </div>
            </div>
        );
    }

    const detailEditor = activeCitation ? (
        <section data-chapter-connection-obstacle className="citation-inline-detail ml-12 py-2" role="region" aria-labelledby="citation-detail-title"
            onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); closeDetail(); } }}>
            <header className="flex items-center justify-between gap-3 pb-2">
                <h3 id="citation-detail-title" className="text-sm font-semibold text-[var(--text-secondary)]">인용문 편집 · 이 문장의 메모</h3>
                <button type="button" autoFocus onClick={closeDetail} aria-label="문장 상세 닫기" className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]"><X size={16} />닫기</button>
            </header>
                            <CitationCard
                                editDrafts={draftStore}
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
        </section>
    ) : null;

    return (
        <div ref={chapterListRef} className="chapter-list relative w-full" onDragLeave={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
        }}>
            {isBookView && <ChapterConnections containerRef={chapterListRef} excludedId={dropTarget ? draggedChapterId : null} depthOverrides={previewDepths} revision={`${dropTarget?.id}:${dropTarget?.after}:${dropTarget?.depth}:${activeInsertId}:${[...hiddenRowIds].join(',')}:${[...displayChapterDepths].join(';')}:${renderRows.map(row => row.id).join(',')}:${[...chapterDepths].map(([id, depth]) => `${id}:${depth}`).join(',')}`} />}
            {isBookView && <div className="relative z-20 ml-12 mb-2 flex min-h-9 items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
                <div>{inlinePassageNotes && onToggleAllPassageNotes && (hasSavedComments || showAllPassageNotes) && <button type="button" data-passage-note-trigger aria-expanded={showAllPassageNotes}
                    aria-label={showAllPassageNotes ? '인용문 메모 모두 접기' : '인용문 메모 모두 펼치기'} onClick={event => { event.stopPropagation(); onToggleAllPassageNotes(); }}
                    className="min-h-9 rounded px-1 hover:text-[var(--text-main)]">인용문 메모 모두 {showAllPassageNotes ? '접기' : '펼치기'}</button>}</div>
                <details className="relative"><summary className="cursor-pointer rounded px-2 py-2 hover:text-[var(--text-main)]">사용법</summary>
                    <div className="absolute right-0 top-full z-30 w-64 max-w-[70vw] rounded-lg bg-[var(--bg-card)] p-3 text-xs leading-6 shadow-[var(--shadow-popover)]">
                        챕터 제목: 드래그로 이동, 두 번 클릭해 수정<br />구분선: 클릭해 챕터 추가<br />인용문: 글자를 선택해 강조, 여백이나 손잡이를 끌어 이동<br />제목 맨 앞: Tab·Space로 하위, Backspace·Delete로 상위
                    </div>
                </details>
            </div>}
            {leadingChapterInsert}
            {moveError && <p role="alert" className="mb-2 text-sm text-red-600">이 위치로 이동하지 못했습니다. 다른 위치를 선택하거나 다시 시도해 주세요.</p>}
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
            {!isBookView && detailEditor}
            <div className="flex flex-col">
                {renderRows.map((item, index) => {
                    const citation = item.type === 'sentence' ? item.citation : undefined;
                    if (citation && inlinePassageNotes && (passageNoteCitationId === item.id || (showAllPassageNotes && citation.notes.length > 0))) {
                        openedCommentIds.current.add(item.id);
                    }
                    const canDragWhitespace = isBookView && Boolean(citation && onMoveCitation && !citation.saveStatus && !chapterActionsDisabled && detailCitationId !== item.id);
                    const citationProjects = citation
                        ? projects.filter((project) => project.citationIds.includes(citation.id)).map((project) => project.name)
                        : [];

                    return (
                        <div key={item.id} data-book-row={item.id} hidden={hiddenRowIds.has(item.id)} style={{ display: hiddenRowIds.has(item.id) ? 'none' : 'contents' }}
                            onDragOver={event => {
                                const target = projectDrop(event, item.id);
                                setDropTarget(target);
                                if (!target) return;
                                event.preventDefault();
                                event.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={event => finishDrop(event, projectDrop(event, item.id))}>
                            {dropTarget?.id === item.id && !dropTarget.after && dropIndicator}
                            <div data-row-content data-row-kind={item.type}
                                data-citation-depth={citation ? citationOwners.get(item.id)?.depth ?? 0 : undefined}
                                data-citation-owner={citation ? citationOwners.get(item.id)?.id : undefined} className={isBookView ? 'book-row-content' : undefined}
                                data-whitespace-drag={canDragWhitespace || undefined}
                                draggable={false}
                                onMouseMoveCapture={event => { if (event.buttons === 0) prepareWhitespaceDrag(event, canDragWhitespace); }}
                                onPointerDownCapture={event => prepareWhitespaceDrag(event, canDragWhitespace)}
                                onMouseDownCapture={event => prepareWhitespaceDrag(event, canDragWhitespace)}
                                onDragStart={event => { if (event.target === event.currentTarget && event.currentTarget.draggable && item.type === 'sentence') startCitationDrag(event, item.citation); }}
                                onDragEnd={() => { setDraggedCitationId(null); setDraggedChapterId(null); setDropTarget(null); }}
                                data-divider-editing={activeInsertId === `after-${item.id}` || (index === renderRows.length - 1 && activeInsertId === 'end')}
                                style={{ '--divider-depth': item.type === 'chapter_block' ? displayChapterDepths.get(item.id) ?? 0 : 0, '--citation-depth': citationOwners.get(item.id)?.depth ?? 0 } as React.CSSProperties}>
                            {item.type === 'sentence' && item.id === detailCitationId && isBookView && detailEditor}
                            {item.type === 'sentence' && isBookView ? (
                                <div
                                    data-testid={`citation-${item.citation.id}`}
                                    hidden={item.id === detailCitationId}
                                    style={item.id === detailCitationId ? { display: 'none' } : undefined}
                                    className={[
                                        compareComments ? 'grid grid-cols-[var(--book-column-left)_2.75rem_minmax(0,1fr)_auto] ml-[calc(-1*var(--book-column-left))]' : 'flex',
                                        'group relative items-start transition-[background-color,color] duration-150',
                                        item.citation.saveStatus === 'failed' ? 'bg-red-50/60 dark:bg-red-500/10' : '',
                                    ].join(' ')}
                                >

                                    <div data-selected={selectedIds.has(item.id)} className="citation-gutter order-2 flex w-11 shrink-0 flex-col items-center">
                                    {onMoveCitation && !item.citation.saveStatus && <button type="button" draggable={!chapterActionsDisabled}
                                        aria-label={`인용문 이동: ${item.citation.text.slice(0, 40)}`}
                                        title="드래그하여 다른 챕터로 이동 · Alt+위/아래로 순서 이동"
                                        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                                        className="citation-move-handle inline-flex h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-input)] focus-visible:outline focus-visible:outline-2 active:cursor-grabbing"
                                        onDragStart={event => startCitationDrag(event, item.citation)}
                                        onDragEnd={() => { setDraggedCitationId(null); setDraggedChapterId(null); setDropTarget(null); }}
                                        onKeyDown={event => {
                                            if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
                                            event.preventDefault();
                                            const rows = renderRows.filter(row => !hiddenRowIds.has(row.id));
                                            const direction = event.key === 'ArrowUp' ? -1 : 1;
                                            const adjacent = rows[rows.findIndex(row => row.id === item.id) + direction];
                                            const target = adjacent && citationDropTarget(item.id, adjacent.id, direction === 1);
                                            if (target) void moveCitationTo(item.id, target);
                                        }}><GripVertical size={16} /></button>}
                                    <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
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
                                    </div>
                                    {inlinePassageNotes && (
                                        <div hidden={!compareComments} className="order-1 flex w-[calc(100%+3rem)] shrink-0 self-stretch flex-col items-center py-0" style={!compareComments ? { display: 'none' } : undefined}>
                                            {openedCommentIds.current.has(item.id) && (
                                                <div hidden={!(showAllPassageNotes && item.citation.notes.length > 0) && passageNoteCitationId !== item.id} data-testid="inline-passage-comments" data-chapter-connection-obstacle className="flex w-64 flex-1 flex-col [&[hidden]]:hidden">
                                                    <PassageNotesPanel inline citation={item.citation}
                                                        readOnly={passageNoteCitationId !== item.id}
                                                        onActivate={() => onPassageNoteCitationChange?.(item.id)}
                                                        onClose={() => onPassageNoteCitationChange?.(null)}
                                                        onAddNote={onAddNote} onUpdateNote={onUpdateNote} onDeleteNote={onDeleteNote} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div data-chapter-connection-obstacle className={`order-3 min-w-0 flex-1 ${selectedIds.has(item.id) ? 'rounded bg-[var(--accent-soft)]' : ''}`}>
                                        <div
                                            data-passage-note-trigger
                                            onClick={() => {
                                                if (suppressPassageClickRef.current === item.citation.id) {
                                                    suppressPassageClickRef.current = null;
                                                    return;
                                                }
                                                togglePassageNotes(item.citation.id);
                                            }}
                                            className="w-full cursor-pointer px-1 py-0 text-left"
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
                                            <span data-citation-metadata className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.76rem] text-[var(--text-muted)]">
                                                {item.citation.page ? <span>{item.citation.page}쪽</span> : null}
                                                {(draftStore.get(item.id)?.isEditing || draftStore.get(item.id)?.newNote || draftStore.get(item.id)?.editingNoteId) && <span>편집 초안 있음</span>}
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
                                                    <MessageCircle size={13} /> 이 문장 메모 {item.citation.notes.length}
                                                </button>

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
                                    <div className="order-4 flex shrink-0 items-start">

                                    <button
                                        type="button"
                                        data-passage-note-trigger
                                        data-citation-detail-trigger={item.id}
                                        disabled={detailCitationId !== null}
                                        title={detailCitationId ? '열린 편집 영역을 먼저 닫아주세요' : '이 인용문 편집 및 메모'}
                                        onClick={() => setDetailCitationId(item.citation.id)}
                                        className="order-4 mt-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] opacity-0 transition-[background-color,opacity,transform] hover:bg-[var(--bg-input)] focus-visible:opacity-100 active:scale-95 group-hover:opacity-100"
                                        aria-label="문장 편집 및 삭제 열기"
                                    >
                                        <MoreHorizontal size={17} />
                                    </button>
                                    </div>
                                </div>
                            ) : item.type === 'sentence' ? (
                                <CitationCard
                                editDrafts={draftStore}
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
                                    depth={chapterDepths.get(item.id) ?? 0}
                                    displayDepth={displayChapterDepths.get(item.id)}
                                    onDepthPreview={previewChapterDepth}
                                    previousDepth={previousDepthByRow.get(item.id)}
                                    onDragStart={!chapterActionsDisabled && onMoveChapterBlock ? event => {
                                        if (movePending.current) { event.preventDefault(); return; }
                                        event.dataTransfer.setData('text/plain', item.id);
                                        event.dataTransfer.effectAllowed = 'move';
                                        dragOrigin.current = { x: event.clientX || 0, depth: chapterDepths.get(item.id) ?? 0 };
                                        // Keep the error row in place until drop so dragstart cannot shift the source.
                                        setDraggedChapterId(item.id); setDraggedCitationId(null); setDropTarget(null);
                                    } : undefined}
                                    onDragEnd={() => { setDraggedChapterId(null); setDropTarget(null); }}
                                    onMove={direction => moveByKeyboard(item.id, direction)}
                                    onRename={!chapterActionsDisabled && onRenameChapterBlock ? (label, depth) => depth === undefined ? onRenameChapterBlock(item.block.bookId, item.id, label) : onRenameChapterBlock(item.block.bookId, item.id, label, depth) : undefined}
                                    collapsed={Boolean(collapsedDividerIds?.has(item.id))}
                                    onToggle={isBookView && onToggleDivider ? () => onToggleDivider(item.id) : undefined}
                                    onDelete={!chapterActionsDisabled && onDeleteChapterBlock ? (blockId) => {
                                        void Promise.resolve(onDeleteChapterBlock(item.block.bookId, blockId));
                                    } : undefined}
                                />
                            )}
                            </div>
                            {dropTarget?.id === item.id && dropTarget.after && dropIndicator}
                            {isBookView && onCreateChapterBlock && index < renderRows.length - 1 && (activeInsertId === null || activeInsertId === `after-${item.id}`) ? (
                                <div className={`group flex items-center justify-center ${activeInsertId === `after-${item.id}` ? 'chapter-divider-editing' : 'chapter-divider-slot'}`}>
                                    <ChapterBlockInsertButton
                                        isEditing={activeInsertId === `after-${item.id}`}
                                        onDepthPreview={previewChapterDepth}
                                        previousDepth={item.type === 'chapter_block' ? chapterDepths.get(item.id) : previousDepthByRow.get(item.id)}
                                        disabled={chapterActionsDisabled}
                                        onOpen={() => setActiveInsertId(`after-${item.id}`)}
                                        onCancel={() => setActiveInsertId(null)}
                                        onSubmit={async (label, depth) => {
                                            const { left, right } = insertionNeighbors(index);
                                            return handleCreateChapterBlock(
                                                left,
                                                right,
                                                label,
                                                depth
                                            );
                                        }}
                                    />
                                </div>
                            ) : null}
                        </div>
                    );
                })}
                {isBookView && onCreateChapterBlock && renderRows.length > 0 && !hiddenRowIds.has(renderRows[renderRows.length - 1].id) && (activeInsertId === null || activeInsertId === 'end') ? (
                    <div className={`chapter-end-divider group flex items-center justify-center ${activeInsertId === 'end' ? 'chapter-divider-editing' : 'chapter-divider-slot'}`}>
                        <ChapterBlockInsertButton
                            isEditing={activeInsertId === 'end'}
                            onDepthPreview={previewChapterDepth}
                            previousDepth={lastChapterDepth}
                            disabled={chapterActionsDisabled}
                            onOpen={() => setActiveInsertId('end')}
                            onCancel={() => setActiveInsertId(null)}
                            onSubmit={async (label, depth) => {
                                const { left, right } = insertionNeighbors(renderRows.length - 1);
                                return handleCreateChapterBlock(
                                    left,
                                    right,
                                    label,
                                    depth
                                );
                            }}
                        />
                    </div>
                ) : null}
            </div>

        </div>
    );
};
