import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { configurePdfWorker } from '../../lib/pdfWorker';
import { CitationEditor } from '../CitationEditor';
import { CitationList } from '../CitationList';
import {
  AddCitationInput,
  AddCitationResult,
  BulkSourceUpdateResult,
  Citation,
  CitationSourceInput,
  PdfDraftSelection,
  PdfHighlightRect,
  PdfReaderMeta,
  PdfRectHighlight,
  Project,
  ReaderVirtualRange
} from '../../types';
import { PdfThumbnailSidebar } from './PdfThumbnailSidebar';
import { useReaderPaneLayout } from './useReaderPaneLayout';

configurePdfWorker();

type MetaFormState = {
  author: string;
  title: string;
  pdfStartPage: string;
  bookStartPage: string;
};

type SelectionPayload = {
  selection?: Selection;
  range: Range;
  text: string;
  pageNumber: number;
  pageIndex: number;
  pageLabel: string;
};

interface PdfReaderPageProps {
  username: string;
  onBack: () => void;
  citations: Citation[];
  projects: Project[];
  loading: boolean;
  onAddCitation: (citation: AddCitationInput) => Promise<AddCitationResult>;
  onAddNote: (citationId: string, content: string) => void;
  onUpdateNote: (citationId: string, noteId: string, content: string) => void;
  onDeleteNote: (citationId: string, noteId: string) => void;
  onDeleteCitation: (id: string) => void;
  onUpdateCitation: (id: string, data: Partial<Citation>) => void;
  onBulkUpdateCitationSource: (citationIds: string[], source: CitationSourceInput) => Promise<BulkSourceUpdateResult>;
}

const MIN_CAPTURE_LENGTH = 3;
const DUPLICATE_WINDOW_MS = 1200;
const VIRTUAL_OVERSCAN_PAGES = 6;
const DEFAULT_PAGE_RATIO = 1.41;
const PAGE_VERTICAL_GAP = 20;
const READER_SESSION_STORAGE_KEY = 'pdfReaderSession.v1';

type PersistedReaderSession = {
  pdfName: string;
  currentPage: number;
  pageLabels: string[] | null;
  meta: PdfReaderMeta;
  highlights: PdfRectHighlight[];
  draftSelection: PdfDraftSelection | null;
  scrollTop: number;
};

const defaultMeta: PdfReaderMeta = { author: '', title: '' };

let readerRuntimeCache: { pdfUrl: string | null } = {
  pdfUrl: null
};

const sanitizePersistedSession = (raw: unknown): PersistedReaderSession | null => {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;

  const metaRaw = (data.meta && typeof data.meta === 'object' ? data.meta : {}) as Record<string, unknown>;
  const pdfStartPage = typeof metaRaw.pdfStartPage === 'number' && metaRaw.pdfStartPage > 0 ? Math.floor(metaRaw.pdfStartPage) : undefined;
  const bookStartPage = typeof metaRaw.bookStartPage === 'number' && metaRaw.bookStartPage > 0 ? Math.floor(metaRaw.bookStartPage) : undefined;

  const highlights = Array.isArray(data.highlights)
    ? (data.highlights as PdfRectHighlight[]).filter(
        (item) =>
          item &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.pageIndex === 'number' &&
          Array.isArray(item.rects)
      )
    : [];

  const draftSelection =
    data.draftSelection &&
    typeof data.draftSelection === 'object' &&
    typeof (data.draftSelection as Record<string, unknown>).text === 'string' &&
    typeof (data.draftSelection as Record<string, unknown>).pageIndex === 'number' &&
    typeof (data.draftSelection as Record<string, unknown>).pageLabel === 'string'
      ? (data.draftSelection as PdfDraftSelection)
      : null;

  return {
    pdfName: typeof data.pdfName === 'string' ? data.pdfName : '',
    currentPage:
      typeof data.currentPage === 'number' && Number.isFinite(data.currentPage) && data.currentPage > 0
        ? Math.floor(data.currentPage)
        : 1,
    pageLabels: Array.isArray(data.pageLabels)
      ? (data.pageLabels as unknown[]).filter((value): value is string => typeof value === 'string')
      : null,
    meta: {
      author: typeof metaRaw.author === 'string' ? metaRaw.author : '',
      title: typeof metaRaw.title === 'string' ? metaRaw.title : '',
      pdfStartPage,
      bookStartPage
    },
    highlights,
    draftSelection,
    scrollTop:
      typeof data.scrollTop === 'number' && Number.isFinite(data.scrollTop) && data.scrollTop >= 0
        ? data.scrollTop
        : 0
  };
};

