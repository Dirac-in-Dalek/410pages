import { AddCitationInput } from '../../../types';

export type CitationEditorValues = {
  text: string;
  author: string;
  book: string;
  page: string;
};

export type CitationEditorPrefill = {
  author: string;
  book: string;
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
}

export type CitationEntryDropPayload = {
  type?: string;
  author?: string;
  book?: string;
};
