import type {
  AddCitationInput,
  ChapterBlock,
  Citation,
  CreateBookInput,
  CreateChapterBlockInput,
  Project,
  SidebarItem,
} from '../../types';
import type { PdfReaderPageProps } from '../../features/reader/contract/pdfReaderContract';

export type AppViewMode = 'archive' | 'reader';

export type ArchiveSelectedFilter = {
  type: 'author' | 'book';
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
  editorPrefill?: { author: string; book: string };
  isBookView: boolean;
  sortField: 'date' | 'page';
  dateDirection: 'asc' | 'desc';
  pageDirection: 'asc' | 'desc';
  onAddCitation: (citation: AddCitationInput) => void | Promise<unknown>;
  onRetryCitationSave: (citationId: string) => void | Promise<unknown>;
  onDateSortClick: () => void;
  onPageSortClick: () => void;
  projects: Project[];
  citations: Citation[];
  selectedBookId: string | null;
  chapterBlocksByBook: Record<string, ChapterBlock[]>;
  dataLoading: boolean;
  authLoading: boolean;
  searchTerm: string;
  selectedProjectId: string | null;
  selectedIds: Set<string>;
  selectedFilter: ArchiveSelectedFilter;
  isCopying: boolean;
  isBatchDeleteOpen: boolean;
  onSelectAll: () => void;
  onCopy: () => void | Promise<unknown>;
  onBatchDeleteRequest: () => void;
  onBatchDeleteConfirm: () => void;
  onBatchDeleteCancel: () => void;
  onCancelSelection: () => void;
  onAddToProject: (projectId: string) => void | Promise<unknown>;
  onCreateAndAddToProject: (name: string) => void | Promise<unknown>;
  onCreateChapterBlock?: (input: CreateChapterBlockInput) => Promise<unknown> | unknown;
  onDeleteChapterBlock?: (bookId: string, blockId: string) => Promise<unknown> | unknown;
  onToggleSelect: (id: string, selected: boolean) => void;
  onAddNote: (citationId: string, content: string) => void | Promise<unknown>;
  onUpdateNote: (citationId: string, noteId: string, content: string) => void;
  onDeleteNote: (citationId: string, noteId: string) => void;
  onDeleteCitation: (id: string) => void;
  onUpdateCitation: (id: string, data: Partial<Citation>) => void | Promise<unknown>;
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
  onCreateProject: (name: string) => void;
  onCreateBook: (input: CreateBookInput) => Promise<unknown> | unknown;
  treeData: SidebarItem[];
  onTreeItemClick: (item: SidebarItem) => void;
  username: string;
  avatarUrl: string | null;
  onSignOut: () => void;
  searchTerm: string;
  selectedFilter: ArchiveSelectedFilter;
  onSearch: (term: string) => void;
  onOpenSettings: () => void;
}

export interface MainLayoutFactoryInput {
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onDropCitationToProject: (projectId: string, citationId: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameAuthor: (authorId: string, name: string) => void;
  onRenameBook: (bookId: string, name: string) => void;
  onCreateBook: (input: CreateBookInput) => Promise<unknown> | unknown;
  onReorderProjects: (dragIndex: number, hoverIndex: number) => void;
  treeData: SidebarItem[];
  onTreeItemClick: (item: SidebarItem) => void;
  username: string;
  avatarUrl: string | null;
  onUpdateUsername: (name: string) => void | Promise<unknown>;
  onSignOut: () => void;
  searchTerm: string;
  selectedFilter: ArchiveSelectedFilter;
  onSearch: (term: string) => void;
  onReorderBookAt: (author: string, dragBook: string, dropIndex: number) => void;
  onOpenReader: () => void;
  onOpenSettings: () => void;
}
