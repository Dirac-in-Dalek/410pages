import { describe, expect, it } from 'vitest';
import { changeCitationInsertion, resolveBookInsertion } from './bookInsertion';
import { sortBookViewItems, toBookViewItems } from '../../../lib/bookViewItems';
import { createOptimisticCitation, createOptimisticCitationEditPatch, createRetryCitationInput } from './optimisticCitation';
import { readCitationDrafts, storeCitationDraft } from './citationDraftStorage';

const chapters = [
  { id: 'root', depth: 0, createdAtSort: 10 },
  { id: 'child', depth: 1, createdAtSort: 30 },
  { id: 'grandchild', depth: 2, createdAtSort: 50 },
  { id: 'sibling', depth: 1, createdAtSort: 70 },
  { id: 'next-root', depth: 0, createdAtSort: 90 },
].map(c => ({ ...c, bookId: 'book', label: c.id, createdAt: 0 }));
const citations = [20, 40, 60, 80].map(n => ({ id: `c${n}`, kind: 'sentence' as const, text: 'quote', author: 'a', book: 'b', bookId: 'book', tags: [], notes: [], createdAt: n, page: `${100 - n}` }));
const items = sortBookViewItems(toBookViewItems(citations, chapters), 'date', 'asc');

describe('book insertion', () => {
  it('moves the citation marker out to actual direct parent content and back into the child', () => {
    const from = { afterId: 'c60', depth: 2 };
    const out = changeCitationInsertion(items, from, 'out');
    expect(out.afterId).toBe('c40');
    expect(resolveBookInsertion(items, out)).toMatchObject({ position: 45, parent: { id: 'child' } });
    const back = changeCitationInsertion(items, out, 'in');
    expect(back.afterId).toBe('c60');
    expect(resolveBookInsertion(items, back)?.parent?.id).toBe('grandchild');
    expect(changeCitationInsertion(items, back, 'in')).toEqual(back);
  });
  it('handles root/unclassified, beginning, default tail and deleted anchors', () => {
    expect(changeCitationInsertion(items, { afterId: 'c20', depth: 0 }, 'out').afterId).toBeNull();
    expect(resolveBookInsertion(items, { afterId: null, depth: 0 })?.parent).toBeUndefined();
    expect(resolveBookInsertion(items, { depth: 0 })?.position).toBe(90.9);
    expect(resolveBookInsertion(items, { afterId: 'deleted', depth: 0 })).toBeNull();
  });
  it('retains explicit position and real page through optimistic save, local recovery and retry', () => {
    const draft = createOptimisticCitation({ text: 'New quote', author: 'a', book: 'b', bookId: 'book', page: '1', tags: [], kind: 'sentence', createdAtSort: 45 }, 999);
    expect(draft.createdAt).toBe(999);
    storeCitationDraft('insertion-test', draft);
    const recovered = readCitationDrafts('insertion-test')[0];
    expect(createRetryCitationInput(recovered)).toMatchObject({ createdAtSort: 45, page: '1' });
    const ordered = sortBookViewItems(toBookViewItems([...citations, recovered], chapters), 'date', 'asc');
    expect(ordered[ordered.findIndex(i => i.id === recovered.id) - 1].id).toBe('c40');
  });
});


it.each([{ author: 'Different Author' }, { book: 'Different Book' }])('clears old book position on failed source edit %s and keeps it cleared after recovery', change => {
  const original = createOptimisticCitation({ text: 'Keep text', author: 'a', book: 'b', bookId: 'book', page: '15', tags: [], kind: 'sentence', createdAtSort: 45 }, 999);
  const edited = { ...original, ...createOptimisticCitationEditPatch(original, change), saveStatus: 'failed' as const };
  storeCitationDraft('source-change-test', edited);
  const retry = createRetryCitationInput(readCitationDrafts('source-change-test').find(d => d.id === original.id)!);
  expect(retry.bookId).toBeUndefined();
  expect(retry.createdAtSort).toBeUndefined();
  expect(retry).toMatchObject({ text: 'Keep text', page: '15', ...change });
});
