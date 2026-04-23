import type {
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
} from '../../../types';

export type MetaFormState = {
  author: string;
  title: string;
  pdfStartPage: string;
  bookStartPage: string;
};

export type SelectionSegment = {
  range: Range;
  text: string;
  pageNumber: number;
  pageIndex: number;
  pageLabel: string;
};

export type SelectionPayload = {
  selection?: Selection;
  range: Range;
  text: string;
  pageNumber: number;
  pageIndex: number;
  pageLabel: string;
  segments: SelectionSegment[];
};

export type SelectionPreview = {
  pageIndex: number;
  rects: PdfHighlightRect[];
};

export type SelectionPreviewKind = 'underline' | 'highlight';

export type PersistedReaderSession = {
  pdfName: string;
  currentPage: number;
  pageLabels: string[] | null;
  meta: PdfReaderMeta;
  highlights: PdfRectHighlight[];
  draftSelection: PdfDraftSelection | null;
  scrollTop: number;
};

export type ReaderCitationSelectionRange = {
  start: number;
  end: number;
};

export type PageContainerMap = Record<number, HTMLDivElement | null>;
export type PageRatioMap = Record<number, number>;

export type ReaderSessionSnapshot = {
  pdfUrl: string | null;
  pdfName: string;
  currentPage: number;
  pageLabels: string[] | null;
  meta: PdfReaderMeta;
  highlights: PdfRectHighlight[];
  draftSelection: PdfDraftSelection | null;
  scrollTop: number;
};

export type ReaderDocumentMatchInput = {
  citations: Citation[];
  meta: PdfReaderMeta;
  isMetaConfirmed: boolean;
};

export type ReaderViewportWindow = {
  currentPage: number;
  visibleRange: ReaderVirtualRange;
};

export interface PdfReaderPageProps {
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
  onBulkUpdateCitationSource: (
    citationIds: string[],
    source: CitationSourceInput
  ) => Promise<BulkSourceUpdateResult>;
}

declare global {
  type AddCitationInput = import('../../../types').AddCitationInput;
  type PdfHighlightRect = import('../../../types').PdfHighlightRect;
}
