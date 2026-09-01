import type { AddCitationInput, ChapterBlock, Citation, CreateChapterBlockInput, Project } from '../../../types';

export interface ArchiveHeaderProps {
    title: string;
    showEditor: boolean;
    username: string;
    editorPrefill?: { author: string; book: string; bookId?: string };
    isBookView?: boolean;
    onBackToAuthor?: () => void;
    authorName?: string;
    onAddCitation: (data: AddCitationInput) => void | Promise<unknown>;
    sortField: 'date' | 'page';
    dateDirection: 'asc' | 'desc';
    pageDirection: 'asc' | 'desc';
    onDateSortClick: () => void;
    onPageSortClick: () => void;
}

export interface CitationListProps {
    citations: Citation[];
    allCitations?: Citation[];
    projects: Project[];
    username: string;
    loading: boolean;
    searchTerm: string;
    selectedIds: Set<string>;
    selectedFilter?: { type: 'author' | 'book'; authorId?: string; bookId?: string; value: string; author?: string } | null;
    onToggleSelect: (id: string, selected: boolean) => void;
    onAddNote: (citationId: string, content: string) => void;
    onUpdateNote: (citationId: string, noteId: string, content: string) => void;
    onDeleteNote: (citationId: string, noteId: string) => void;
    onDeleteCitation: (id: string) => void;
    onUpdateCitation: (id: string, data: Partial<Citation>) => void;
    onRetryCitationSave: (citationId: string) => void | Promise<unknown>;
    chapterBlocks?: ChapterBlock[];
    isBookView?: boolean;
    sortField?: 'date' | 'page';
    dateDirection?: 'asc' | 'desc';
    pageDirection?: 'asc' | 'desc';
    onCreateChapterBlock?: (input: CreateChapterBlockInput) => Promise<unknown> | unknown;
    onDeleteChapterBlock?: (bookId: string, blockId: string) => Promise<unknown> | unknown;
    chapterActionsDisabled?: boolean;
    passageNoteCitationId?: string | null;
    onPassageNoteCitationChange?: (citationId: string | null) => void;
}
