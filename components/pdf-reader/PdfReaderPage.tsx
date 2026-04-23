import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { configurePdfWorker } from '../../lib/pdfWorker';
import { CitationEditor } from '../../features/citation-entry/ui/CitationEditor';
import { CitationList } from '../../features/archive/ui/CitationList';
import {
  AddCitationInput,
  Citation,
  PdfDraftSelection,
  PdfHighlightRect,
  PdfReaderMeta,
  PdfRectHighlight,
  ReaderVirtualRange
} from '../../types';
import type {
  MetaFormState,
  PersistedReaderSession,
  PdfReaderPageProps,
  SelectionPayload,
  SelectionPreview,
  SelectionPreviewKind
} from '../../features/reader/contract/pdfReaderContract';
import {
  buildMetaFormFromState,
  extractTitleFromFileName,
  clamp,
  normalizeDocumentField,
  parsePositiveInt,
  readPersistedReaderSession,
  resolveReaderPageLabel,
  resolveSelectionRangeInCitation,
} from '../../features/reader/policy/pdfReaderPolicy';
import { createHighlightRects, usePdfSelection } from '../../features/reader/logic/usePdfSelection';
import { usePdfViewport } from '../../features/reader/logic/usePdfViewport';
import { PdfThumbnailSidebar } from './PdfThumbnailSidebar';
import { useReaderPaneLayout } from './useReaderPaneLayout';

configurePdfWorker();

const MIN_CAPTURE_LENGTH = 3;
const DUPLICATE_WINDOW_MS = 1200;
const VIRTUAL_OVERSCAN_PAGES = 6;
const DEFAULT_PAGE_RATIO = 1.41;
const PAGE_VERTICAL_GAP = 20;
const READER_SESSION_STORAGE_KEY = 'pdfReaderSession.v1';
const UNDERLINE_DRAG_HIT_TOLERANCE_PX = 8;

const defaultMeta: PdfReaderMeta = { author: '', title: '' };

let readerRuntimeCache: { pdfUrl: string | null } = {
  pdfUrl: null
};

