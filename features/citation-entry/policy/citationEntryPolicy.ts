import { CitationEditorSubmitResult, CitationEditorValues } from '../contract/citationEntryContract';

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
