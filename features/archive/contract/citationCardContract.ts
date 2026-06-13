import { Citation } from '../../../types';

export interface CitationCardProps {
  citation: Citation;
  index: number;
  username: string;
  selectedFilter?: { type: 'author' | 'book'; value: string; author?: string } | null;
  projectNames?: string[];
  isTextExpanded?: boolean;
  onTextExpandedChange?: (id: string, isExpanded: boolean) => void;
  onTextOverflowChange?: (id: string, isOverflowing: boolean) => void;
  isSelected: boolean;
  onToggleSelect: (id: string, selected: boolean) => void;
  onAddNote: (citationId: string, content: string) => void | Promise<unknown>;
  onUpdateNote: (citationId: string, noteId: string, content: string) => void;
  onDeleteNote: (citationId: string, noteId: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Citation>) => void | Promise<unknown>;
  onRetrySave: (id: string) => void | Promise<unknown>;
}