const readPersistedReaderSession = (): PersistedReaderSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(READER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return sanitizePersistedSession(JSON.parse(raw));
  } catch {
    return null;
  }
};

const buildMetaFormFromState = (meta: PdfReaderMeta): MetaFormState => ({
  author: meta.author,
  title: meta.title,
  pdfStartPage: meta.pdfStartPage ? String(meta.pdfStartPage) : '',
  bookStartPage: meta.bookStartPage ? String(meta.bookStartPage) : ''
});

const extractTitleFromFileName = (fileName: string) => fileName.replace(/\.[^.]+$/, '').trim();

const normalizeSelectionText = (rawText: string) => rawText.replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();

const normalizeDocumentField = (value: string) => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();

const parsePositiveInt = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const toElement = (node: Node): Element | null =>
  node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 0;
};

const resolveReferenceLineHeight = (pageNode: HTMLElement, fallback: number): number => {
  const textLayer = pageNode.querySelector('.react-pdf__Page__textContent');
  if (!textLayer) return fallback;

  const spanHeights = Array.from(textLayer.querySelectorAll('span'))
    .map((node) => (node as HTMLElement).getBoundingClientRect().height)
    .filter((height) => Number.isFinite(height) && height > 0.5);

  const base = median(spanHeights);
  return base > 0 ? base : fallback;
};

