import type {
  AddCitationInput,
  AuthorDeletePreview,
  BookSource,
  ChapterBlock,
  Citation,
  CreateChapterBlockInput,
  DeleteAuthorCascadeResult,
  Project,
  SidebarItem,
} from '../../types';
import type { ReactNode } from 'react';
import type { PdfReaderPageProps } from '../../features/reader/contract/pdfReaderContract';

export type AppViewMode = 'archive' | 'reader';

export type ArchiveSelectedFilter = {
  type: 'author' | 'book';
  authorId?: string;
  bookId?: string;
  value: string;
  author?: string;
} | null;

export interface UseAppViewModeOptions {
  isMobileApp: boolean;
  initialViewMode?: AppViewMode;
}

export interface UseAppViewModeResult {
  viewMode: AppViewMode;
  isReaderVisible: boolean;
  openArchive: () => void;
  openReader: () => void;
  setViewMode: (nextViewMode: AppViewMode) => void;
}

export interface ArchiveScreenFactoryInput {
  isMobileApp: boolean;
  title: string;
  username: string;
  editorPrefill?: { author: string; book: string; bookId?: string };
  isBookView: boolean;
  onBackToAuthor?: () => void;
  authorName?: string;
  sortField: 'date' | 'page';
  dateDirection: 'asc' | 'desc';
  pageDirection: 'asc' | 'desc';
  onAddCitation: (citation: AddCitationInput) => void | Promise<unknown>;
  onRetryCitationSave: (citationId: string) => void | Promise<unknown>;
  onDateSortClick: () => void;
  onPageSortClick: () => void;
  projects: Project[];
  citations: Citation[];
  allCitations: Citation[];
  selectedBookId: string | null;
  chapterBlocksByBook: Record<string, ChapterBlock[]>;
  dataLoading: boolean;
  loadError: string | null;
  onRetryLoad: () => void | Promise<void>;
  authLoading: boolean;
  searchTerm: string;
  selectedProjectId: string | null;
  selectedIds: Set<string>;
  selectedFilter: ArchiveSelectedFilter;
  isCopying: boolean;
  onSelectAll: () => void;
  onCopy: () => void | Promise<unknown>;
  onBatchDeleteRequest: () => void;
  onCancelSelection: () => void;
  onAddToProject: (projectId: string) => void | Promise<unknown>;
  onCreateAndAddToProject: (name: string) => boolean | void | Promise<boolean | void>;
  onCreateChapterBlock?: (input: CreateChapterBlockInput) => Promise<unknown> | unknown;
  onDeleteChapterBlock?: (bookId: string, blockId: string) => Promise<unknown> | unknown;
  chapterActionsDisabled?: boolean;
  onToggleSelect: (id: string, selected: boolean) => void;
  onAddNote: (citationId: string, content: string) => void | Promise<unknown>;
  onUpdateNote: (citationId: string, noteId: string, content: string) => void;
  onDeleteNote: (citationId: string, noteId: string) => void;
  onDeleteCitation: (id: string) => void;
  onUpdateCitation: (id: string, data: Partial<Citation>) => void | Promise<unknown>;
  passageNoteCitationId?: string | null;
  onPassageNoteCitationChange?: (citationId: string | null) => void;
}

export interface ReaderScreenFactoryInput extends Omit<PdfReaderPageProps, 'loading'> {
  dataLoading: boolean;
  authLoading: boolean;
}

export interface MobileLayoutFactoryInput {
  title: string;
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onCreateProject: (name: string) => boolean | void | Promise<boolean | void>;
  books: BookSource[];
  citations: Citation[];
  isHomeView: boolean;
  selectedBookId: string | null;
  onHomeSelect: () => void;
  onBookSelect: (book: BookSource) => void;
  treeData: SidebarItem[];
  onTreeItemClick: (item: SidebarItem) => void;
  authorFolderLoading: boolean;
  authorFolderLoadError: string | null;
  onRetryAuthorFolders: () => void | Promise<void>;
  onCreateAuthorFolder: (name: string) => boolean | void | Promise<boolean | void>;
  onRenameAuthorFolder: (folderId: string, name: string) => boolean | void | Promise<boolean | void>;
  onDeleteAuthorFolder: (folderId: string) => boolean | void | Promise<boolean | void>;
  onMoveAuthorToFolder: (authorId: string, folderId: string) => boolean | void | Promise<boolean | void>;
  onRemoveAuthorFromFolder: (authorId: string) => boolean | void | Promise<boolean | void>;
  onRenameAuthor: (authorId: string, name: string) => boolean | void | Promise<boolean | void>;
  onDeleteAuthor: (authorId: string) => Promise<DeleteAuthorCascadeResult | undefined>;
  onPreviewAuthorDelete: (authorId: string) => Promise<AuthorDeletePreview | undefined>;
  username: string;
  avatarUrl: string | null;
  onSignOut: () => void;
  searchTerm: string;
  selectedFilter: ArchiveSelectedFilter;
  onSearch: (term: string) => void;
  onOpenSettings: () => void;
  showBookMemoAction?: boolean;
  onOpenBookMemo?: () => void;
}

export interface MainLayoutFactoryInput {
  onCloseInlinePassageNotes?: () => void;
  onRightPanelOpenChange?: (open: boolean) => void;
  hasInlinePassageNotes?: boolean;
  homePanelOpen?: boolean;
  onHomePanelOpenChange?: (open: boolean) => void;
  leftPanel?: ReactNode;
  rightPanel?: ReactNode;
  rightPanelOpen?: boolean;
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onDropCitationToProject: (projectId: string, citationId: string) => void;
  onCreateProject: (name: string) => boolean | void | Promise<boolean | void>;
  onRenameProject: (id: string, name: string) => boolean | void | Promise<boolean | void>;
  onDeleteProject: (id: string) => void;
  onRenameAuthor: (authorId: string, name: string) => boolean | void | Promise<boolean | void>;
  onRenameBook: (bookId: string, name: string) => boolean | void | Promise<boolean | void>;
  books: BookSource[];
  citations: Citation[];
  isHomeView: boolean;
  selectedBookId: string | null;
  onHomeSelect: () => void;
  onBookSelect: (book: BookSource) => void;
  onReorderProjects: (dragIndex: number, hoverIndex: number) => void;
  treeData: SidebarItem[];
  onTreeItemClick: (item: SidebarItem) => void;
  authorFolderLoading: boolean;
  authorFolderLoadError: string | null;
  onRetryAuthorFolders: () => void | Promise<void>;
  onCreateAuthorFolder: (name: string) => boolean | void | Promise<boolean | void>;
  onRenameAuthorFolder: (folderId: string, name: string) => boolean | void | Promise<boolean | void>;
  onDeleteAuthorFolder: (folderId: string) => boolean | void | Promise<boolean | void>;
  onMoveAuthorToFolder: (authorId: string, folderId: string) => boolean | void | Promise<boolean | void>;
  onRemoveAuthorFromFolder: (authorId: string) => boolean | void | Promise<boolean | void>;
  onDeleteAuthor: (authorId: string) => Promise<DeleteAuthorCascadeResult | undefined>;
  onPreviewAuthorDelete: (authorId: string) => Promise<AuthorDeletePreview | undefined>;
  avatarUrl: string | null;
  searchTerm: string;
  selectedFilter: ArchiveSelectedFilter;
  onSearch: (term: string) => void;
  onReorderBookAt: (author: string, dragBook: string, dropIndex: number) => void;
  onReorderAuthorAt: (groupAuthorIds: string[], dragAuthorId: string, dropIndex: number) => void;
  libraryOrderSaving: boolean;
  onOpenSettings: () => void;
}
