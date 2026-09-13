import type { BookComposerDraftStore } from '../logic/bookComposerDrafts';
import { AddCitationInput } from '../../../types';

export type CitationEditorValues = {
  text: string;
  author: string;
  book: string;
  bookId?: string;
  page: string;
};

export type CitationEditorPrefill = {
  author: string;
  book: string;
  bookId?: string;
};

export type CitationEditorSubmitResult = { ok?: boolean } | void | unknown;

export interface CitationEditorProps {
  onAddCitation: (citation: AddCitationInput) => void | Promise<unknown>;
  prefillData?: CitationEditorPrefill;
  username: string;
  controlledValues?: Partial<CitationEditorValues>;
  readOnly?: boolean;
  hideSubmit?: boolean;
  placeholder?: string;
  sequentialPageEntry?: boolean;
  autoFocusText?: boolean;
  hideSourceFields?: boolean;
  chapterMode?: boolean;
  onChapterModeChange?: (enabled: boolean) => void;
  onHierarchyKey?: (direction: 'in' | 'out') => void;
  insertionLabel?: string;
  onCancelInsertion?: () => void;
  focusRequest?: number;
  draftScope?: string;
  draftStore?: BookComposerDraftStore;

}

export type CitationEntryDropPayload = {
  type?: string;
  author?: string;
  book?: string;
  bookId?: string;
};
