import { MutableRefObject, useCallback } from 'react';
import type { ReaderVirtualRange } from '../../../types';
import type { PageContainerMap, PageRatioMap, ReaderViewportWindow } from '../contract/pdfReaderContract';

export const VIRTUAL_OVERSCAN_PAGES = 6;
export const DEFAULT_PAGE_RATIO = 1.41;
export const PAGE_VERTICAL_GAP = 20;

export const getEstimatedPdfPageHeight = ({
  pageNumber,
  pageWidth,
  pageRatios
}: {
  pageNumber: number;
  pageWidth: number | undefined;
  pageRatios: PageRatioMap;
}) => {
  const ratio = pageRatios[pageNumber] || pageRatios[1] || DEFAULT_PAGE_RATIO;
  const width = pageWidth || 900;
  return Math.max(320, Math.round(width * ratio));
};

export const computeReaderViewWindow = ({
  scrollTop,
  clientHeight,
  numPages,
  pageWidth,
  pageContainerRefs,
  pageRatios
}: {
  scrollTop: number;
  clientHeight: number;
  numPages: number;
  pageWidth: number | undefined;
  pageContainerRefs: PageContainerMap;
  pageRatios: PageRatioMap;
}): ReaderViewportWindow => {
  if (numPages <= 0) {
    return {
      currentPage: 1,
      visibleRange: { start: 1, end: 8 }
    };
  }

  const viewportBottom = scrollTop + clientHeight;
  const viewportAnchor = scrollTop + clientHeight * 0.35;

  let currentPage = 1;
  let minDistance = Number.POSITIVE_INFINITY;

  const overscanPx = clientHeight * 1.1;
  let virtualStart = 1;
  let virtualEnd = numPages;
  let started = false;
  let fallbackTop = 0;

  for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
    const node = pageContainerRefs[pageNumber];
    const estimatedHeight =
      getEstimatedPdfPageHeight({
        pageNumber,
        pageWidth,
        pageRatios
      }) + PAGE_VERTICAL_GAP;
    const top = node ? node.offsetTop : fallbackTop;
    const height = node ? Math.max(node.offsetHeight, estimatedHeight) : estimatedHeight;
    const bottom = top + height;
    const center = top + height / 2;

    fallbackTop = bottom;

    const distance = Math.abs(center - viewportAnchor);
    if (distance < minDistance) {
      minDistance = distance;
      currentPage = pageNumber;
    }

    if (!started && bottom >= scrollTop - overscanPx) {
      virtualStart = Math.max(1, pageNumber - VIRTUAL_OVERSCAN_PAGES);
      started = true;
    }

    if (top <= viewportBottom + overscanPx) {
      virtualEnd = Math.min(numPages, pageNumber + VIRTUAL_OVERSCAN_PAGES);
    }
  }

  return {
    currentPage,
    visibleRange: {
      start: virtualStart,
      end: virtualEnd
    }
  };
};

export const computeReaderScrollTarget = ({
  pageNumber,
  numPages,
  pageWidth,
  pageContainerRefs,
  pageRatios
}: {
  pageNumber: number;
  numPages: number;
  pageWidth: number | undefined;
  pageContainerRefs: PageContainerMap;
  pageRatios: PageRatioMap;
}) => {
  if (pageNumber < 1 || pageNumber > numPages) return null;

  const node = pageContainerRefs[pageNumber];
  if (node) return Math.max(0, node.offsetTop - 8);

  let fallbackTop = 0;
  for (let page = 1; page < pageNumber; page += 1) {
    fallbackTop +=
      getEstimatedPdfPageHeight({
        pageNumber: page,
        pageWidth,
        pageRatios
      }) + PAGE_VERTICAL_GAP;
  }

  return fallbackTop;
};

type UsePdfViewportParams = {
  numPages: number;
  pageWidth: number | undefined;
  pageContainerRefs: MutableRefObject<PageContainerMap>;
  pageRatiosRef: MutableRefObject<PageRatioMap>;
};

export const usePdfViewport = ({ numPages, pageWidth, pageContainerRefs, pageRatiosRef }: UsePdfViewportParams) => {
  const getEstimatedPageHeight = useCallback(
    (pageNumber: number) =>
      getEstimatedPdfPageHeight({
        pageNumber,
        pageWidth,
        pageRatios: pageRatiosRef.current
      }),
    [pageRatiosRef, pageWidth]
  );

  const computeViewWindow = useCallback(
    (scrollTop: number, clientHeight: number) =>
      computeReaderViewWindow({
        scrollTop,
        clientHeight,
        numPages,
        pageWidth,
        pageContainerRefs: pageContainerRefs.current,
        pageRatios: pageRatiosRef.current
      }),
    [numPages, pageContainerRefs, pageRatiosRef, pageWidth]
  );

  const computeScrollTarget = useCallback(
    (pageNumber: number) =>
      computeReaderScrollTarget({
        pageNumber,
        numPages,
        pageWidth,
        pageContainerRefs: pageContainerRefs.current,
        pageRatios: pageRatiosRef.current
      }),
    [numPages, pageContainerRefs, pageRatiosRef, pageWidth]
  );

  const buildVisibleRange = useCallback(
    (currentPage: number): ReaderVirtualRange => ({
      start: Math.max(1, currentPage - VIRTUAL_OVERSCAN_PAGES),
      end: Math.min(numPages, currentPage + VIRTUAL_OVERSCAN_PAGES)
    }),
    [numPages]
  );

  return {
    getEstimatedPageHeight,
    computeViewWindow,
    computeScrollTarget,
    buildVisibleRange
  };
};
