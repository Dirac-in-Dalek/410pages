export interface Note {
  id: string;
  content: string;
  createdAt: number;
}

export interface Highlight {
  id: string;
  start: number;  // 시작 인덱스
  end: number;    // 끝 인덱스 (exclusive)
  color?: string; // 선택적 색상 (기본: yellow)
}

export interface Citation {
  id: string;
  text: string;
  authorId?: string;
  author: string; // If empty, treated as "Self"
  authorSortIndex?: number | null;
  isSelf?: boolean;
  bookId?: string;
  book: string;
  bookSortIndex?: number | null;
  page?: string;      // Changed from number to string to support "30-31"
  pageSort?: number;  // Added for numeric sorting (e.g., 30)
  notes: Note[];
  tags: string[];
  highlights?: Highlight[];
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  sortIndex?: number | null;
  citationIds: string[]; // References to citations
}

export type SidebarItem = {
  id: string;
  label: string;
  type: 'author' | 'book' | 'root';
  children?: SidebarItem[];
  data?: {
    authorId?: string;
    author: string;
    bookId?: string;
    book?: string;
  };
};
