import type { PersistedReaderSession } from '../contract/pdfReaderContract';
import { readPersistedReaderSession } from '../policy/pdfReaderPolicy';

const READER_SESSION_STORAGE_PREFIX = 'pdfReaderSession.v1';
const readerRuntimeUrls = new Map<string, string>();
const clearedReaderSessionUserIds = new Set<string>();

export const getPdfReaderSessionStorageKey = (userId: string) =>
  `${READER_SESSION_STORAGE_PREFIX}:${userId}`;

export const getPdfReaderRuntimeUrl = (userId: string) =>
  readerRuntimeUrls.get(userId) ?? null;

export const setPdfReaderRuntimeUrl = (userId: string, pdfUrl: string | null) => {
  if (pdfUrl) {
    clearedReaderSessionUserIds.delete(userId);
    readerRuntimeUrls.set(userId, pdfUrl);
  } else {
    readerRuntimeUrls.delete(userId);
  }
};

export const hasPdfReaderSession = (userId: string) =>
  Boolean(getPdfReaderRuntimeUrl(userId));

export const readPdfReaderSession = (userId: string) =>
  getPdfReaderRuntimeUrl(userId)
    ? readPersistedReaderSession(getPdfReaderSessionStorageKey(userId))
    : null;

export const persistPdfReaderSession = (
  userId: string,
  session: PersistedReaderSession
) => {
  if (typeof window === 'undefined' || clearedReaderSessionUserIds.has(userId)) return false;
  try {
    window.localStorage.setItem(
      getPdfReaderSessionStorageKey(userId),
      JSON.stringify(session)
    );
    return true;
  } catch {
    return false;
  }
};

export const updatePdfReaderBook = (
  userId: string,
  fromBookId: string,
  book: Pick<PersistedReaderSession['meta'], 'bookId' | 'author' | 'title'>
) => {
  const session = readPdfReaderSession(userId);
  if (!session || session.meta.bookId !== fromBookId) return false;

  return persistPdfReaderSession(userId, {
    ...session,
    meta: { ...session.meta, ...book },
  });
};

export const removePdfReaderCitationHighlights = (
  userId: string,
  citationIds: string[]
) => {
  const session = readPdfReaderSession(userId);
  if (!session || citationIds.length === 0) return false;

  const deletedIds = new Set(citationIds);
  const highlights = session.highlights.filter(
    (highlight) => !highlight.citationId || !deletedIds.has(highlight.citationId)
  );
  if (highlights.length === session.highlights.length) return true;

  return persistPdfReaderSession(userId, { ...session, highlights });
};

export const removePersistedPdfReaderSession = (userId: string) => {
  if (typeof window === 'undefined') return true;
  try {
    window.localStorage.removeItem(getPdfReaderSessionStorageKey(userId));
    return true;
  } catch {
    return false;
  }
};

export const clearPdfReaderSession = (userId: string) => {
  clearedReaderSessionUserIds.add(userId);
  const pdfUrl = getPdfReaderRuntimeUrl(userId);
  if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  readerRuntimeUrls.delete(userId);

  return removePersistedPdfReaderSession(userId);
};
