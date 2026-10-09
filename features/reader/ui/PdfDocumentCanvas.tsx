import React from 'react';
import { Document, Page } from 'react-pdf';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type { PdfRectHighlight, ReaderVirtualRange } from '../../../types';
import type { SelectionPreview, SelectionPreviewKind } from '../contract/pdfReaderContract';
type Props = {
  pdfUrl: string;
  numPages: number;
  visibleRange: ReaderVirtualRange;
  pageWidth?: number;
  highlights: PdfRectHighlight[];
  selectionPreview: SelectionPreview[];
  isPointerSelecting: boolean;
  selectionPreviewKind: SelectionPreviewKind;
  getEstimatedPageHeight: (page: number) => number;
  setPageContainerRef: (page: number, node: HTMLDivElement | null) => void;
  handleDocumentLoadSuccess: (pdf: PDFDocumentProxy) => void | Promise<void>;
  handlePageLoadSuccess: (
    page: PDFPageProxy & { originalWidth: number; originalHeight: number },
    pageNumber: number
  ) => void;
  setLoadError: (error: string) => void;
};
export function PdfDocumentCanvas({
  pdfUrl,
  numPages,
  visibleRange,
  pageWidth,
  highlights,
  selectionPreview,
  isPointerSelecting,
  selectionPreviewKind,
  getEstimatedPageHeight,
  setPageContainerRef,
  handleDocumentLoadSuccess,
  handlePageLoadSuccess,
  setLoadError,
}: Props) {
  return (
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
              style={{
                width: pageWidth ? `${pageWidth}px` : 'min(100%, 920px)',
                minHeight: `${estimatedHeight}px`,
              }}
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
                            height: `${rect.heightPct * 100}%`,
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
                            height: `${rect.heightPct * 100}%`,
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
                            height: `${rect.heightPct * 100}%`,
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
  );
}
