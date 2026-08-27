import type { Dispatch, SetStateAction } from 'react';
import { AuthorFolder, AuthorFolderMembership, AuthorSource, BookSource, Citation, Project, SidebarItem } from '../../../types';

export type FilterState =
  | {
      type: 'author';
      authorId: string;
      value: string;
    }
  | {
      type: 'book';
      bookId: string;
      authorId: string;
      value: string;
      author: string;
    };

export type SortField = 'date' | 'page';
export type SortDirection = 'asc' | 'desc';

export interface EditorPrefill {
  author: string;
  book: string;
  bookId?: string;
}

export interface OrderedLabelItem {
  id: string;
  label: string;
  sortIndex?: number | null;
}

export interface ArchiveViewStateInput {
  citations: Citation[];
  authors?: AuthorSource[];
  authorFolders?: AuthorFolder[];
  authorFolderMemberships?: AuthorFolderMembership[];
  books: BookSource[];
  projects: Project[];
  username: string;
}

export interface ArchiveViewStateResult {
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  filter: FilterState | null;
  selectedProjectId: string | null;
  selectedBookId: string | null;
  selectedAuthorId: string | null;
  isHomeView: boolean;
  editorPrefill: EditorPrefill | undefined;
  sortField: SortField;
  dateDirection: SortDirection;
  pageDirection: SortDirection;
  isBookView: boolean;
  isAuthorView: boolean;
  handleDateSortClick: () => void;
  handlePageSortClick: () => void;
  handleProjectSelect: (id: string | null) => void;
  handleHomeSelect: () => void;
  handleTreeItemClick: (item: SidebarItem) => void;
  handleAuthorSourceSelect: (author: AuthorSource) => void;
  handleBookSourceSelect: (book: BookSource) => void;
  treeData: SidebarItem[];
  filteredCitations: Citation[];
  viewTitle: string;
  getCurrentOrderedBooks: (authorId: string) => string[];
  setBookOrderByAuthor: Dispatch<SetStateAction<Record<string, string[]>>>;
}
