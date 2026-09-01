import type { AuthorDeletePreview, BookSource, Citation, DeleteAuthorCascadeResult, Project, SidebarItem } from '../../../types';
import type { LibrarySelectedFilter } from '../../../shared/lib/libraryTree';

export type ProjectDropIndicator = {
  projectId: string;
  position: 'before' | 'after';
  dropIndex: number;
};

export interface ProjectSidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onDropCitationToProject: (projectId: string, citationId: string) => void;
  onCreateProject: (name: string) => boolean | void | Promise<boolean | void>;
  onRenameProject: (id: string, name: string) => boolean | void | Promise<boolean | void>;
  onDeleteProject: (id: string) => void;
  onReorderProjects: (dragIndex: number, hoverIndex: number) => void;
  books: BookSource[];
  citations: Citation[];
  treeData: SidebarItem[];
  selectedBookId: string | null;
  selectedFilter: LibrarySelectedFilter;
  isHomeView: boolean;
  onHomeSelect: () => void;
  onBookSelect: (book: BookSource) => void;
  onTreeItemClick: (item: SidebarItem) => void;
  authorFolderLoading: boolean;
  authorFolderLoadError: string | null;
  onRetryAuthorFolders: () => void | Promise<void>;
  onRenameAuthor?: (authorId: string, name: string) => boolean | void | Promise<boolean | void>;
  onCreateAuthorFolder: (name: string) => boolean | void | Promise<boolean | void>;
  onRenameAuthorFolder: (folderId: string, name: string) => boolean | void | Promise<boolean | void>;
  onDeleteAuthorFolder: (folderId: string) => boolean | void | Promise<boolean | void>;
  onMoveAuthorToFolder: (authorId: string, folderId: string) => boolean | void | Promise<boolean | void>;
  onRemoveAuthorFromFolder: (authorId: string) => boolean | void | Promise<boolean | void>;
  onDeleteAuthor: (authorId: string) => Promise<DeleteAuthorCascadeResult | undefined>;
  onPreviewAuthorDelete: (authorId: string) => Promise<AuthorDeletePreview | undefined>;
  onRenameBook?: (bookId: string, name: string) => boolean | void | Promise<boolean | void>;
  onReorderBookAt?: (author: string, dragBook: string, dropIndex: number) => void;
  onReorderAuthorAt?: (groupAuthorIds: string[], dragAuthorId: string, dropIndex: number) => void;
  libraryOrderSaving?: boolean;
  width: number;
  isResizing: boolean;
  onStartResize: () => void;
}
