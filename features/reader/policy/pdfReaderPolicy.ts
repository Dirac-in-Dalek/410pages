import type {
  PdfReaderMeta,
  PdfRectHighlight
} from '../../../types';
import type {
  MetaFormState,
  PersistedReaderSession,
  ReaderCitationSelectionRange
} from '../contract/pdfReaderContract';

export const sanitizePersistedReaderSession = (
  raw: unknown
): PersistedReaderSession | null => {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;

  const metaRaw = (
    data.meta && typeof data.meta === 'object' ? data.meta : {}
  ) as Record<string, unknown>;
  const pdfStartPage =
    typeof metaRaw.pdfStartPage === 'number' && metaRaw.pdfStartPage > 0
      ? Math.floor(metaRaw.pdfStartPage)
      : undefined;
  const bookStartPage =
    typeof metaRaw.bookStartPage === 'number' && metaRaw.bookStartPage > 0
      ? Math.floor(metaRaw.bookStartPage)
      : undefined;

  const highlights = Array.isArray(data.highlights)
    ? (data.highlights as PdfRectHighlight[])
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

  const draftSelection =
    data.draftSelection &&
    typeof data.draftSelection === 'object' &&
    typeof (data.draftSelection as Record<string, unknown>).text === 'string' &&
    typeof (data.draftSelection as Record<string, unknown>).pageIndex ===
      'number' &&
    typeof (data.draftSelection as Record<string, unknown>).pageLabel ===
      'string'
      ? (data.draftSelection as PersistedReaderSession['draftSelection'])
      : null;

  return {
    pdfName: typeof data.pdfName === 'string' ? data.pdfName : '',
    currentPage:
      typeof data.currentPage === 'number' &&
      Number.isFinite(data.currentPage) &&
      data.currentPage > 0
        ? Math.floor(data.currentPage)
        : 1,
    pageLabels: Array.isArray(data.pageLabels)
      ? (data.pageLabels as unknown[]).filter(
          (value): value is string => typeof value === 'string'
        )
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
      typeof data.scrollTop === 'number' &&
      Number.isFinite(data.scrollTop) &&
      data.scrollTop >= 0
        ? data.scrollTop
        : 0
  };
};

export const readPersistedReaderSession = (
  storageKey: string
): PersistedReaderSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    return sanitizePersistedReaderSession(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const buildMetaFormFromState = (
  meta: PdfReaderMeta
): MetaFormState => ({
  author: meta.author,
  title: meta.title,
  pdfStartPage: meta.pdfStartPage ? String(meta.pdfStartPage) : '',
  bookStartPage: meta.bookStartPage ? String(meta.bookStartPage) : ''
});

export const extractTitleFromFileName = (fileName: string) =>
  fileName.replace(/\.[^.]+$/, '').trim();

const normalizeSelectionText = (rawText: string) =>
  rawText.replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();

export const normalizeDocumentField = (value: string) =>
  value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();

export const parsePositiveInt = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const normalizeWithMap = (value: string): { text: string; indexMap: number[] } => {
  const chars: string[] = [];
  const map: number[] = [];
  let sawNonSpace = false;
  let pendingSpace = false;
  let pendingSpaceIndex = -1;

  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index] === '\u00A0' ? ' ' : value[index];
    if (/\s/.test(raw)) {
      if (!sawNonSpace) continue;
      pendingSpace = true;
      if (pendingSpaceIndex < 0) pendingSpaceIndex = index;
      continue;
    }

    if (pendingSpace && chars.length > 0) {
      chars.push(' ');
      map.push(pendingSpaceIndex);
    }

    chars.push(raw);
    map.push(index);
    sawNonSpace = true;
    pendingSpace = false;
    pendingSpaceIndex = -1;
  }

  return { text: chars.join(''), indexMap: map };
};

export const resolveSelectionRangeInCitation = (
  citationText: string,
  selectedText: string
): ReaderCitationSelectionRange | null => {
  const normalizedCitation = normalizeWithMap(citationText);
  const normalizedSelected = normalizeSelectionText(selectedText);
  if (!normalizedSelected) return null;

  const startInNormalized = normalizedCitation.text.indexOf(normalizedSelected);
  if (startInNormalized < 0) {
    let bestStartToEnd = -1;
    let bestLengthToEnd = 0;
    let bestStartAny = -1;
    let bestLengthAny = 0;

    for (let start = 0; start < normalizedCitation.text.length; start += 1) {
      let length = 0;
      while (
        start + length < normalizedCitation.text.length &&
        length < normalizedSelected.length &&
        normalizedCitation.text[start + length] === normalizedSelected[length]
      ) {
        length += 1;
      }

      if (length <= 0) continue;
      const touchesEnd = start + length >= normalizedCitation.text.length;
      if (touchesEnd && length > bestLengthToEnd) {
        bestStartToEnd = start;
        bestLengthToEnd = length;
      }
      if (length > bestLengthAny) {
        bestStartAny = start;
        bestLengthAny = length;
      }
    }

    const bestStart = bestStartToEnd >= 0 ? bestStartToEnd : bestStartAny;
    const bestLength = bestStartToEnd >= 0 ? bestLengthToEnd : bestLengthAny;
    if (bestStart < 0 || bestLength <= 0) return null;
    const fallbackStart = normalizedCitation.indexMap[bestStart];
    const fallbackEnd = normalizedCitation.indexMap[bestStart + bestLength - 1] + 1;
    if (
      !Number.isFinite(fallbackStart) ||
      !Number.isFinite(fallbackEnd) ||
      fallbackEnd <= fallbackStart
    ) {
      return null;
    }
    return { start: fallbackStart, end: fallbackEnd };
  }

  const endInNormalized = startInNormalized + normalizedSelected.length - 1;
  const start = normalizedCitation.indexMap[startInNormalized];
  const end = normalizedCitation.indexMap[endInNormalized] + 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return { start, end };
};

export const resolveReaderPageLabel = (
  pageNumber: number,
  pageLabels: string[] | null,
  meta: PdfReaderMeta
): string => {
  const labelFromPdf = pageLabels?.[pageNumber - 1]?.trim();
  if (labelFromPdf) return labelFromPdf;

  if (meta.pdfStartPage && meta.bookStartPage) {
    return String(meta.bookStartPage + (pageNumber - meta.pdfStartPage));
  }

  return String(pageNumber);
};
