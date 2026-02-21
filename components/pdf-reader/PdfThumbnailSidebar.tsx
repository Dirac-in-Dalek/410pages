import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, FileText, Pencil, Upload } from 'lucide-react';
import { Document, Page } from 'react-pdf';

interface PdfThumbnailSidebarProps {
  pdfUrl: string | null;
  pdfName: string;
  numPages: number;
  currentPage: number;
  collapsed: boolean;
  canEditMeta: boolean;
  onBack: () => void;
  onUploadPdf: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onEditMeta: () => void;
  onToggleCollapse: () => void;
  onJumpToPage: (pageNumber: number) => void;
  resolvePageLabel: (pageNumber: number) => string;
}

const THUMB_WIDTH = 114;
const ITEM_HEIGHT = 194;
const OVERSCAN_ITEMS = 4;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const PdfThumbnailSidebar: React.FC<PdfThumbnailSidebarProps> = ({
  pdfUrl,
  pdfName,
  numPages,
  currentPage,
  collapsed,
  canEditMeta,
  onBack,
  onUploadPdf,
  onEditMeta,
  onToggleCollapse,
  onJumpToPage,
  resolvePageLabel
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    if (collapsed || !listRef.current || numPages <= 0) return;

    const node = listRef.current;
    const targetTop = (currentPage - 1) * ITEM_HEIGHT;
    const targetBottom = targetTop + ITEM_HEIGHT;
    const viewTop = node.scrollTop;
    const viewBottom = viewTop + node.clientHeight;
    const safety = ITEM_HEIGHT * 0.5;

    if (targetTop < viewTop + safety || targetBottom > viewBottom - safety) {
      node.scrollTo({
        top: Math.max(0, targetTop - node.clientHeight * 0.4),
        behavior: 'smooth'
      });
    }
  }, [collapsed, currentPage, numPages]);

  useEffect(() => {
    const node = listRef.current;
    if (!node || collapsed) return;

    const updateViewportHeight = () => {
      setViewportHeight(node.clientHeight);
    };

    updateViewportHeight();
    const observer = new ResizeObserver(updateViewportHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [collapsed]);

  const { startPage, endPage, topSpacer, bottomSpacer } = useMemo(() => {
    if (numPages <= 0) {
      return { startPage: 1, endPage: 0, topSpacer: 0, bottomSpacer: 0 };
    }

    if (viewportHeight <= 0) {
      const initialEnd = Math.min(numPages, 12);
      return { startPage: 1, endPage: initialEnd, topSpacer: 0, bottomSpacer: (numPages - initialEnd) * ITEM_HEIGHT };
    }

    const rawStart = Math.floor(scrollTop / ITEM_HEIGHT) + 1 - OVERSCAN_ITEMS;
    const rawEnd = Math.ceil((scrollTop + viewportHeight) / ITEM_HEIGHT) + OVERSCAN_ITEMS;
    const startPage = clamp(rawStart, 1, numPages);
    const endPage = clamp(rawEnd, 1, numPages);

    return {
      startPage,
      endPage,
      topSpacer: (startPage - 1) * ITEM_HEIGHT,
      bottomSpacer: Math.max(0, (numPages - endPage) * ITEM_HEIGHT)
    };
  }, [numPages, scrollTop, viewportHeight]);

  const visiblePages = useMemo(
    () => (endPage >= startPage ? Array.from({ length: endPage - startPage + 1 }, (_, idx) => startPage + idx) : []),
    [endPage, startPage]
  );

  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center py-2 gap-2">
        <button
          onClick={onToggleCollapse}
          aria-label="Expand thumbnails"
          className="h-8 w-8 rounded-md border border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] flex items-center justify-center"
        >
          <ChevronRight size={14} />
        </button>
        <div className="mt-1 text-[10px] text-[var(--text-muted)] [writing-mode:vertical-rl] rotate-180 tracking-wide">PAGES</div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="px-3 py-3 border-b border-[var(--border-main)] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-[var(--text-main)] flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 6 L12 3 H18 V18 L13 21 H7 V6" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold truncate">410pages</h2>
          </div>
          <button
            onClick={onToggleCollapse}
            aria-label="Collapse thumbnails"
            className="h-7 w-7 rounded-md border border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] flex items-center justify-center"
          >
            <ChevronLeft size={13} />
          </button>
        </div>

        <button
          onClick={onBack}
          className="w-full inline-flex items-center justify-center gap-2 px-2.5 py-2 text-xs rounded-md border border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] transition-colors"
        >
          <ArrowLeft size={13} />
          Back to Archive
        </button>

        <label className="w-full inline-flex items-center justify-center gap-2 px-2.5 py-2 text-xs rounded-md border border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer">
          <Upload size={13} />
          Upload PDF
          <input type="file" accept="application/pdf" className="hidden" onChange={onUploadPdf} />
        </label>

        {canEditMeta && (
          <button
            onClick={onEditMeta}
            className="w-full inline-flex items-center justify-center gap-2 px-2.5 py-2 text-xs rounded-md border border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] transition-colors"
          >
            <Pencil size={13} />
            Edit Meta
          </button>
        )}

        {pdfName && <div className="text-[11px] text-[var(--text-muted)] truncate px-1">{pdfName}</div>}
      </div>

      <div className="h-10 px-3 border-b border-[var(--border-main)] flex items-center justify-between">
        <div className="text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">Pages</div>
        <div className="text-[11px] text-[var(--text-muted)]">{numPages > 0 ? `${currentPage}/${numPages}` : '-'}</div>
      </div>

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto p-2 bg-[var(--bg-main)]"
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        {!pdfUrl || numPages <= 0 ? (
          <div className="h-full rounded-lg border border-dashed border-[var(--border-main)] text-[var(--text-muted)] text-xs flex items-center justify-center p-3 text-center">
            PDF 업로드 후 썸네일이 표시됩니다.
          </div>
        ) : (
          <div>
            {topSpacer > 0 && <div style={{ height: `${topSpacer}px` }} />}
            <Document
              file={pdfUrl}
              loading={<div className="text-xs text-[var(--text-muted)] px-2 py-1">썸네일 준비 중...</div>}
              error={<div className="text-xs text-red-600 px-2 py-1">썸네일을 불러오지 못했습니다.</div>}
            >
              {visiblePages.map((pageNumber) => {
                const isActive = pageNumber === currentPage;
                return (
                  <button
                    key={`thumb-${pageNumber}`}
                    onClick={() => onJumpToPage(pageNumber)}
                    data-thumb-page={pageNumber}
                    className={`w-full mb-2.5 rounded-lg border p-2 transition-all ${
                      isActive
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-sm'
                        : 'border-[var(--border-main)] bg-[var(--bg-card)] hover:bg-[var(--sidebar-hover)]'
                    }`}
                  >
                    <div className="mx-auto w-[114px] min-h-[156px] rounded border border-[var(--border-main)] bg-white overflow-hidden flex items-center justify-center">
                      <Page
                        pageNumber={pageNumber}
                        width={THUMB_WIDTH}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                        loading={
                          <div className="h-[156px] w-full text-[11px] text-[var(--text-muted)] flex items-center justify-center">
                            <FileText size={14} />
                          </div>
                        }
                      />
                    </div>
                    <div className="mt-2 text-[11px] text-[var(--text-secondary)] leading-none">
                      PDF {pageNumber}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--text-muted)] leading-none">Book {resolvePageLabel(pageNumber)}</div>
                  </button>
                );
              })}
            </Document>
            {bottomSpacer > 0 && <div style={{ height: `${bottomSpacer}px` }} />}
          </div>
        )}
      </div>
    </div>
  );
};
