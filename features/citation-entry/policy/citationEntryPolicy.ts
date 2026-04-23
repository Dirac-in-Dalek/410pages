import { CitationEditorSubmitResult, CitationEditorValues } from '../contract/citationEntryContract';

export const CITATION_ENTRY_EMPTY_TEXTAREA_HEIGHT = 72;

export const isCitationEntrySelfAuthor = (author: string, username: string) =>
  !author.trim() || author.trim() === username;

export const isCitationEntrySequentialMode = (
  sequentialPageEntry: boolean,
  readOnly: boolean,
  values: Pick<CitationEditorValues, 'author' | 'book'>
) => sequentialPageEntry && !readOnly && Boolean(values.author.trim()) && Boolean(values.book.trim());

export const canSubmitCitationEntry = ({
  readOnly,
  isSubmitting,
  text,
}: {
  readOnly: boolean;
  isSubmitting: boolean;
  text: string;
}) => !readOnly && !isSubmitting && Boolean(text.trim());

export const didCitationEntrySubmitFail = (result: CitationEditorSubmitResult) =>
  Boolean(result && typeof result === 'object' && 'ok' in (result as Record<string, unknown>) && (result as { ok?: boolean }).ok === false);

export const resolveCitationEntryTextareaHeight = (scrollHeight: number, text: string) =>
  text.trim().length > 0 ? Math.min(scrollHeight, 400) : CITATION_ENTRY_EMPTY_TEXTAREA_HEIGHT;
