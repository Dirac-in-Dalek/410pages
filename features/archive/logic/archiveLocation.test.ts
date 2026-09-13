import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useArchiveViewState } from './useArchiveViewState';
import type { AuthorSource, BookSource } from '../../../types';

const author: AuthorSource = { id: 'author-1', name: '저자', isSelf: false, createdAt: 1, sortIndex: 0 };
const book: BookSource = { id: 'book-1', title: '책', authorId: author.id, author: author.name, isSelf: false, createdAt: 1, sortIndex: 0, authorSortIndex: 0 };
const base = { ownerKey: 'reader-1', authors: [author], books: [book], citations: [], projects: [], username: '독자' };

beforeEach(() => window.history.replaceState(null, '', '/'));

describe('archive browser navigation', () => {
  it('waits for fetched data before restoring an exact book URL', async () => {
    window.history.replaceState(null, '', '/?book=book-1&author=author-1&keep=value');
    const { result, rerender } = renderHook(({ ready }) => useArchiveViewState({ ...base, books: ready ? [book] : [], authors: ready ? [author] : [], dataReady: ready }), { initialProps: { ready: false } });
    expect(window.location.search).toContain('book=book-1');
    rerender({ ready: true });
    await waitFor(() => expect(result.current.selectedBookId).toBe(book.id));
    expect(result.current.editorPrefill?.bookId).toBe(book.id);
    expect(window.location.search).toContain('keep=value');
  });

  it('restores author and book with browser back and forward', async () => {
    const { result } = renderHook(() => useArchiveViewState(base));
    act(() => result.current.handleAuthorSourceSelect(author));
    act(() => result.current.handleBookSourceSelect(book));
    expect(new URLSearchParams(window.location.search).get('book')).toBe(book.id);
    act(() => window.history.back());
    await waitFor(() => expect(result.current.isAuthorView).toBe(true));
    act(() => window.history.forward());
    await waitFor(() => expect(result.current.selectedBookId).toBe(book.id));
  });

  it('falls back to the author for a missing book and clears a previous account route', async () => {
    window.history.replaceState(null, '', '/?book=missing&author=author-1');
    const first = renderHook(() => useArchiveViewState(base));
    await waitFor(() => expect(first.result.current.isAuthorView).toBe(true));
    expect(window.location.search).not.toContain('book=');
    first.unmount();
    window.history.replaceState({ archiveOwner: 'another-reader' }, '', '/?book=book-1&author=author-1');
    const second = renderHook(() => useArchiveViewState(base));
    await waitFor(() => expect(second.result.current.isHomeView).toBe(true));
    expect(window.location.search).toBe('');
  });
});
