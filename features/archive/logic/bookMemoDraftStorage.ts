import type { TextFormatRange } from '../../../types';
import { normalizeTextFormats } from '../../../shared/logic/textFormats';
const PREFIX = 'book-memo-draft.v1';
export const BOOK_MEMO_DRAFT_MERGED_EVENT = 'book-memo-draft-merged';

const keyFor = (userId: string, bookId: string) =>
  `${PREFIX}:${encodeURIComponent(userId)}:${encodeURIComponent(bookId)}`;

export const readBookMemoDraftContent = (userId: string, bookId: string): { text: string; formats: TextFormatRange[] } | null => {
  try {
    const raw = localStorage.getItem(`${keyFor(userId, bookId)}:rich.v2`);
    if (raw !== null) {
      const value = JSON.parse(raw);
      if (typeof value.text === 'string') return { text: value.text, formats: normalizeTextFormats(value.formats, value.text.length) };
    }
    const text = localStorage.getItem(keyFor(userId, bookId));
    return text === null ? null : { text, formats: [] };
  } catch { return null; }
};

export const readBookMemoDraft = (userId: string, bookId: string) => readBookMemoDraftContent(userId, bookId)?.text ?? null;

export const storeBookMemoDraft = (userId: string, bookId: string, text: string, formats: TextFormatRange[] = []) => {
  try {
    // One atomic storage value prevents text and selection offsets becoming separated.
    localStorage.setItem(`${keyFor(userId, bookId)}:rich.v2`, JSON.stringify({ text, formats: normalizeTextFormats(formats, text.length) }));
    return true;
  } catch { return false; }
};

export const removeBookMemoDraft = (userId: string, bookId: string) => {
  try {
    localStorage.removeItem(keyFor(userId, bookId));
    localStorage.removeItem(`${keyFor(userId, bookId)}:rich.v2`);
    return true;
  } catch { return false; }
};

export const mergeBookMemoFormats = (target: string, source: string, targetFormats: TextFormatRange[] = [], sourceFormats: TextFormatRange[] = []) => {
  if (!target.trim()) return normalizeTextFormats(sourceFormats, source.length);
  if (!source.trim() || target.trim() === source.trim()) return normalizeTextFormats(targetFormats, target.length);
  const shift = target.length + '\n\n---\n\n'.length;
  return [...normalizeTextFormats(targetFormats, target.length), ...normalizeTextFormats(sourceFormats, source.length).map(range => ({ ...range, start: range.start + shift, end: range.end + shift }))];
};

export const mergeBookMemoText = (targetMemo: string, sourceMemo: string) => {
  if (!targetMemo.trim()) return sourceMemo;
  if (!sourceMemo.trim()) return targetMemo;
  if (targetMemo.trim() === sourceMemo.trim()) return targetMemo;
  return `${targetMemo}\n\n---\n\n${sourceMemo}`;
};

export const moveBookMemoDraftAfterMerge = (
  userId: string,
  sourceBookId: string,
  targetBookId: string,
  targetMemo: string,
  sourceMemo: string,
  targetFormats: TextFormatRange[] = [],
  sourceFormats: TextFormatRange[] = []
) => {
  if (sourceBookId === targetBookId) return true;
  const sourceDraft = readBookMemoDraftContent(userId, sourceBookId);
  const targetDraft = readBookMemoDraftContent(userId, targetBookId);
  if (sourceDraft === null && targetDraft === null) return true;
  if (!storeBookMemoDraft(
    userId,
    targetBookId,
    mergeBookMemoText(targetDraft?.text ?? targetMemo, sourceDraft?.text ?? sourceMemo),
    mergeBookMemoFormats(targetDraft?.text ?? targetMemo, sourceDraft?.text ?? sourceMemo, targetDraft?.formats ?? targetFormats, sourceDraft?.formats ?? sourceFormats)
  )) return false;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BOOK_MEMO_DRAFT_MERGED_EVENT, {
      detail: { userId, bookId: targetBookId },
    }));
  }
  return sourceDraft === null || removeBookMemoDraft(userId, sourceBookId);
};
