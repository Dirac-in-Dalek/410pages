import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PersistedReaderSession } from '../contract/pdfReaderContract';
import {
  clearPdfReaderSession,
  getPdfReaderRuntimeUrl,
  getPdfReaderSessionStorageKey,
  hasPdfReaderSession,
  persistPdfReaderSession,
  readPdfReaderSession,
  removePdfReaderCitationHighlights,
  setPdfReaderRuntimeUrl,
  updatePdfReaderBook,
} from './pdfReaderSession';

const session: PersistedReaderSession = {
  pdfName: 'private.pdf',
  currentPage: 4,
  pageLabels: null,
  meta: { bookId: 'book-1', author: 'Author', title: 'Book' },
  highlights: [],
  draftSelection: null,
  scrollTop: 120,
};

describe('pdfReaderSession', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    clearPdfReaderSession('user-a');
    clearPdfReaderSession('user-b');
  });

  it('isolates runtime and persisted sessions by user ID', () => {
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    setPdfReaderRuntimeUrl('user-a', 'blob:user-a');

    expect(persistPdfReaderSession('user-a', session)).toBe(true);
    expect(hasPdfReaderSession('user-a')).toBe(true);
    expect(hasPdfReaderSession('user-b')).toBe(false);
    expect(readPdfReaderSession('user-a')?.pdfName).toBe('private.pdf');
    expect(readPdfReaderSession('user-a')?.meta.bookId).toBe('book-1');
    expect(readPdfReaderSession('user-b')).toBeNull();
    expect(window.localStorage.getItem(getPdfReaderSessionStorageKey('user-b'))).toBeNull();

    clearPdfReaderSession('user-b');
    expect(getPdfReaderRuntimeUrl('user-a')).toBe('blob:user-a');

    clearPdfReaderSession('user-a');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:user-a');
    expect(hasPdfReaderSession('user-a')).toBe(false);
    expect(window.localStorage.getItem(getPdfReaderSessionStorageKey('user-a'))).toBeNull();
  });

  it('ignores persisted metadata when the PDF blob is no longer resumable', () => {
    window.localStorage.setItem(
      getPdfReaderSessionStorageKey('user-a'),
      JSON.stringify(session)
    );

    expect(hasPdfReaderSession('user-a')).toBe(false);
    expect(readPdfReaderSession('user-a')).toBeNull();
  });

  it('does not let an unmount write restore a session cleared during logout', () => {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    setPdfReaderRuntimeUrl('user-a', 'blob:user-a');
    persistPdfReaderSession('user-a', session);

    clearPdfReaderSession('user-a');

    expect(persistPdfReaderSession('user-a', session)).toBe(false);
    expect(window.localStorage.getItem(getPdfReaderSessionStorageKey('user-a'))).toBeNull();

    setPdfReaderRuntimeUrl('user-a', 'blob:user-a-next');
    expect(persistPdfReaderSession('user-a', session)).toBe(true);
  });

  it('keeps the active PDF attached to the canonical book after a rename or merge', () => {
    setPdfReaderRuntimeUrl('user-a', 'blob:user-a');
    persistPdfReaderSession('user-a', session);

    expect(updatePdfReaderBook('user-a', 'book-1', {
      bookId: 'book-2',
      author: 'Merged Author',
      title: 'Merged Book',
    })).toBe(true);
    expect(readPdfReaderSession('user-a')?.meta).toMatchObject({
      bookId: 'book-2',
      author: 'Merged Author',
      title: 'Merged Book',
    });
  });

  it('does not rewrite an unrelated or inactive PDF session', () => {
    setPdfReaderRuntimeUrl('user-a', 'blob:user-a');
    persistPdfReaderSession('user-a', session);

    expect(updatePdfReaderBook('user-a', 'another-book', {
      bookId: 'book-2',
      author: 'Other Author',
      title: 'Other Book',
    })).toBe(false);
    expect(readPdfReaderSession('user-a')?.meta.bookId).toBe('book-1');
    expect(updatePdfReaderBook('user-b', 'book-1', {
      bookId: 'book-2',
      author: 'Other Author',
      title: 'Other Book',
    })).toBe(false);
  });

  it('removes only highlights attached to citations deleted while the reader is closed', () => {
    setPdfReaderRuntimeUrl('user-a', 'blob:user-a');
    persistPdfReaderSession('user-a', {
      ...session,
      highlights: [
        { id: 'deleted', citationId: 'citation-deleted', pageIndex: 0, rects: [], createdAt: 1 },
        { id: 'kept', citationId: 'citation-kept', pageIndex: 1, rects: [], createdAt: 2 },
        { id: 'unlinked', pageIndex: 2, rects: [], createdAt: 3 },
      ],
    });

    expect(removePdfReaderCitationHighlights('user-a', ['citation-deleted'])).toBe(true);
    expect(readPdfReaderSession('user-a')?.highlights.map((highlight) => highlight.id)).toEqual([
      'kept',
      'unlinked',
    ]);
  });

  it('contains localStorage failures', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(() => persistPdfReaderSession('user-a', session)).not.toThrow();
    expect(persistPdfReaderSession('user-a', session)).toBe(false);
    expect(() => clearPdfReaderSession('user-a')).not.toThrow();
    expect(clearPdfReaderSession('user-a')).toBe(false);
  });
});
