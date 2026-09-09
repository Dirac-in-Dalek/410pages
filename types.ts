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

export type CitationKind = 'sentence';

export interface Citation {
  id: string;
  kind: CitationKind;
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
  saveStatus?: 'saving' | 'failed';
  /** Runtime-only link used to move UI state from a temporary citation id after persistence. */
  optimisticOriginId?: string;
}

export type AddCitationInput = Omit<
  Citation,
  'id' | 'createdAt' | 'notes' | 'saveStatus' | 'optimisticOriginId'
> & { id?: string };
export type AddCitationResult = { ok: true; citationId: string } | { ok: false; error: unknown };
export type BulkSourceUpdateResult = { ok: true; updatedCount: number } | { ok: false; error: unknown };

export interface BookSource {
  id: string;
  title: string;
  memo?: string;
  sortIndex: number | null;
  createdAt: number;
  authorId: string;
  author: string;
  authorSortIndex: number | null;
  isSelf: boolean;
}

export interface AuthorSource {
  id: string;
  name: string;
  sortIndex: number | null;
  createdAt: number;
  isSelf: boolean;
}

export interface AuthorFolder {
  id: string;
  name: string;
  sortIndex: number;
  createdAt: number;
}

export interface AuthorFolderMembership {
  authorId: string;
  folderId: string;
  createdAt: number;
}

export interface DeleteAuthorCascadeResult {
  authorId: string;
  deletedBookIds: string[];
  deletedBookCount: number;
  deletedCitationCount: number;
}

export interface AuthorDeletePreview {
  authorId: string;
  bookIds: string[];
  bookCount: number;
  citationCount: number;
}

export interface DeleteBookCascadeResult {
  bookId: string;
  deletedCitationCount: number;
}

export interface BookDeletePreview {
  bookId: string;
  citationCount: number;
}

export type CreateBookInput = {
  authorId: string;
  title: string;
};

export interface ChapterBlock {
  id: string;
  bookId: string;
  label: string;
  pageSort?: number;
  createdAtSort: number;
  createdAt: number;
}

export type BookViewItem =
  | { type: 'citation'; id: string; citation: Citation; pageSort?: number; createdAtSort: number }
  | { type: 'chapter_block'; id: string; block: ChapterBlock; pageSort?: number; createdAtSort: number };

export interface CreateChapterBlockInput {
  bookId: string;
  label: string;
  pageSort?: number;
  createdAtSort: number;
}

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
  type: 'author' | 'book' | 'root' | 'author_folder';
  children?: SidebarItem[];
  data?: {
    authorId?: string;
    author: string;
    bookId?: string;
    book?: string;
    folderId?: string;
  };
};

export interface PdfReaderMeta {
  bookId?: string;
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

export interface ReaderVirtualRange {
  start: number;
  end: number;
}
