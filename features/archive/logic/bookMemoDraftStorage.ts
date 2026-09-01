const PREFIX = 'book-memo-draft.v1';
export const BOOK_MEMO_DRAFT_MERGED_EVENT = 'book-memo-draft-merged';

const keyFor = (userId: string, bookId: string) =>
  `${PREFIX}:${encodeURIComponent(userId)}:${encodeURIComponent(bookId)}`;

export const readBookMemoDraft = (userId: string, bookId: string) => {
  try {
    return localStorage.getItem(keyFor(userId, bookId));
  } catch {
    return null;
  }
};

export const storeBookMemoDraft = (userId: string, bookId: string, memo: string) => {
  try {
    localStorage.setItem(keyFor(userId, bookId), memo);
    return true;
  } catch {
    return false;
  }
};

export const removeBookMemoDraft = (userId: string, bookId: string) => {
  try {
    localStorage.removeItem(keyFor(userId, bookId));
    return true;
  } catch {
    return false;
  }
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
  sourceMemo: string
) => {
  if (sourceBookId === targetBookId) return true;
  const sourceDraft = readBookMemoDraft(userId, sourceBookId);
  const targetDraft = readBookMemoDraft(userId, targetBookId);
  if (sourceDraft === null && targetDraft === null) return true;
  if (!storeBookMemoDraft(
    userId,
    targetBookId,
    mergeBookMemoText(targetDraft ?? targetMemo, sourceDraft ?? sourceMemo)
  )) return false;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BOOK_MEMO_DRAFT_MERGED_EVENT, {
      detail: { userId, bookId: targetBookId },
    }));
  }
  return sourceDraft === null || removeBookMemoDraft(userId, sourceBookId);
};
