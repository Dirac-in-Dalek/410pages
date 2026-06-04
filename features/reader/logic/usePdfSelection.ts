import { MutableRefObject, RefObject, useCallback } from 'react';
import type { PdfHighlightRect, PdfRectHighlight } from '../../../types';
import type { PageContainerMap, SelectionPayload, SelectionPreview, SelectionSegment } from '../contract/pdfReaderContract';

export const MIN_CAPTURE_LENGTH = 3;
const UNDERLINE_DRAG_HIT_TOLERANCE_PX = 8;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] || 0;
};

const toElement = (node: Node): Element | null =>
  node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;

const normalizeSelectionText = (rawText: string) => rawText.replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();

const resolveReferenceLineHeight = (pageNode: HTMLElement, fallback: number): number => {
  const textLayer = pageNode.querySelector('.react-pdf__Page__textContent');
  if (!textLayer) return fallback;

  const spanHeights = Array.from(textLayer.querySelectorAll('span'))
    .map((node) => (node as HTMLElement).getBoundingClientRect().height)
    .filter((height) => Number.isFinite(height) && height > 0.5);

  const base = median(spanHeights);
  return base > 0 ? base : fallback;
};

export const createHighlightRects = (range: Range, pageNode: HTMLElement | null): PdfHighlightRect[] => {
  if (!pageNode) return [];
  const pageRect = pageNode.getBoundingClientRect();
  if (pageRect.width === 0 || pageRect.height === 0) return [];

  const rawRects = Array.from(range.getClientRects())
    .map((rect) => {
      const left = clamp(rect.left - pageRect.left, 0, pageRect.width);
      const right = clamp(rect.right - pageRect.left, 0, pageRect.width);
      const top = clamp(rect.top - pageRect.top, 0, pageRect.height);
      const bottom = clamp(rect.bottom - pageRect.top, 0, pageRect.height);

      return {
        left,
        right,
        top,
        bottom,
        width: right - left,
        height: bottom - top
      };
    })
    .filter((rect) => rect.width > 0.5 && rect.height > 0.5);

  if (rawRects.length === 0) return [];

  const fallbackHeight = median(rawRects.map((rect) => rect.height));
  const referenceHeight = Math.max(1, resolveReferenceLineHeight(pageNode, fallbackHeight || 12));
  const lineThreshold = Math.max(2, referenceHeight * 0.65);
  const mergeGap = Math.max(2, referenceHeight * 0.4);

  const orderedRects = [...rawRects].sort((left, right) => {
    const leftCenter = left.top + left.height / 2;
    const rightCenter = right.top + right.height / 2;
    if (Math.abs(leftCenter - rightCenter) > lineThreshold) return leftCenter - rightCenter;
    return left.left - right.left;
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
    const lineRects = [...line.rects].sort((left, right) => left.left - right.left);
    if (lineRects.length === 0) return;

    const centers = lineRects.map((rect) => rect.top + rect.height / 2);
    const lineCenter = median(centers);
    const lineHeight = referenceHeight;
    const lineTop = clamp(lineCenter - lineHeight / 2, 0, Math.max(0, pageRect.height - lineHeight));

    let currentLeft = lineRects[0].left;
    let currentRight = lineRects[0].right;

    for (let index = 1; index < lineRects.length; index += 1) {
      const next = lineRects[index];
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

const intersectHighlightRects = (source: PdfHighlightRect[], clips: PdfHighlightRect[]): PdfHighlightRect[] => {
  const intersections: PdfHighlightRect[] = [];

  source.forEach((left) => {
    clips.forEach((right) => {
      const x1 = Math.max(left.leftPct, right.leftPct);
      const x2 = Math.min(left.leftPct + left.widthPct, right.leftPct + right.widthPct);
      const y1 = Math.max(left.topPct, right.topPct);
      const y2 = Math.min(left.topPct + left.heightPct, right.topPct + right.heightPct);

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

const constrainRangeToStableEnd = (range: Range): Range => range;

type BuildSelectionSegmentsInput = {
  range: Range;
  pane: HTMLElement | null;
  resolvePageLabel: (pageNumber: number) => string;
};

export const buildSelectionSegmentsFromRange = ({
  range,
  pane,
  resolvePageLabel
}: BuildSelectionSegmentsInput): SelectionSegment[] => {
  if (!pane) return [];

  const pageNodes = Array.from(pane.querySelectorAll('[data-reader-page-number]')) as HTMLElement[];
  const segments: SelectionSegment[] = [];

  pageNodes.forEach((pageNode) => {
    const pageNumber = Number.parseInt(pageNode.getAttribute('data-reader-page-number') || '', 10);
    if (!Number.isFinite(pageNumber) || pageNumber <= 0) return;

    const textLayer = pageNode.querySelector('.react-pdf__Page__textContent');
    if (!textLayer) return;

    try {
      if (!range.intersectsNode(textLayer)) return;
    } catch {
      return;
    }

    const layerRange = document.createRange();
    layerRange.selectNodeContents(textLayer);

    const segmentRange = document.createRange();
    segmentRange.selectNodeContents(textLayer);

    if (range.compareBoundaryPoints(Range.START_TO_START, layerRange) > 0) {
      segmentRange.setStart(range.startContainer, range.startOffset);
    }
    if (range.compareBoundaryPoints(Range.END_TO_END, layerRange) < 0) {
      segmentRange.setEnd(range.endContainer, range.endOffset);
    }

    const text = normalizeSelectionText(segmentRange.toString());
    if (!text) return;

    segments.push({
      range: segmentRange,
      text,
      pageNumber,
      pageIndex: pageNumber - 1,
      pageLabel: resolvePageLabel(pageNumber)
    });
  });

  return segments.sort((left, right) => left.pageNumber - right.pageNumber);
};

type GetSelectionPayloadInput = {
  pane: HTMLElement | null;
  resolvePageLabel: (pageNumber: number) => string;
};

export const getSelectionPayload = ({ pane, resolvePageLabel }: GetSelectionPayloadInput): SelectionPayload | null => {
  if (typeof window === 'undefined') return null;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const baseRange = selection.getRangeAt(0).cloneRange();
  const startElement = toElement(baseRange.startContainer);
  const endElement = toElement(baseRange.endContainer);
  const startLayer = startElement?.closest('.react-pdf__Page__textContent');
  const endLayer = endElement?.closest('.react-pdf__Page__textContent');
  const textLayer = (startLayer || endLayer) as HTMLElement | null;

  if (!textLayer) return null;
  if (!pane?.contains(textLayer)) return null;

  const range = constrainRangeToStableEnd(baseRange);
  const segments = buildSelectionSegmentsFromRange({ range, pane, resolvePageLabel });
  if (segments.length === 0) return null;

  const text = normalizeSelectionText(segments.map((segment) => segment.text).join(' '));
  if (!text) return null;

  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  const pageLabel = segments.length > 1 ? `${firstSegment.pageLabel}-${lastSegment.pageLabel}` : firstSegment.pageLabel;

  return {
    selection,
    range,
    text,
    pageNumber: firstSegment.pageNumber,
    pageIndex: firstSegment.pageIndex,
    pageLabel,
    segments
  };
};

type ResolveUnderlineCitationFromPointInput = {
  pageNumber: number;
  clientX: number;
  clientY: number;
  pageContainerRefs: PageContainerMap;
  highlights: PdfRectHighlight[];
  tolerancePx?: number;
};

export const resolveUnderlineCitationFromPoint = ({
  pageNumber,
  clientX,
  clientY,
  pageContainerRefs,
  highlights,
  tolerancePx = UNDERLINE_DRAG_HIT_TOLERANCE_PX
}: ResolveUnderlineCitationFromPointInput): string | null => {
  const pageNode = pageContainerRefs[pageNumber];
  if (!pageNode) return null;

  const rect = pageNode.getBoundingClientRect();
  const pageIndex = pageNumber - 1;
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const width = rect.width;
  const height = rect.height;

  for (const item of highlights) {
    if (item.pageIndex !== pageIndex) continue;
    if ((item.kind || 'underline') !== 'underline') continue;
    if (!item.citationId) continue;

    for (const hitRect of item.rects) {
      const left = hitRect.leftPct * width;
      const top = hitRect.topPct * height;
      const right = left + hitRect.widthPct * width;
      const bottom = top + hitRect.heightPct * height;

      if (
        localX >= left - tolerancePx &&
        localX <= right + tolerancePx &&
        localY >= top - tolerancePx &&
        localY <= bottom + tolerancePx
      ) {
        return item.citationId;
      }
    }
  }

  return null;
};

export const constrainRectsToCitationUnderlines = ({
  rects,
  citationId,
  pageIndex,
  highlights
}: {
  rects: PdfHighlightRect[];
  citationId: string | null;
  pageIndex: number;
  highlights: PdfRectHighlight[];
}): PdfHighlightRect[] => {
  if (!citationId || rects.length === 0) return rects;

  const underlineRects = highlights
    .filter((item) => item.pageIndex === pageIndex && (item.kind || 'underline') === 'underline' && item.citationId === citationId)
    .flatMap((item) => item.rects);

  if (underlineRects.length === 0) return [];
  return intersectHighlightRects(rects, underlineRects);
};

export const buildSelectionPreview = ({
  payload,
  pageContainerRefs,
  draggingCitationId,
  highlights
}: {
  payload: SelectionPayload;
  pageContainerRefs: PageContainerMap;
  draggingCitationId: string | null;
  highlights: PdfRectHighlight[];
}): SelectionPreview[] =>
  payload.segments
    .map((segment) => {
      const pageNode = pageContainerRefs[segment.pageNumber] || null;
      const basePreviewRects = createHighlightRects(segment.range, pageNode);
      const rects = draggingCitationId
        ? constrainRectsToCitationUnderlines({
            rects: basePreviewRects,
            citationId: draggingCitationId,
            pageIndex: segment.pageIndex,
            highlights
          })
        : basePreviewRects;

      return rects.length > 0 ? { pageIndex: segment.pageIndex, rects } : null;
    })
    .filter((segment): segment is SelectionPreview => Boolean(segment));

type UsePdfSelectionParams = {
  pageContainerRefs: MutableRefObject<PageContainerMap>;
  pdfPaneRef: RefObject<HTMLElement | null>;
  highlights: PdfRectHighlight[];
  resolvePageLabel: (pageNumber: number) => string;
};

export const usePdfSelection = ({
  pageContainerRefs,
  pdfPaneRef,
  highlights,
  resolvePageLabel
}: UsePdfSelectionParams) => {
  const getLiveSelectionPayload = useCallback(
    () => getSelectionPayload({ pane: pdfPaneRef.current, resolvePageLabel }),
    [pdfPaneRef, resolvePageLabel]
  );

  const resolveUnderlineHit = useCallback(
    (pageNumber: number, clientX: number, clientY: number) =>
      resolveUnderlineCitationFromPoint({
        pageNumber,
        clientX,
        clientY,
        pageContainerRefs: pageContainerRefs.current,
        highlights
      }),
    [highlights, pageContainerRefs]
  );

  const constrainPreviewRects = useCallback(
    (rects: PdfHighlightRect[], citationId: string | null, pageIndex: number) =>
      constrainRectsToCitationUnderlines({
        rects,
        citationId,
        pageIndex,
        highlights
      }),
    [highlights]
  );

  const getSelectionPreview = useCallback(
    (payload: SelectionPayload, draggingCitationId: string | null) =>
      buildSelectionPreview({
        payload,
        pageContainerRefs: pageContainerRefs.current,
        draggingCitationId,
        highlights
      }),
    [highlights, pageContainerRefs]
  );

  return {
    getLiveSelectionPayload,
    resolveUnderlineHit,
    constrainPreviewRects,
    getSelectionPreview
  };
};
