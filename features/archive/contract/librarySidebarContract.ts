import type { CreateBookInput, SidebarItem } from '../../../types';
import type { LibrarySelectedFilter } from '../../../shared/lib/libraryTree';

export type { LibrarySelectedFilter } from '../../../shared/lib/libraryTree';

export type LibraryTreeItemType = 'author' | 'book';

export interface LibraryTreeDragMeta {
  type: 'library-tree';
  itemType: LibraryTreeItemType;
  id: string;
  authorId?: string;
}

export interface LibraryTreeDropIndicator {
  itemId: string;
  position: 'before' | 'after';
  dropIndex: number;
  listType: LibraryTreeItemType;
  parentAuthor?: string;
}

export interface LibraryTreeListMeta {
  items: SidebarItem[];
  listType: LibraryTreeItemType;
  parentAuthor?: string;
}

export interface LibraryTreeRowMeta {
  index: number;
  listType: LibraryTreeItemType;
  parentAuthor?: string;
}

export interface LibrarySidebarProps {
  treeData: SidebarItem[];
  onTreeItemClick: (item: SidebarItem) => void;
  onProjectSelect: (projectId: string | null) => void;
  selectedProjectId: string | null;
  onSearch?: (term: string) => void;
  searchTerm?: string;
  selectedFilter?: LibrarySelectedFilter;
  onCreateBook?: (input: CreateBookInput) => Promise<unknown> | unknown;
  onReorderBookAt?: (author: string, dragBook: string, dropIndex: number) => void;
  onRenameAuthor?: (authorId: string, name: string) => void;
  onRenameBook?: (bookId: string, name: string) => void;
  onDeleteAuthor?: (authorId: string) => void;
  onDeleteBook?: (bookId: string) => void;
  width: number;
  isResizing: boolean;
  onStartResize: () => void;
}
