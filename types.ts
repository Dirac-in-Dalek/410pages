export interface Note {
  id: string;
  content: string;
  createdAt: number;
}

export interface Highlight {
  id: string;
  start: number;  // 시작 인덱스
  end: number;    // 끝 인덱스 (exclusive)
  color?: string; // 선택적 색상 (기본: yellow)
}

export interface Citation {
  id: string;
  text: string;
  authorId?: string;
  author: string; // If empty, treated as "Self"
  authorSortIndex?: number | null;
  isSelf?: boolean;
  bookId?: string;
  book: string;
  bookSortIndex?: number | null;
  page?: string;      // Changed from number to string to support "30-31"
  pageSort?: number;  // Added for numeric sorting (e.g., 30)
  notes: Note[];
  tags: string[];
  highlights?: Highlight[];
  createdAt: number;
}

export type AddCitationInput = Omit<Citation, 'id' | 'createdAt' | 'notes'>;
export type AddCitationResult = { ok: true; citationId: string } | { ok: false; error: unknown };
export type BulkSourceUpdateResult = { ok: true; updatedCount: number } | { ok: false; error: unknown };

export interface CitationSourceInput {
  author: string;
  book: string;
}

export interface Project {
  id: string;
  name: string;
  sortIndex?: number | null;
  citationIds: string[]; // References to citations
}

export type SidebarItem = {
  id: string;
  label: string;
  type: 'author' | 'book' | 'root';
  children?: SidebarItem[];
  data?: {
    authorId?: string;
    author: string;
    bookId?: string;
    book?: string;
  };
};

export interface PdfReaderMeta {
  author: string;
  title: string;
  pdfStartPage?: number;
  bookStartPage?: number;
}

export interface PdfDraftSelection {
  text: string;
  pageIndex: number;
  pageLabel: string;
}

export interface PdfHighlightRect {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

export interface PdfRectHighlight {
  id: string;
  citationId?: string;
  pageIndex: number;
  kind?: 'underline' | 'highlight';
  rects: PdfHighlightRect[];
  createdAt: number;
}

export interface ReaderPaneLayout {
  leftWidth: number;
  rightWidth: number;
  isLeftCollapsed: boolean;
}

export interface ReaderVirtualRange {
  start: number;
  end: number;
}
