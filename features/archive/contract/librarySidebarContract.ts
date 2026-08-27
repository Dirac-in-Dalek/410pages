import type { AuthorDeletePreview, BookSource, Citation, DeleteAuthorCascadeResult, SidebarItem } from '../../../types';
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

export interface LibrarySidebarTreeContract {
  treeData: SidebarItem[];
  onTreeItemClick: (item: SidebarItem) => void;
  selectedFilter?: LibrarySelectedFilter;
  onReorderBookAt?: (author: string, dragBook: string, dropIndex: number) => void;
  onRenameAuthor?: (authorId: string, name: string) => boolean | void | Promise<boolean | void>;
  books?: BookSource[];
  citations?: Citation[];
  onRenameAuthorFolder?: (folderId: string, name: string) => boolean | void | Promise<boolean | void>;
  onDeleteAuthorFolder?: (folderId: string) => boolean | void | Promise<boolean | void>;
  onMoveAuthorToFolder?: (authorId: string, folderId: string) => boolean | void | Promise<boolean | void>;
  onRemoveAuthorFromFolder?: (authorId: string) => boolean | void | Promise<boolean | void>;
  onDeleteAuthor?: (authorId: string) => Promise<DeleteAuthorCascadeResult | undefined>;
  onPreviewAuthorDelete?: (authorId: string) => Promise<AuthorDeletePreview | undefined>;
  onRenameBook?: (bookId: string, name: string) => boolean | void | Promise<boolean | void>;
}