export const PdfReaderPage: React.FC<PdfReaderPageProps> = ({
  username,
  onBack,
  citations,
  projects,
  loading,
  onAddCitation,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onDeleteCitation,
  onUpdateCitation,
  onBulkUpdateCitationSource
}) => {
  const restoredSession = useMemo(
    () =>
      readerRuntimeCache.pdfUrl
        ? readPersistedReaderSession(READER_SESSION_STORAGE_KEY)
        : null,
    []
  );

  const [pdfUrl, setPdfUrl] = useState<string | null>(() => readerRuntimeCache.pdfUrl);
  const [pdfName, setPdfName] = useState(() => restoredSession?.pdfName || '');
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(() => restoredSession?.currentPage || 1);
  const [pageLabels, setPageLabels] = useState<string[] | null>(() => restoredSession?.pageLabels || null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [meta, setMeta] = useState<PdfReaderMeta>(() => restoredSession?.meta || defaultMeta);
  const [metaForm, setMetaForm] = useState<MetaFormState>(() =>
    buildMetaFormFromState(restoredSession?.meta || defaultMeta)
  );
  const [metaError, setMetaError] = useState<string | null>(null);
  const [metaNotice, setMetaNotice] = useState<string | null>(null);
  const [isMetaSaving, setIsMetaSaving] = useState(false);
  const [isMetaEditorOpen, setIsMetaEditorOpen] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftSelection, setDraftSelection] = useState<PdfDraftSelection | null>(() => restoredSession?.draftSelection || null);
  const [highlights, setHighlights] = useState<PdfRectHighlight[]>(() => restoredSession?.highlights || []);
  const [selectedCitationIds, setSelectedCitationIds] = useState<Set<string>>(new Set());
  const [isPointerSelecting, setIsPointerSelecting] = useState(false);
  const [selectionPreview, setSelectionPreview] = useState<SelectionPreview[]>([]);
  const [selectionPreviewKind, setSelectionPreviewKind] =
    useState<SelectionPreviewKind>('underline');

  const [pageWidth, setPageWidth] = useState<number | undefined>(undefined);
  const [visibleRange, setVisibleRange] = useState<ReaderVirtualRange>({ start: 1, end: 8 });

  const pageContainerRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const pageRatiosRef = useRef<Record<number, number>>({});
  const pdfPaneRef = useRef<HTMLDivElement>(null);
  const readerLayoutRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef<{ key: string; at: number } | null>(null);
  const latestSelectionRef = useRef<SelectionPayload | null>(null);
  const isSavingRef = useRef(false);
  const resumeScrollTopRef = useRef<number | null>(restoredSession?.scrollTop ?? null);
  const resumePageRef = useRef<number>(restoredSession?.currentPage || 1);
  const draggingUnderlineCitationRef = useRef<string | null>(null);

  const {
    leftPaneWidth,
    rightWidth,
    isLeftCollapsed,
    isResizingLeft,
    isResizingRight,
    startLeftResize,
    startRightResize,
    toggleLeftCollapse
  } = useReaderPaneLayout(readerLayoutRef);

  const {
    getEstimatedPageHeight,
    computeViewWindow,
    computeScrollTarget,
    buildVisibleRange
  } = usePdfViewport({
    numPages,
    pageWidth,
    pageContainerRefs,
    pageRatiosRef
  });

  const {
    getLiveSelectionPayload,
    resolveUnderlineHit,
    constrainPreviewRects,
    getSelectionPreview
  } = usePdfSelection({
    pageContainerRefs,
    pdfPaneRef,
    highlights,
    resolvePageLabel: (pageNumber) => resolveReaderPageLabel(pageNumber, pageLabels, meta)
  });

  const isMetaConfirmed = Boolean(pdfUrl) && !isMetaEditorOpen && Boolean(meta.author.trim()) && Boolean(meta.title.trim());

  useEffect(() => {
    readerRuntimeCache.pdfUrl = pdfUrl;
  }, [pdfUrl]);

  useEffect(() => {
    resumePageRef.current = currentPage;
  }, [currentPage]);

  const persistReaderSession = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (!pdfUrl && !readerRuntimeCache.pdfUrl) {
      window.localStorage.removeItem(READER_SESSION_STORAGE_KEY);
      return;
    }

    const scrollTop = pdfPaneRef.current?.scrollTop ?? resumeScrollTopRef.current ?? 0;
    const payload: PersistedReaderSession = {
      pdfName,
      currentPage: Math.max(1, currentPage),
      pageLabels,
      meta,
      highlights,
      draftSelection,
      scrollTop
    };

    window.localStorage.setItem(READER_SESSION_STORAGE_KEY, JSON.stringify(payload));
  }, [currentPage, draftSelection, highlights, meta, pageLabels, pdfName, pdfUrl]);

  useEffect(() => {
    persistReaderSession();
  }, [persistReaderSession]);

  useEffect(() => {
    return () => {
      persistReaderSession();
    };
  }, [persistReaderSession]);

  useEffect(() => {
    const paneNode = pdfPaneRef.current;
    if (!paneNode) return;

    const updateWidth = () => {
      const next = Math.floor(Math.min(1100, paneNode.clientWidth - 32));
      if (next > 200) setPageWidth(next);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(paneNode);
    return () => observer.disconnect();
  }, []);

  const resolvePageLabel = useCallback(
    (pageNumber: number) => resolveReaderPageLabel(pageNumber, pageLabels, meta),
    [meta, pageLabels]
  );

  const currentPageLabel = useMemo(() => resolvePageLabel(currentPage), [currentPage, resolvePageLabel]);

  const currentDocumentCitations = useMemo(() => {
    if (!isMetaConfirmed) return [] as Citation[];

    const targetAuthor = normalizeDocumentField(meta.author);
    const targetTitle = normalizeDocumentField(meta.title);

    return citations
      .filter(
        (citation) =>
          normalizeDocumentField(citation.author) === targetAuthor && normalizeDocumentField(citation.book) === targetTitle
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [citations, isMetaConfirmed, meta.author, meta.title]);

  const citationMap = useMemo(() => {
    const map = new Map<string, Citation>();
    citations.forEach((citation) => {
      map.set(citation.id, citation);
    });
    return map;
  }, [citations]);

  useEffect(() => {
    const existingIds = new Set(currentDocumentCitations.map((citation) => citation.id));

    setSelectedCitationIds((prev) => {
      const next = new Set<string>();
      prev.forEach((citationId) => {
        if (existingIds.has(citationId)) next.add(citationId);
      });
      return next;
    });
  }, [currentDocumentCitations]);

  useEffect(() => {
    if (!metaNotice) return;
    const timeoutId = window.setTimeout(() => setMetaNotice(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [metaNotice]);

  const setPageContainerRef = useCallback((pageNumber: number, node: HTMLDivElement | null) => {
    if (node) pageContainerRefs.current[pageNumber] = node;
    else delete pageContainerRefs.current[pageNumber];
  }, []);

  const syncViewWindow = useCallback(() => {
    const paneNode = pdfPaneRef.current;
    if (!paneNode || numPages <= 0) return;
    const next = computeViewWindow(paneNode.scrollTop, paneNode.clientHeight);
    setCurrentPage((prev) => (prev === next.currentPage ? prev : next.currentPage));
    setVisibleRange((prev) =>
      prev.start === next.visibleRange.start && prev.end === next.visibleRange.end ? prev : next.visibleRange
    );
  }, [computeViewWindow, numPages]);

  const scrollToPage = useCallback(
    (pageNumber: number) => {
      const paneNode = pdfPaneRef.current;
      if (!paneNode || pageNumber < 1 || pageNumber > numPages) return;

      const targetTop = computeScrollTarget(pageNumber);
      if (targetTop === null) return;

      paneNode.scrollTo({ top: targetTop, behavior: 'smooth' });

      setCurrentPage(pageNumber);
    },
    [computeScrollTarget, numPages]
  );

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!isMetaConfirmed) {
        latestSelectionRef.current = null;
        setDraftSelection(null);
        setSelectionPreview([]);
        return;
      }

      const payload = getLiveSelectionPayload();
      if (!payload) {
        latestSelectionRef.current = null;
        setDraftSelection(null);
        setSelectionPreview([]);
        return;
      }

      latestSelectionRef.current = {
        range: payload.range.cloneRange(),
        text: payload.text,
        pageNumber: payload.pageNumber,
        pageIndex: payload.pageIndex,
        pageLabel: payload.pageLabel,
        segments: payload.segments.map((segment) => ({
          ...segment,
          range: segment.range.cloneRange()
        }))
      };

      setDraftSelection({
        text: payload.text,
        pageIndex: payload.pageIndex,
        pageLabel: payload.pageLabel
      });

      if (isPointerSelecting) {
        const previews = getSelectionPreview(payload, draggingUnderlineCitationRef.current);
        setSelectionPreview(previews);
      } else {
        setSelectionPreview([]);
      }

      if (saveError) setSaveError(null);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [getLiveSelectionPayload, getSelectionPreview, isMetaConfirmed, isPointerSelecting, saveError]);

  const addInlineHighlightToCitation = useCallback(
    (citationId: string, selectedText: string): 'added' | 'exists' | 'failed' => {
      const citation = citationMap.get(citationId);
      if (!citation) return 'failed';

      const range = resolveSelectionRangeInCitation(citation.text, selectedText);
      if (!range) return 'failed';

      const existing = citation.highlights || [];
      const hasOverlap = existing.some((highlight) => range.start < highlight.end && range.end > highlight.start);
      if (hasOverlap) return 'exists';

      const next = [
        ...existing,
        {
          id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          start: range.start,
          end: range.end,
          color: 'yellow'
        }
      ];
      onUpdateCitation(citationId, { highlights: next });
      return 'added';
    },
    [citationMap, onUpdateCitation]
  );

  const saveSelection = useCallback(async () => {
    if (!isMetaConfirmed || isSavingRef.current) return;

    const livePayload = getLiveSelectionPayload();
    const payload = livePayload || latestSelectionRef.current;
    if (!payload) {
      draggingUnderlineCitationRef.current = null;
      setSelectionPreviewKind('underline');
      return;
    }

    const clearDraggingState = () => {
      draggingUnderlineCitationRef.current = null;
      setSelectionPreviewKind('underline');
    };

    if (payload.text.length < MIN_CAPTURE_LENGTH) {
      latestSelectionRef.current = null;
      setDraftSelection(null);
      setSelectionPreview([]);
      clearDraggingState();
      livePayload?.selection?.removeAllRanges();
      return;
    }

    const targetPages = Array.from(new Set<number>(payload.segments.map((segment) => segment.pageNumber)));
    let segmentMarks = targetPages
      .map((pageNumber) => {
        const pageNode = pageContainerRefs.current[pageNumber] || null;
        const rects = createHighlightRects(payload.range, pageNode);
        return {
          pageIndex: pageNumber - 1,
          rects
        };
      })
      .filter((segment) => segment.rects.length > 0);

    const targetCitationId = draggingUnderlineCitationRef.current;
    if (targetCitationId) {
      segmentMarks = segmentMarks
        .map((segment) => ({
          ...segment,
          rects: constrainPreviewRects(segment.rects, targetCitationId, segment.pageIndex)
        }))
        .filter((segment) => segment.rects.length > 0);
    }

    if (targetCitationId) {
      if (segmentMarks.length === 0) {
        setSaveError('Please select the highlight within an existing underline.');
        latestSelectionRef.current = null;
        setDraftSelection(null);
        setSelectionPreview([]);
        clearDraggingState();
        livePayload?.selection?.removeAllRanges();
        return;
      }

      const status = addInlineHighlightToCitation(targetCitationId, payload.text);
      if (status === 'added' && segmentMarks.length > 0) {
        const createdAt = Date.now();
        const newMarks: PdfRectHighlight[] = segmentMarks.map((segment, index) => ({
          id: `hl-${createdAt}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          citationId: targetCitationId,
          pageIndex: segment.pageIndex,
          kind: 'highlight',
          rects: segment.rects,
          createdAt
        }));
        setHighlights((prev) => [...newMarks, ...prev]);
      }

      setSaveError(null);
      latestSelectionRef.current = null;
      setDraftSelection(null);
      setSelectionPreview([]);
      clearDraggingState();
      livePayload?.selection?.removeAllRanges();
      return;
    }

    const dedupeKey = [payload.text, payload.pageLabel, meta.author.trim(), meta.title.trim()].join('|');
    const now = Date.now();
      if (
        lastSavedRef.current &&
        lastSavedRef.current.key === dedupeKey &&
        now - lastSavedRef.current.at < DUPLICATE_WINDOW_MS
      ) {
        latestSelectionRef.current = null;
        setDraftSelection(null);
        setSelectionPreview([]);
        clearDraggingState();
        livePayload?.selection?.removeAllRanges();
        return;
      }

    const citation: AddCitationInput = {
      text: payload.text,
      author: meta.author.trim(),
      book: meta.title.trim(),
      page: payload.pageLabel,
      tags: []
    };

    isSavingRef.current = true;
    const result = await onAddCitation(citation).catch((error) => ({ ok: false as const, error }));
    isSavingRef.current = false;

    if (result.ok) {
      const createdAt = Date.now();
      lastSavedRef.current = { key: dedupeKey, at: createdAt };

      if (segmentMarks.length > 0) {
        const newMarks: PdfRectHighlight[] = segmentMarks.map((segment, index) => ({
          id: `hl-${createdAt}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          citationId: result.citationId,
          pageIndex: segment.pageIndex,
          kind: 'underline',
          rects: segment.rects,
          createdAt
        }));
        setHighlights((prev) => [...newMarks, ...prev]);
      }

      setSaveError(null);
      latestSelectionRef.current = null;
      setDraftSelection(null);
      setSelectionPreview([]);
      clearDraggingState();
      livePayload?.selection?.removeAllRanges();
      return;
    }

    setSaveError('Failed to save the citation. Please try again.');
    clearDraggingState();
  }, [
    addInlineHighlightToCitation,
    constrainPreviewRects,
    getLiveSelectionPayload,
    isMetaConfirmed,
    meta.author,
    meta.title,
    onAddCitation,
  ]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (!pdfPaneRef.current?.contains(target)) return;
      if (!target.closest('.react-pdf__Page__textContent')) return;

      const pageElement = target.closest('[data-reader-page-number]') as HTMLElement | null;
      const pageNumber = pageElement ? Number(pageElement.dataset.readerPageNumber) : NaN;

      const startCitationId = Number.isFinite(pageNumber)
        ? resolveUnderlineHit(pageNumber, event.clientX, event.clientY)
        : null;

      draggingUnderlineCitationRef.current = startCitationId;
      setSelectionPreviewKind(startCitationId ? 'highlight' : 'underline');
      setIsPointerSelecting(true);
      setSelectionPreview([]);
    };

    const onMouseUp = () => {
      setIsPointerSelecting(false);
      void saveSelection();
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [resolveUnderlineHit, saveSelection]);

  useEffect(() => {
    const paneNode = pdfPaneRef.current;
    if (!paneNode || !pdfUrl || numPages <= 0) return;

    const onScroll = () => {
      resumeScrollTopRef.current = paneNode.scrollTop;
      syncViewWindow();
    };
    syncViewWindow();

    paneNode.addEventListener('scroll', onScroll, { passive: true });
    return () => paneNode.removeEventListener('scroll', onScroll);
  }, [numPages, pdfUrl, syncViewWindow]);

  useEffect(() => {
    if (!pdfUrl || numPages <= 0) return;
    const rafId = window.requestAnimationFrame(() => {
      syncViewWindow();
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [isLeftCollapsed, leftPaneWidth, numPages, pageWidth, pdfUrl, rightWidth, syncViewWindow]);

  useEffect(() => {
    if (!pdfUrl || numPages <= 0) return;
    if (resumeScrollTopRef.current === null) return;

    const paneNode = pdfPaneRef.current;
    if (!paneNode) return;

    const targetTop = Math.max(0, resumeScrollTopRef.current);
    let rafId = 0;
    let timeoutId = 0;

    rafId = window.requestAnimationFrame(() => {
      paneNode.scrollTop = targetTop;
      syncViewWindow();

      timeoutId = window.setTimeout(() => {
        paneNode.scrollTop = targetTop;
        syncViewWindow();
        resumeScrollTopRef.current = null;
      }, 120);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [numPages, pdfUrl, syncViewWindow]);

  const openMetaEditor = () => {
    setMetaForm(buildMetaFormFromState(meta));
    setMetaError(null);
    setIsMetaEditorOpen(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setLoadError('Only PDF files can be uploaded.');
      return;
    }

    if (pdfUrl) URL.revokeObjectURL(pdfUrl);

    const nextUrl = URL.createObjectURL(file);
    const defaultTitle = extractTitleFromFileName(file.name);

    pageContainerRefs.current = {};
    pageRatiosRef.current = {};

    setPdfUrl(nextUrl);
    setPdfName(file.name);
    setNumPages(0);
    setCurrentPage(1);
    setPageLabels(null);
    setLoadError(null);
    setSaveError(null);
    setMetaNotice(null);
    setDraftSelection(null);
    setHighlights([]);
    setSelectedCitationIds(new Set());
    setVisibleRange({ start: 1, end: 8 });
    resumeScrollTopRef.current = 0;
    resumePageRef.current = 1;

    setMeta({ author: '', title: defaultTitle });
    setMetaForm({
      author: '',
      title: defaultTitle,
      pdfStartPage: '',
      bookStartPage: ''
    });
    setMetaError(null);
    setIsMetaEditorOpen(true);
  };

  const handleMetaConfirm = async () => {
    const author = metaForm.author.trim();
    const title = metaForm.title.trim();
    const pdfStartPage = parsePositiveInt(metaForm.pdfStartPage);
    const bookStartPage = parsePositiveInt(metaForm.bookStartPage);

    if (!author) {
      setMetaError('Author is required.');
      return;
    }

    if (!title) {
      setMetaError('Please enter a title.');
      return;
    }

    const hasPdfMapping = metaForm.pdfStartPage.trim().length > 0;
    const hasBookMapping = metaForm.bookStartPage.trim().length > 0;
    if (hasPdfMapping !== hasBookMapping) {
      setMetaError('Please enter both page mapping fields together.');
      return;
    }

    if ((hasPdfMapping && !pdfStartPage) || (hasBookMapping && !bookStartPage)) {
      setMetaError('Page mapping must be a positive integer greater than 0.');
      return;
    }

    const nextMeta: PdfReaderMeta = {
      author,
      title,
      pdfStartPage: hasPdfMapping ? pdfStartPage : undefined,
      bookStartPage: hasBookMapping ? bookStartPage : undefined
    };

    const hasSourceChanged =
      normalizeDocumentField(author) !== normalizeDocumentField(meta.author) ||
      normalizeDocumentField(title) !== normalizeDocumentField(meta.title);

    const targetCitationIds = hasSourceChanged ? currentDocumentCitations.map((citation) => citation.id) : [];

    if (hasSourceChanged && targetCitationIds.length > 0) {
      setIsMetaSaving(true);
      const bulkResult = await onBulkUpdateCitationSource(targetCitationIds, {
        author,
        book: title
      }).catch((error) => ({ ok: false as const, error }));
      setIsMetaSaving(false);

      if (!bulkResult.ok) {
        setMetaError('Failed to save metadata. Please try again shortly.');
        return;
      }

      if (bulkResult.updatedCount > 0) {
        setMetaNotice(`Updated author/title for ${bulkResult.updatedCount} citation(s) in this document.`);
      }
    }

    setMeta(nextMeta);
    setMetaError(null);
    setIsMetaEditorOpen(false);
  };

  const handleDocumentLoadSuccess = async (pdf: any) => {
    setNumPages(pdf.numPages);
    const resumedPage = clamp(resumePageRef.current || 1, 1, pdf.numPages);
    setCurrentPage(resumedPage);
    setLoadError(null);
    setVisibleRange({
      ...buildVisibleRange(resumedPage)
    });

    try {
      const labels = await pdf.getPageLabels?.();
      if (Array.isArray(labels)) {
        setPageLabels(labels.map((label) => (typeof label === 'string' ? label : '')));
      } else {
        setPageLabels(null);
      }
    } catch {
      setPageLabels(null);
    }
  };

  const handlePageLoadSuccess = useCallback((page: any, pageNumber: number) => {
    const originalWidth = page?.originalWidth || page?.width || 0;
    const originalHeight = page?.originalHeight || page?.height || 0;

    if (!Number.isFinite(originalWidth) || !Number.isFinite(originalHeight) || originalWidth <= 0 || originalHeight <= 0) {
      return;
    }

    pageRatiosRef.current[pageNumber] = originalHeight / originalWidth;
  }, []);

  const handleToggleSelection = (citationId: string, selected: boolean) => {
    setSelectedCitationIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(citationId);
      else next.delete(citationId);
      return next;
    });
  };

  const handleDeleteCitationFromReader = (citationId: string) => {
    onDeleteCitation(citationId);
    setSelectedCitationIds((prev) => {
      const next = new Set(prev);
      next.delete(citationId);
      return next;
    });
    setHighlights((prev) => prev.filter((highlight) => highlight.citationId !== citationId));
  };

  return (
    <div className="pdf-reader-mode font-size-static h-screen w-full overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)]">
      <div ref={readerLayoutRef} className="h-full min-h-0 flex">
        <aside
          style={{ width: `${leftPaneWidth}px` }}
          className="h-full min-h-0 flex-shrink-0 border-r border-[var(--border-main)] bg-[var(--bg-card)]"
        >
          <PdfThumbnailSidebar
            pdfUrl={pdfUrl}
            pdfName={pdfName}
            numPages={numPages}
            currentPage={currentPage}
            collapsed={isLeftCollapsed}
            canEditMeta={Boolean(pdfUrl)}
            onBack={onBack}
            onUploadPdf={handleFileUpload}
            onEditMeta={openMetaEditor}
            onToggleCollapse={toggleLeftCollapse}
            onJumpToPage={scrollToPage}
            resolvePageLabel={resolvePageLabel}
          />
        </aside>

        <div
          onMouseDown={startLeftResize}
          data-active={isResizingLeft ? 'true' : 'false'}
          className="reader-splitter"
          aria-label="Resize left pane"
          role="separator"
          aria-orientation="vertical"
        />

        <section className="flex-1 min-w-[560px] h-full min-h-0 bg-[var(--bg-card)] border-r border-[var(--border-main)] flex flex-col">
          <div className="px-5 py-3 border-b border-[var(--border-main)] flex items-center gap-3">
            <h2 className="text-base font-semibold tracking-wide">PDF</h2>
            <div className="text-xs text-[var(--text-muted)] truncate max-w-[45ch]">{pdfName || 'No file selected'}</div>
            <div className="ml-auto text-xs text-[var(--text-muted)]">
              PDF {currentPage}/{numPages || 0} · Book {currentPageLabel}
            </div>
          </div>

          <div className="px-5 py-2 border-b border-[var(--border-main)] flex items-center gap-2 text-[11px]">
            {pdfUrl && <span className="text-[var(--text-muted)]">Read in continuous scroll and drag text to save.</span>}
            {!isMetaConfirmed && pdfUrl && <span className="text-amber-600">You can capture after entering metadata.</span>}
          </div>

          <div
            ref={pdfPaneRef}
            onDragStart={(event) => event.preventDefault()}
            className="flex-1 min-h-0 overflow-y-auto p-4 bg-[var(--bg-main)]"
          >
            {!pdfUrl && (
              <div className="h-full border-2 border-dashed border-[var(--border-main)] rounded-xl flex items-center justify-center text-[var(--text-muted)]">
                Upload a PDF to read and capture here.
              </div>
            )}

            {pdfUrl && (
              <div className="w-full flex justify-center">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={handleDocumentLoadSuccess}
                  onLoadError={(error) =>
                    setLoadError(`Unable to open PDF. ${error?.message || 'Please choose the file again.'}`)
                  }
                  loading={<div className="p-6 text-sm text-[var(--text-muted)]">Loading PDF...</div>}
                  className="w-full flex flex-col items-center"
                >
                  {Array.from({ length: numPages }, (_, index) => {
                    const pageNumber = index + 1;
                    const shouldRender = pageNumber >= visibleRange.start && pageNumber <= visibleRange.end;
                    const pageMarks = highlights.filter((item) => item.pageIndex === pageNumber - 1);
                    const pageUnderlineMarks = pageMarks.filter((item) => (item.kind || 'underline') !== 'highlight');
                    const pageHighlightMarks = pageMarks.filter((item) => (item.kind || 'underline') === 'highlight');
                    const pageSelectionPreview = selectionPreview.find((item) => item.pageIndex === pageNumber - 1);
                    const estimatedHeight = getEstimatedPageHeight(pageNumber);

                    return (
                      <div
                        key={`reader-page-${pageNumber}`}
                        ref={(node) => setPageContainerRef(pageNumber, node)}
                        data-reader-page-number={pageNumber}
                        className="relative w-full flex justify-center mb-5"
                      >
                        <div
                          className="relative inline-block shadow-lg rounded-sm overflow-hidden bg-white"
                          style={{ width: pageWidth ? `${pageWidth}px` : 'min(100%, 920px)', minHeight: `${estimatedHeight}px` }}
                        >
                          {shouldRender ? (
                            <>
                              <Page
                                pageNumber={pageNumber}
                                width={pageWidth}
                                renderAnnotationLayer
                                renderTextLayer
                                onLoadSuccess={(page) => handlePageLoadSuccess(page, pageNumber)}
                                loading={<div className="p-6 text-sm text-[var(--text-muted)]">Preparing page...</div>}
                              />
                              <div className="pointer-events-none absolute inset-0 z-20">
                                {pageHighlightMarks.map((highlight) =>
                                  highlight.rects.map((rect, highlightIndex) => (
                                    <div
                                      key={`${highlight.id}-${highlightIndex}`}
                                      className="absolute bg-yellow-300/45"
                                      style={{
                                        left: `${rect.leftPct * 100}%`,
                                        top: `${rect.topPct * 100}%`,
                                        width: `${rect.widthPct * 100}%`,
                                        height: `${rect.heightPct * 100}%`
                                      }}
                                    />
                                  ))
                                )}
                                {pageUnderlineMarks.map((highlight) =>
                                  highlight.rects.map((rect, underlineIndex) => (
                                    <div
                                      key={`${highlight.id}-u-${underlineIndex}`}
                                      className="absolute border-b-2 border-amber-500/90"
                                      style={{
                                        left: `${rect.leftPct * 100}%`,
                                        top: `${rect.topPct * 100}%`,
                                        width: `${rect.widthPct * 100}%`,
                                        height: `${rect.heightPct * 100}%`
                                      }}
                                    />
                                  ))
                                )}
                                {isPointerSelecting &&
                                  pageSelectionPreview &&
                                  pageSelectionPreview.rects.map((rect, previewIndex) => (
                                    <div
                                      key={`preview-${pageNumber}-${previewIndex}`}
                                      className={`absolute ${selectionPreviewKind === 'highlight' ? 'bg-yellow-300/45' : 'border-b-2 border-amber-500/90'}`}
                                      style={{
                                        left: `${rect.leftPct * 100}%`,
                                        top: `${rect.topPct * 100}%`,
                                        width: `${rect.widthPct * 100}%`,
                                        height: `${rect.heightPct * 100}%`
                                      }}
                                    />
                                  ))}
                              </div>
                            </>
                          ) : (
                            <div className="w-full bg-white" style={{ height: `${estimatedHeight}px` }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </Document>
              </div>
            )}
          </div>

          {loadError && (
            <div className="px-4 py-2 border-t border-[var(--border-main)] text-sm text-red-600 bg-red-50">{loadError}</div>
          )}
        </section>

        <div
          onMouseDown={startRightResize}
          data-active={isResizingRight ? 'true' : 'false'}
          className="reader-splitter"
          aria-label="Resize right pane"
          role="separator"
          aria-orientation="vertical"
        />

        <aside
          style={{ width: `${rightWidth}px` }}
          className="h-full min-h-0 flex-shrink-0 bg-[var(--bg-card)]"
        >
          <div className="h-full min-h-0 overflow-y-auto">
            <div className="px-4 py-3 border-b border-[var(--border-main)]">
              <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Citation Capture</div>
              <h3 className="mt-1 text-base font-semibold truncate">{meta.title || extractTitleFromFileName(pdfName || '') || 'Untitled source'}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                {meta.author ? `${meta.author}` : 'Adding an author improves document filtering.'}
              </p>
              {metaNotice && (
                <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-700">
                  {metaNotice}
                </div>
              )}
            </div>

            <div className="p-4 border-b border-[var(--border-main)]">
              <CitationEditor
                onAddCitation={() => undefined}
                username={username}
                readOnly
                hideSubmit
                  placeholder={isMetaConfirmed ? 'Drag text in the PDF and it will appear here.' : 'Enter author/title metadata first.'}
                controlledValues={{
                  text: draftSelection?.text || '',
                  author: meta.author || '',
                  book: meta.title || '',
                  page: draftSelection?.pageLabel || currentPageLabel
                }}
              />
              {saveError && <div className="mt-2 text-xs text-red-600">{saveError}</div>}
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Citations in this document</h4>
                <span className="text-xs text-[var(--text-muted)]">{currentDocumentCitations.length}</span>
              </div>

              {currentDocumentCitations.length === 0 ? (
                <div className="text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-main)] rounded-md p-3">
                  No citations yet for this document (matching author + title).
                </div>
              ) : (
                <CitationList
                  citations={currentDocumentCitations}
                  projects={projects}
                  username={username}
                  loading={loading}
                  searchTerm=""
                  selectedIds={selectedCitationIds}
                  onToggleSelect={handleToggleSelection}
                  onAddNote={onAddNote}
                  onUpdateNote={onUpdateNote}
                  onDeleteNote={onDeleteNote}
                  onDeleteCitation={handleDeleteCitationFromReader}
                  onUpdateCitation={onUpdateCitation}
                />
              )}
            </div>
          </div>
        </aside>
      </div>

      {isMetaEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] shadow-2xl">
            <div className="px-5 py-4 border-b border-[var(--border-main)]">
              <h3 className="text-lg font-semibold">PDF Metadata</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">Author is required. Title is auto-filled from the file name.</p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Author *</label>
                <input
                  autoFocus
                  value={metaForm.author}
                  onChange={(event) => setMetaForm((prev) => ({ ...prev, author: event.target.value }))}
                  placeholder={`e.g. ${username}`}
                  className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Title</label>
                <input
                  value={metaForm.title}
                  onChange={(event) => setMetaForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Document title"
                  className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">PDF start page</label>
                  <input
                    value={metaForm.pdfStartPage}
                    onChange={(event) => setMetaForm((prev) => ({ ...prev, pdfStartPage: event.target.value }))}
                    placeholder="e.g. 9"
                    inputMode="numeric"
                    className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Book start page</label>
                  <input
                    value={metaForm.bookStartPage}
                    onChange={(event) => setMetaForm((prev) => ({ ...prev, bookStartPage: event.target.value }))}
                    placeholder="e.g. 1"
                    inputMode="numeric"
                    className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <p className="text-[11px] text-[var(--text-muted)]">
                Mapping is optional. If set, book page numbers are computed even when PDF page labels are missing.
              </p>

              {metaError && <p className="text-xs text-red-600">{metaError}</p>}
            </div>

            <div className="px-5 py-4 border-t border-[var(--border-main)] flex justify-end gap-2">
              <button
                disabled={isMetaSaving}
                onClick={() => {
                  if (isMetaSaving) return;
                  setMetaError(null);
                  setIsMetaEditorOpen(false);
                }}
                className="px-3 py-2 text-sm rounded-md border border-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                disabled={isMetaSaving}
                onClick={() => {
                  void handleMetaConfirm();
                }}
                className="px-3 py-2 text-sm rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isMetaSaving ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
