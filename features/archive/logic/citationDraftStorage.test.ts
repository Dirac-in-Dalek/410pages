import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Citation } from '../../../types';
import {
  getCitationDraftStorageKey,
  readCitationDrafts,
  removeCitationDraft,
  storeCitationDraft,
} from './citationDraftStorage';

const draft: Citation = {
  id: '018f47a2-8594-7c09-a488-2f73384e4711',
  kind: 'sentence',
  text: '새로고침 뒤에도 남아야 하는 문장',
  author: '저자',
  book: '책',
  bookId: 'book-1',
  page: '14',
  notes: [],
  tags: [],
  createdAt: 100,
  saveStatus: 'saving',
};

describe('citation draft storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('restores a legacy word draft as a citation without losing its id or text', () => {
    localStorage.setItem(getCitationDraftStorageKey('user-a'), JSON.stringify([{ ...draft, kind: 'word', text: '고독' }]));
    expect(readCitationDrafts('user-a')).toEqual([expect.objectContaining({ id: draft.id, kind: 'sentence', text: '고독', page: '14', bookId: 'book-1', saveStatus: 'failed' })]);
  });

  it('isolates drafts by account while preserving their book id', () => {
    expect(storeCitationDraft('user-a', draft)).toBe(true);

    expect(readCitationDrafts('user-a')).toEqual([
      expect.objectContaining({ id: draft.id, bookId: 'book-1', saveStatus: 'failed' }),
    ]);
    expect(readCitationDrafts('user-b')).toEqual([]);
    expect(window.localStorage.getItem(getCitationDraftStorageKey('user-b'))).toBeNull();
  });

  it('updates a draft in place and removes it after persistence', () => {
    storeCitationDraft('user-a', draft);
    storeCitationDraft('user-a', { ...draft, text: '수정한 문장', saveStatus: 'failed' });

    expect(readCitationDrafts('user-a')).toHaveLength(1);
    expect(readCitationDrafts('user-a')[0].text).toBe('수정한 문장');

    expect(removeCitationDraft('user-a', draft.id)).toBe(true);
    expect(readCitationDrafts('user-a')).toEqual([]);
    expect(window.localStorage.getItem(getCitationDraftStorageKey('user-a'))).toBeNull();
  });

  it('keeps the runtime flow alive when localStorage rejects a write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota exceeded');
    });

    expect(storeCitationDraft('user-a', draft)).toBe(false);
  });
});
