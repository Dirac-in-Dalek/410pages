import type {
  PdfHighlightRect,
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

export const normalizeSelectionText = (rawText: string) =>
  rawText.replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();

export const normalizeDocumentField = (value: string) =>
  value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();

export const parsePositiveInt = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

export const toElement = (node: Node): Element | null =>
  node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 0;
};

const resolveReferenceLineHeight = (
  pageNode: HTMLElement,
  fallback: number
): number => {
  const textLayer = pageNode.querySelector('.react-pdf__Page__textContent');
  if (!textLayer) return fallback;

  const spanHeights = Array.from(textLayer.querySelectorAll('span'))
    .map((node) => (node as HTMLElement).getBoundingClientRect().height)
    .filter((height) => Number.isFinite(height) && height > 0.5);

  const base = median(spanHeights);
  return base > 0 ? base : fallback;
};

export const createHighlightRects = (
  range: Range,
  pageNode: HTMLElement | null
): PdfHighlightRect[] => {
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
  const referenceHeight = Math.max(
    1,
    resolveReferenceLineHeight(pageNode, fallbackHeight || 12)
  );
  const lineThreshold = Math.max(2, referenceHeight * 0.65);
  const mergeGap = Math.max(2, referenceHeight * 0.4);

  const orderedRects = [...rawRects].sort((a, b) => {
    const aCenter = a.top + a.height / 2;
    const bCenter = b.top + b.height / 2;
    if (Math.abs(aCenter - bCenter) > lineThreshold) return aCenter - bCenter;
    return a.left - b.left;
  });

  const lineGroups: Array<{
    anchorCenter: number;
    rects: typeof rawRects;
  }> = [];
  orderedRects.forEach((rect) => {
    const center = rect.top + rect.height / 2;
    const last = lineGroups[lineGroups.length - 1];
    if (!last || Math.abs(center - last.anchorCenter) > lineThreshold) {
      lineGroups.push({ anchorCenter: center, rects: [rect] });
      return;
    }
    last.rects.push(rect);
  });

  const normalizedRects: Array<{
    left: number;
    right: number;
    top: number;
    height: number;
  }> = [];
  lineGroups.forEach((line) => {
    const lineRects = [...line.rects].sort((a, b) => a.left - b.left);
    if (lineRects.length === 0) return;

    const centers = lineRects.map((rect) => rect.top + rect.height / 2);
    const lineCenter = median(centers);
    const lineHeight = referenceHeight;
    const lineTop = clamp(
      lineCenter - lineHeight / 2,
      0,
      Math.max(0, pageRect.height - lineHeight)
    );

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

export const intersectHighlightRects = (
  source: PdfHighlightRect[],
  clips: PdfHighlightRect[]
): PdfHighlightRect[] => {
  const intersections: PdfHighlightRect[] = [];
  source.forEach((left) => {
    clips.forEach((right) => {
      const x1 = Math.max(left.leftPct, right.leftPct);
      const x2 = Math.min(
        left.leftPct + left.widthPct,
        right.leftPct + right.widthPct
      );
      const y1 = Math.max(left.topPct, right.topPct);
      const y2 = Math.min(
        left.topPct + left.heightPct,
        right.topPct + right.heightPct
      );

      const widthPct = x2 - x1;
      const heightPct = y2 - y1;
      if (widthPct <= 0 || heightPct <= 0) return;

      intersections.push({
        leftPct: x1,
        topPct: y1,
        widthPct,
        heightPct
      });
    });
  });
  return intersections;
};

export const constrainRangeToStableEnd = (range: Range): Range => range;

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
