import type {
  AddCitationInput,
  AddCitationResult,
  AuthorDeletePreview,
  AuthorFolder,
  AuthorFolderMembership,
  AuthorSource,
  BookDeletePreview,
  BookSource,
  BulkSourceUpdateResult,
  ChapterBlock,
  Citation,
  CreateBookInput,
  CitationSourceInput,
  CreateChapterBlockInput,
  DeleteAuthorCascadeResult,
  DeleteBookCascadeResult,
  Project,
} from '../../../types';

export type ArchiveSession = {
  user: {
    id: string;
  };
} | null;

export type ChapterBlocksByBook = Record<string, ChapterBlock[]>;

export type RenameAuthorBookMerge = {
  fromBookId: string;
  toBookId: string;
  toBookTitle: string;
  toBookSortIndex: number | null;
};

export type RenameAuthorMutationResult = {
  merged: boolean;
  fromAuthorId: string;
  authorId: string;
  authorName: string;
  authorSortIndex: number | null;
  isSelf: boolean;
  folderId: string | null;
  bookMerges: RenameAuthorBookMerge[];
};

export type RenameBookMutationResult = {
  merged: boolean;
  fromBookId: string;
  bookId: string;
  bookTitle: string;
  bookSortIndex: number | null;
};

export type ArchiveQueryController = {
  loading: boolean;
  loadError: string | null;
  authorFolderLoading: boolean;
  authorFolderLoadError: string | null;
  chapterLoadError: string | null;
  chapterLoadingBookId: string | null;
  fetchData: () => Promise<void>;
  retryAuthorFolders: () => Promise<void>;
  invalidateDataLoad: () => void;
  handleLoadChapterBlocks: (bookId: string) => Promise<void>;
  refreshChapterBlocks: (bookId: string) => Promise<void>;
  cancelChapterBlockLoad: () => void;
};

export type ArchiveMutationController = {
  mutationError: string | null;
  clearMutationError: () => void;
  handleAddCitation: (data: AddCitationInput) => Promise<AddCitationResult>;
  handleAddCitationOptimistic: (data: AddCitationInput) => Promise<AddCitationResult>;
  handleRetryCitationSave: (citationId: string) => Promise<void>;
  resolveCitationId: (citationId: string) => Promise<string | null>;
  handleAddNote: (citationId: string, content: string) => Promise<boolean>;
  handleUpdateNote: (citationId: string, noteId: string, content: string) => Promise<boolean>;
  handleDeleteNote: (citationId: string, noteId: string) => Promise<boolean>;
  handleDeleteCitations: (ids: string[]) => Promise<boolean>;
  handleUpdateCitation: (id: string, data: Partial<Citation>) => Promise<boolean>;
  handleBulkUpdateCitationSource: (
    citationIds: string[],
    source: CitationSourceInput
  ) => Promise<BulkSourceUpdateResult>;
  handleCreateAuthor: (name: string) => Promise<AuthorSource | undefined>;
  handleCreateAuthorFolder: (name: string) => Promise<boolean>;
  handleRenameAuthorFolder: (folderId: string, name: string) => Promise<boolean>;
  handleDeleteAuthorFolder: (folderId: string) => Promise<boolean>;
  handleMoveAuthorToFolder: (authorId: string, folderId: string) => Promise<boolean>;
  handleRemoveAuthorFromFolder: (authorId: string) => Promise<boolean>;
  handleDeleteAuthorCascade: (authorId: string) => Promise<DeleteAuthorCascadeResult | undefined>;
  handlePreviewAuthorDeletion: (authorId: string) => Promise<AuthorDeletePreview | undefined>;
  handleDeleteBookCascade: (bookId: string) => Promise<DeleteBookCascadeResult | undefined>;
  handlePreviewBookDeletion: (bookId: string) => Promise<BookDeletePreview | undefined>;
  handleCreateBook: (input: CreateBookInput) => Promise<BookSource | undefined>;
  handleCreateProject: (name: string) => Promise<boolean>;
  handleRenameProject: (id: string, name: string) => Promise<boolean>;
  handleDeleteProject: (id: string) => Promise<boolean>;
  handleRenameAuthor: (authorId: string, name: string) => Promise<RenameAuthorMutationResult | undefined>;
  handleRenameBook: (bookId: string, name: string) => Promise<RenameBookMutationResult | undefined>;
  handleCreateChapterBlock: (input: CreateChapterBlockInput) => Promise<ChapterBlock | false>;
  handleDeleteChapterBlock: (bookId: string, blockId: string) => Promise<boolean>;
  handleReorderProjects: (dragIndex: number, dropIndex: number) => Promise<boolean>;
  handleDropCitationToProject: (projectId: string, citationId: string) => Promise<boolean>;
  handleAddCitationsToProject: (projectId: string, citationIds: string[]) => Promise<boolean>;
  handleCreateProjectWithCitations: (name: string, citationIds: string[]) => Promise<boolean>;
};

export type ArchiveDataController = ArchiveQueryController &
  ArchiveMutationController & {
    projects: Project[];
    citations: Citation[];
    authors: AuthorSource[];
    authorFolders: AuthorFolder[];
    authorFolderMemberships: AuthorFolderMembership[];
    books: BookSource[];
    chapterBlocksByBook: ChapterBlocksByBook;
  };
