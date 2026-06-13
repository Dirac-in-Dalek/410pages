import type { Dispatch, SetStateAction } from 'react';
import type {
  AddCitationInput,
  AddCitationResult,
  BookSource,
  BulkSourceUpdateResult,
  ChapterBlock,
  Citation,
  CreateBookInput,
  CitationSourceInput,
  CreateChapterBlockInput,
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
  fetchData: () => Promise<void>;
  handleLoadChapterBlocks: (bookId: string) => Promise<void>;
};

export type ArchiveMutationController = {
  handleAddCitation: (data: AddCitationInput) => Promise<AddCitationResult>;
  handleAddCitationOptimistic: (data: AddCitationInput) => Promise<AddCitationResult>;
  handleRetryCitationSave: (citationId: string) => Promise<void>;
  handleAddNote: (citationId: string, content: string) => Promise<void>;
  handleUpdateNote: (citationId: string, noteId: string, content: string) => Promise<void>;
  handleDeleteNote: (citationId: string, noteId: string) => Promise<void>;
  handleDeleteCitation: (id: string) => Promise<void>;
  handleUpdateCitation: (id: string, data: Partial<Citation>) => Promise<void>;
  handleBulkUpdateCitationSource: (
    citationIds: string[],
    source: CitationSourceInput
  ) => Promise<BulkSourceUpdateResult>;
  handleCreateBook: (input: CreateBookInput) => Promise<BookSource | undefined>;
  handleCreateProject: (name: string) => Promise<void>;
  handleRenameProject: (id: string, name: string) => Promise<void>;
  handleDeleteProject: (id: string) => Promise<void>;
  handleRenameAuthor: (authorId: string, name: string) => Promise<void>;
  handleRenameBook: (bookId: string, name: string) => Promise<void>;
  handleDeleteAuthor: (authorId: string) => Promise<void>;
  handleDeleteBook: (bookId: string) => Promise<void>;
  handleCreateChapterBlock: (input: CreateChapterBlockInput) => Promise<ChapterBlock | undefined>;
  handleDeleteChapterBlock: (bookId: string, blockId: string) => Promise<void>;
  handleReorderProjects: (dragIndex: number, dropIndex: number) => Promise<void>;
  handleDropCitationToProject: (projectId: string, citationId: string) => Promise<void>;
};

export type ArchiveDataController = ArchiveQueryController &
  ArchiveMutationController & {
    projects: Project[];
    setProjects: Dispatch<SetStateAction<Project[]>>;
    citations: Citation[];
    setCitations: Dispatch<SetStateAction<Citation[]>>;
    books: BookSource[];
    setBooks: Dispatch<SetStateAction<BookSource[]>>;
    chapterBlocksByBook: ChapterBlocksByBook;
  };
