import { Citation } from '../../../types';

export interface CitationCardProps {
  citation: Citation;
  index: number;
  username: string;
  selectedFilter?: { type: 'author' | 'book'; value: string; author?: string } | null;
  projectNames?: string[];
  showDetailActions?: boolean;
  isTextExpanded?: boolean;
  onTextExpandedChange?: (id: string, isExpanded: boolean) => void;
  onTextOverflowChange?: (id: string, isOverflowing: boolean) => void;
  isSelected: boolean;
  onToggleSelect: (id: string, selected: boolean) => void;
  onAddNote: (citationId: string, content: string) => boolean | void | Promise<boolean | void>;
  onUpdateNote: (citationId: string, noteId: string, content: string) => boolean | void | Promise<boolean | void>;
  onDeleteNote: (citationId: string, noteId: string) => boolean | void | Promise<boolean | void>;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Citation>) => boolean | void | Promise<boolean | void>;
  onRetrySave: (id: string) => void | Promise<unknown>;
}
