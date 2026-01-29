export interface Note {
  id: string;
  content: string;
  createdAt: number;
}

export interface Citation {
  id: string;
  text: string;
  author: string; // If empty, treated as "Self"
  isSelf?: boolean;
  book: string;
  page?: number;
  notes: Note[];
  tags: string[];
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  citationIds: string[]; // References to citations
}

export interface DragSourceRef {
  type: 'reference';
  author: string;
  book?: string;
}

export interface DragSourceCitation {
  type: 'citation';
  id: string;
}

export type SidebarItem = {
  id: string;
  label: string;
  type: 'author' | 'book' | 'root';
  children?: SidebarItem[];
  data?: {
    author: string;
    book?: string;
  };
};