const createHighlightRects = (range: Range, pageNode: HTMLElement | null): PdfHighlightRect[] => {
  if (!pageNode) return [];
  const pageRect = pageNode.getBoundingClientRect();
  if (pageRect.width === 0 || pageRect.height === 0) return [];

  const rawRects = Array.from(range.getClientRects())
    .map((rect) => {
      const left = clamp(rect.left - pageRect.left, 0, pageRect.width);
      const right = clamp(rect.right - pageRect.left, 0, pageRect.width);
      const top = clamp(rect.top - pageRect.top, 0, pageRect.height);
      const bottom = clamp(rect.bottom - pageRect.top, 0, pageRect.height);

      const width = right - left;
      const height = bottom - top;

      return {
        left,
        right,
        top,
        bottom,
        width,
        height
      };
    })
    .filter((rect) => rect.width > 0.5 && rect.height > 0.5);

  if (rawRects.length === 0) return [];

  const fallbackHeight = median(rawRects.map((rect) => rect.height));
  const referenceHeight = Math.max(1, resolveReferenceLineHeight(pageNode, fallbackHeight || 12));
  const lineThreshold = Math.max(2, referenceHeight * 0.65);
  const mergeGap = Math.max(2, referenceHeight * 0.4);

  const orderedRects = [...rawRects].sort((a, b) => {
    const aCenter = a.top + a.height / 2;
    const bCenter = b.top + b.height / 2;
    if (Math.abs(aCenter - bCenter) > lineThreshold) return aCenter - bCenter;
    return a.left - b.left;
  });

  const lineGroups: Array<{ anchorCenter: number; rects: typeof rawRects }> = [];
  orderedRects.forEach((rect) => {
    const center = rect.top + rect.height / 2;
    const last = lineGroups[lineGroups.length - 1];
    if (!last || Math.abs(center - last.anchorCenter) > lineThreshold) {
      lineGroups.push({ anchorCenter: center, rects: [rect] });
      return;
    }
    last.rects.push(rect);
  });

  const normalizedRects: Array<{ left: number; right: number; top: number; height: number }> = [];
  lineGroups.forEach((line) => {
    const lineRects = [...line.rects].sort((a, b) => a.left - b.left);
    if (lineRects.length === 0) return;

    const centers = lineRects.map((rect) => rect.top + rect.height / 2);
    const lineCenter = median(centers);
    const lineHeight = referenceHeight;
    const lineTop = clamp(lineCenter - lineHeight / 2, 0, Math.max(0, pageRect.height - lineHeight));

    let currentLeft = lineRects[0].left;
    let currentRight = lineRects[0].right;

    for (let i = 1; i < lineRects.length; i += 1) {
      const next = lineRects[i];
      if (next.left - currentRight <= mergeGap) {
        currentRight = Math.max(currentRight, next.right);
      } else {
        normalizedRects.push({
          left: currentLeft,
          right: currentRight,
          top: lineTop,
          height: lineHeight
        });
        currentLeft = next.left;
        currentRight = next.right;
      }
    }

    normalizedRects.push({
      left: currentLeft,
      right: currentRight,
      top: lineTop,
      height: lineHeight
    });
  });

  return normalizedRects
    .map((rect) => ({
      leftPct: rect.left / pageRect.width,
      topPct: rect.top / pageRect.height,
      widthPct: (rect.right - rect.left) / pageRect.width,
      heightPct: Math.min(rect.height / pageRect.height, 1)
    }))
    .filter((rect) => rect.widthPct > 0 && rect.heightPct > 0);
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
    () => (readerRuntimeCache.pdfUrl ? readPersistedReaderSession() : null),
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
    (pageNumber: number) => {
      const labelFromPdf = pageLabels?.[pageNumber - 1]?.trim();
      if (labelFromPdf) return labelFromPdf;

      if (meta.pdfStartPage && meta.bookStartPage) {
        return String(meta.bookStartPage + (pageNumber - meta.pdfStartPage));
      }

      return String(pageNumber);
    },
    [meta.bookStartPage, meta.pdfStartPage, pageLabels]
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

  const getEstimatedPageHeight = useCallback(
    (pageNumber: number) => {
      const ratio = pageRatiosRef.current[pageNumber] || pageRatiosRef.current[1] || DEFAULT_PAGE_RATIO;
      const width = pageWidth || 900;
      return Math.max(320, Math.round(width * ratio));
    },
    [pageWidth]
  );

  const syncViewWindow = useCallback(() => {
    const paneNode = pdfPaneRef.current;
    if (!paneNode || numPages <= 0) return;

    const viewportTop = paneNode.scrollTop;
    const viewportBottom = viewportTop + paneNode.clientHeight;
    const viewportAnchor = viewportTop + paneNode.clientHeight * 0.35;

    let nextCurrentPage = 1;
    let minDistance = Number.POSITIVE_INFINITY;

    const overscanPx = paneNode.clientHeight * 1.1;
    let virtualStart = 1;
    let virtualEnd = numPages;
    let started = false;

    let fallbackTop = 0;

    for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
      const node = pageContainerRefs.current[pageNumber];
      const estimatedHeight = getEstimatedPageHeight(pageNumber) + PAGE_VERTICAL_GAP;
      const top = node ? node.offsetTop : fallbackTop;
      const height = node ? Math.max(node.offsetHeight, estimatedHeight) : estimatedHeight;
      const bottom = top + height;
      const center = top + height / 2;

      fallbackTop = bottom;

      const distance = Math.abs(center - viewportAnchor);
      if (distance < minDistance) {
        minDistance = distance;
        nextCurrentPage = pageNumber;
      }

      if (!started && bottom >= viewportTop - overscanPx) {
        virtualStart = Math.max(1, pageNumber - VIRTUAL_OVERSCAN_PAGES);
        started = true;
      }

      if (top <= viewportBottom + overscanPx) {
        virtualEnd = Math.min(numPages, pageNumber + VIRTUAL_OVERSCAN_PAGES);
      }
    }

    setCurrentPage((prev) => (prev === nextCurrentPage ? prev : nextCurrentPage));
    setVisibleRange((prev) =>
      prev.start === virtualStart && prev.end === virtualEnd ? prev : { start: virtualStart, end: virtualEnd }
    );
  }, [getEstimatedPageHeight, numPages]);

  const scrollToPage = useCallback(
    (pageNumber: number) => {
      const paneNode = pdfPaneRef.current;
      if (!paneNode || pageNumber < 1 || pageNumber > numPages) return;

      const node = pageContainerRefs.current[pageNumber];
      if (node) {
        paneNode.scrollTo({ top: Math.max(0, node.offsetTop - 8), behavior: 'smooth' });
      } else {
        let fallbackTop = 0;
        for (let page = 1; page < pageNumber; page += 1) {
          fallbackTop += getEstimatedPageHeight(page) + PAGE_VERTICAL_GAP;
        }
        paneNode.scrollTo({ top: fallbackTop, behavior: 'smooth' });
      }

      setCurrentPage(pageNumber);
    },
    [getEstimatedPageHeight, numPages]
  );

  const getSelectionPayload = useCallback((): SelectionPayload | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

    const range = selection.getRangeAt(0).cloneRange();
    const startElement = toElement(range.startContainer);
    const endElement = toElement(range.endContainer);
    const startLayer = startElement?.closest('.react-pdf__Page__textContent');
    const endLayer = endElement?.closest('.react-pdf__Page__textContent');
    const textLayer = (startLayer || endLayer) as HTMLElement | null;

    if (!textLayer) return null;
    if (!pdfPaneRef.current?.contains(textLayer)) return null;

    const text = normalizeSelectionText(selection.toString());
    if (!text) return null;

    const pageNode = textLayer.closest('[data-reader-page-number]') as HTMLElement | null;
    const pageFromDom = Number.parseInt(pageNode?.getAttribute('data-reader-page-number') || '', 10);
    const pageNumber = Number.isFinite(pageFromDom) && pageFromDom > 0 ? pageFromDom : currentPage;

    return {
      selection,
      range,
      text,
      pageNumber,
      pageIndex: pageNumber - 1,
      pageLabel: resolvePageLabel(pageNumber)
    };
  }, [currentPage, resolvePageLabel]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!isMetaConfirmed) {
        latestSelectionRef.current = null;
        setDraftSelection(null);
        return;
      }

      const payload = getSelectionPayload();
      if (!payload) {
        latestSelectionRef.current = null;
        setDraftSelection(null);
        return;
      }

      latestSelectionRef.current = {
        range: payload.range.cloneRange(),
        text: payload.text,
        pageNumber: payload.pageNumber,
        pageIndex: payload.pageIndex,
        pageLabel: payload.pageLabel
      };

      setDraftSelection({
        text: payload.text,
        pageIndex: payload.pageIndex,
        pageLabel: payload.pageLabel
      });

      if (saveError) setSaveError(null);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [getSelectionPayload, isMetaConfirmed, saveError]);

  const saveSelection = useCallback(async () => {
    if (!isMetaConfirmed || isSavingRef.current) return;

    const livePayload = getSelectionPayload();
    const payload = livePayload || latestSelectionRef.current;
    if (!payload) return;

    if (payload.text.length < MIN_CAPTURE_LENGTH) {
      latestSelectionRef.current = null;
      setDraftSelection(null);
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
      livePayload?.selection?.removeAllRanges();
      return;
    }

    const pageNode = pageContainerRefs.current[payload.pageNumber] || null;
    const rects = createHighlightRects(payload.range, pageNode);
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

      if (rects.length > 0) {
        setHighlights((prev) => [
          {
            id: `hl-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
            citationId: result.citationId,
            pageIndex: payload.pageIndex,
            rects,
            createdAt
          },
          ...prev
        ]);
      }

      setSaveError(null);
      latestSelectionRef.current = null;
      setDraftSelection(null);
      livePayload?.selection?.removeAllRanges();
      return;
    }

    setSaveError('인용 저장에 실패했습니다. 다시 시도해주세요.');
  }, [getSelectionPayload, isMetaConfirmed, meta.author, meta.title, onAddCitation]);

  useEffect(() => {
    const onMouseUp = () => {
      void saveSelection();
    };

    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [saveSelection]);

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
      setLoadError('PDF 파일만 업로드할 수 있습니다.');
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
      setMetaError('저자 입력은 필수입니다.');
      return;
    }

    if (!title) {
      setMetaError('제목을 입력해주세요.');
      return;
    }

    const hasPdfMapping = metaForm.pdfStartPage.trim().length > 0;
    const hasBookMapping = metaForm.bookStartPage.trim().length > 0;
    if (hasPdfMapping !== hasBookMapping) {
      setMetaError('페이지 매핑은 두 칸을 함께 입력해야 합니다.');
      return;
    }

    if ((hasPdfMapping && !pdfStartPage) || (hasBookMapping && !bookStartPage)) {
      setMetaError('페이지 매핑은 1 이상의 정수로 입력해주세요.');
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
        setMetaError('메타를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      if (bulkResult.updatedCount > 0) {
        setMetaNotice(`현재 문헌 인용 ${bulkResult.updatedCount}건의 저자/제목을 업데이트했습니다.`);
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
      start: Math.max(1, resumedPage - VIRTUAL_OVERSCAN_PAGES),
      end: Math.min(pdf.numPages, resumedPage + VIRTUAL_OVERSCAN_PAGES)
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
    <div className="pdf-reader-mode h-screen w-full overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)]">
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
            {pdfUrl && <span className="text-[var(--text-muted)]">연속 스크롤로 읽고 드래그하여 저장합니다.</span>}
            {!isMetaConfirmed && pdfUrl && <span className="text-amber-600">메타 입력 완료 후 캡처할 수 있습니다.</span>}
          </div>

          <div
            ref={pdfPaneRef}
            onDragStart={(event) => event.preventDefault()}
            className="flex-1 min-h-0 overflow-y-auto p-4 bg-[var(--bg-main)]"
          >
            {!pdfUrl && (
              <div className="h-full border-2 border-dashed border-[var(--border-main)] rounded-xl flex items-center justify-center text-[var(--text-muted)]">
                PDF를 업로드하면 여기서 바로 읽고 캡처할 수 있습니다.
              </div>
            )}

            {pdfUrl && (
              <div className="w-full flex justify-center">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={handleDocumentLoadSuccess}
                  onLoadError={(error) =>
                    setLoadError(`PDF를 열지 못했습니다. ${error?.message || '파일을 다시 선택해주세요.'}`)
                  }
                  loading={<div className="p-6 text-sm text-[var(--text-muted)]">PDF를 불러오는 중...</div>}
                  className="w-full flex flex-col items-center"
                >
                  {Array.from({ length: numPages }, (_, index) => {
                    const pageNumber = index + 1;
                    const shouldRender = pageNumber >= visibleRange.start && pageNumber <= visibleRange.end;
                    const pageHighlights = highlights.filter((item) => item.pageIndex === pageNumber - 1);
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
                                loading={<div className="p-6 text-sm text-[var(--text-muted)]">페이지를 준비하는 중...</div>}
                              />
                              <div className="pointer-events-none absolute inset-0 z-20">
                                {pageHighlights.map((highlight) =>
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
                {meta.author ? `${meta.author}` : '저자를 입력하면 문헌 필터가 정확해집니다.'}
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
                placeholder={isMetaConfirmed ? 'PDF 텍스트를 드래그하면 여기에 표시됩니다.' : '먼저 저자/제목 메타를 입력해주세요.'}
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
                  현재 문헌(author + title 일치) 인용이 없습니다.
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
              <p className="text-xs text-[var(--text-muted)] mt-1">저자 입력은 필수입니다. 제목은 파일명으로 자동 채워집니다.</p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Author *</label>
                <input
                  autoFocus
                  value={metaForm.author}
                  onChange={(event) => setMetaForm((prev) => ({ ...prev, author: event.target.value }))}
                  placeholder={`예: ${username}`}
                  className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Title</label>
                <input
                  value={metaForm.title}
                  onChange={(event) => setMetaForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="문헌 제목"
                  className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">PDF 시작 페이지</label>
                  <input
                    value={metaForm.pdfStartPage}
                    onChange={(event) => setMetaForm((prev) => ({ ...prev, pdfStartPage: event.target.value }))}
                    placeholder="예: 9"
                    inputMode="numeric"
                    className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">책 시작 페이지</label>
                  <input
                    value={metaForm.bookStartPage}
                    onChange={(event) => setMetaForm((prev) => ({ ...prev, bookStartPage: event.target.value }))}
                    placeholder="예: 1"
                    inputMode="numeric"
                    className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <p className="text-[11px] text-[var(--text-muted)]">
                매핑은 선택사항입니다. 입력하면 page label이 없는 PDF에서도 책 페이지 번호를 계산합니다.
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
