import type { Dispatch, SetStateAction } from 'react';
import { Citation, Project, SidebarItem } from '../../../types';

export interface FilterState {
  type: 'author' | 'book';
  value: string;
  author?: string;
}

export type SortField = 'date' | 'page';
export type SortDirection = 'asc' | 'desc';

export interface EditorPrefill {
  author: string;
  book: string;
}

export interface OrderedLabelItem {
  id: string;
  label: string;
  sortIndex?: number | null;
}

export interface ArchiveViewStateInput {
  citations: Citation[];
  projects: Project[];
  username: string;
}

export interface ArchiveViewStateResult {
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  filter: FilterState | null;
  setFilter: Dispatch<SetStateAction<FilterState | null>>;
  selectedProjectId: string | null;
  setSelectedProjectId: Dispatch<SetStateAction<string | null>>;
  selectedBookId: string | null;
  editorPrefill: EditorPrefill | undefined;
  sortField: SortField;
  dateDirection: SortDirection;
  pageDirection: SortDirection;
  isBookView: boolean;
  handleDateSortClick: () => void;
  handlePageSortClick: () => void;
  handleProjectSelect: (id: string | null) => void;
  handleTreeItemClick: (item: SidebarItem) => void;
  treeData: SidebarItem[];
  filteredCitations: Citation[];
  viewTitle: string;
  getCurrentOrderedAuthors: () => string[];
  getCurrentOrderedBooks: (authorId: string) => string[];
  setAuthorOrder: Dispatch<SetStateAction<string[]>>;
  setBookOrderByAuthor: Dispatch<SetStateAction<Record<string, string[]>>>;
}
