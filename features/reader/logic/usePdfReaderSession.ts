import { MutableRefObject, RefObject, useCallback, useMemo } from 'react';
import type { Citation, PdfDraftSelection, PdfReaderMeta, PdfRectHighlight } from '../../../types';
import type { MetaFormState, PersistedReaderSession, ReaderDocumentMatchInput, ReaderSessionSnapshot } from '../contract/pdfReaderContract';

export const READER_SESSION_STORAGE_KEY = 'pdfReaderSession.v1';
export const defaultReaderMeta: PdfReaderMeta = { author: '', title: '' };

const sanitizePersistedHighlights = (raw: unknown): PdfRectHighlight[] =>
  Array.isArray(raw)
    ? (raw as PdfRectHighlight[])
        .filter(
          (item) =>
            item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.pageIndex === 'number' &&
            Array.isArray(item.rects)
        )
        .map((item): PdfRectHighlight => ({
          ...item,
          kind: item.kind === 'highlight' ? 'highlight' : 'underline'
        }))
    : [];

export const sanitizePersistedReaderSession = (raw: unknown): PersistedReaderSession | null => {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;

  const metaRaw = (data.meta && typeof data.meta === 'object' ? data.meta : {}) as Record<string, unknown>;
  const pdfStartPage = typeof metaRaw.pdfStartPage === 'number' && metaRaw.pdfStartPage > 0 ? Math.floor(metaRaw.pdfStartPage) : undefined;
  const bookStartPage =
    typeof metaRaw.bookStartPage === 'number' && metaRaw.bookStartPage > 0 ? Math.floor(metaRaw.bookStartPage) : undefined;

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
    highlights: sanitizePersistedHighlights(data.highlights),
    draftSelection,
    scrollTop:
      typeof data.scrollTop === 'number' && Number.isFinite(data.scrollTop) && data.scrollTop >= 0 ? data.scrollTop : 0
  };
};

export const readPersistedReaderSession = (storage?: Storage | null): PersistedReaderSession | null => {
  const targetStorage = storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  if (!targetStorage) return null;

  try {
    const raw = targetStorage.getItem(READER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return sanitizePersistedReaderSession(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const writePersistedReaderSession = (snapshot: ReaderSessionSnapshot, storage?: Storage | null) => {
  const targetStorage = storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  if (!targetStorage) return;

  if (!snapshot.pdfUrl) {
    targetStorage.removeItem(READER_SESSION_STORAGE_KEY);
    return;
  }

  const payload: PersistedReaderSession = {
    pdfName: snapshot.pdfName,
    currentPage: Math.max(1, snapshot.currentPage),
    pageLabels: snapshot.pageLabels,
    meta: snapshot.meta,
    highlights: snapshot.highlights,
    draftSelection: snapshot.draftSelection,
    scrollTop: snapshot.scrollTop
  };

  targetStorage.setItem(READER_SESSION_STORAGE_KEY, JSON.stringify(payload));
};

export const clearPersistedReaderSession = (storage?: Storage | null) => {
  const targetStorage = storage ?? (typeof window === 'undefined' ? null : window.localStorage);
  if (!targetStorage) return;
  targetStorage.removeItem(READER_SESSION_STORAGE_KEY);
};

export const buildMetaFormFromState = (meta: PdfReaderMeta): MetaFormState => ({
  author: meta.author,
  title: meta.title,
  pdfStartPage: meta.pdfStartPage ? String(meta.pdfStartPage) : '',
  bookStartPage: meta.bookStartPage ? String(meta.bookStartPage) : ''
});

export const extractTitleFromFileName = (fileName: string) => fileName.replace(/\.[^.]+$/, '').trim();
export const normalizeDocumentField = (value: string) => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();

export const parsePositiveInt = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

export const resolvePdfPageLabel = (pageNumber: number, meta: PdfReaderMeta, pageLabels: string[] | null) => {
  const labelFromPdf = pageLabels?.[pageNumber - 1]?.trim();
  if (labelFromPdf) return labelFromPdf;

  if (meta.pdfStartPage && meta.bookStartPage) {
    return String(meta.bookStartPage + (pageNumber - meta.pdfStartPage));
  }

  return String(pageNumber);
};

export const getCurrentDocumentCitations = ({ citations, meta, isMetaConfirmed }: ReaderDocumentMatchInput): Citation[] => {
  if (!isMetaConfirmed) return [];

  const targetAuthor = normalizeDocumentField(meta.author);
  const targetTitle = normalizeDocumentField(meta.title);

  return citations
    .filter(
      (citation) =>
        normalizeDocumentField(citation.author) === targetAuthor && normalizeDocumentField(citation.book) === targetTitle
    )
    .sort((a, b) => b.createdAt - a.createdAt);
};

type UsePdfReaderSessionParams = {
  pdfUrl: string | null;
  pdfName: string;
  currentPage: number;
  pageLabels: string[] | null;
  meta: PdfReaderMeta;
  highlights: PdfRectHighlight[];
  draftSelection: PdfDraftSelection | null;
  citations: Citation[];
  pdfPaneRef: RefObject<HTMLElement | null>;
  resumeScrollTopRef: MutableRefObject<number | null>;
};

export const usePdfReaderSession = ({
  pdfUrl,
  pdfName,
  currentPage,
  pageLabels,
  meta,
  highlights,
  draftSelection,
  citations,
  pdfPaneRef,
  resumeScrollTopRef
}: UsePdfReaderSessionParams) => {
  const isMetaConfirmed = useMemo(
    () => Boolean(pdfUrl) && Boolean(meta.author.trim()) && Boolean(meta.title.trim()),
    [meta.author, meta.title, pdfUrl]
  );

  const resolvePageLabel = useCallback(
    (pageNumber: number) => resolvePdfPageLabel(pageNumber, meta, pageLabels),
    [meta, pageLabels]
  );

  const currentPageLabel = useMemo(() => resolvePageLabel(currentPage), [currentPage, resolvePageLabel]);
  const currentDocumentCitations = useMemo(
    () => getCurrentDocumentCitations({ citations, meta, isMetaConfirmed }),
    [citations, isMetaConfirmed, meta]
  );

  const persistReaderSession = useCallback(() => {
    writePersistedReaderSession({
      pdfUrl,
      pdfName,
      currentPage,
      pageLabels,
      meta,
      highlights,
      draftSelection,
      scrollTop: pdfPaneRef.current?.scrollTop ?? resumeScrollTopRef.current ?? 0
    });
  }, [currentPage, draftSelection, highlights, meta, pageLabels, pdfName, pdfPaneRef, pdfUrl, resumeScrollTopRef]);

  return {
    isMetaConfirmed,
    resolvePageLabel,
    currentPageLabel,
    currentDocumentCitations,
    persistReaderSession
  };
};
