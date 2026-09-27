import { describe, expect, it } from 'vitest';
import { resolveBookInsertion } from './bookInsertion';
import { sortBookViewItems, toBookViewItems } from '../../../lib/bookViewItems';
import { createOptimisticCitation, createOptimisticCitationEditPatch, createRetryCitationInput } from './optimisticCitation';
import { readCitationDrafts, storeCitationDraft } from './citationDraftStorage';
import { compareBookPositions, legacyOrderKey } from '../../../lib/bookOrder';

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
  it('handles root/unclassified, beginning, default tail and deleted anchors', () => {
    expect(resolveBookInsertion(items, { afterId: null, depth: 0 })?.parent).toBeUndefined();
    const tail = resolveBookInsertion(items, { depth: 0 })?.position;
    expect(typeof tail).toBe('string');
    expect(compareBookPositions(tail!, 90)).toBeGreaterThan(0);
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

it('inserts between adjacent floats without exhausting the numeric gap', () => {
  const left = 1_800_000_000_000;
  const right = left + Number.EPSILON * left / 2;
  const adjacentItems = toBookViewItems([
    { id: 'left', kind: 'sentence', text: 'l', author: 'a', book: 'b', notes: [], tags: [], createdAt: left },
    { id: 'right', kind: 'sentence', text: 'r', author: 'a', book: 'b', notes: [], tags: [], createdAt: right },
  ], []);
  const result = resolveBookInsertion(adjacentItems, { afterId: 'left', depth: 0 });
  expect(result).not.toBeNull();
  expect(compareBookPositions(left, result!.position)).toBeLessThan(0);
  expect(compareBookPositions(result!.position, right)).toBeLessThan(0);
});

it('rejects exact legacy ties so migration can resolve their ambiguous order', () => {
  const tied = toBookViewItems([
    { id: 'left', kind: 'sentence', text: 'l', author: 'a', book: 'b', notes: [], tags: [], createdAt: 10 },
    { id: 'right', kind: 'sentence', text: 'r', author: 'a', book: 'b', notes: [], tags: [], createdAt: 10 },
  ], []);
  expect(resolveBookInsertion(tied, { afterId: 'left', depth: 0 })).toBeNull();
});

it('uses string positions to retain the deepest preceding chapter owner', () => {
  const rootKey = legacyOrderKey(10);
  const childKey = legacyOrderKey(20);
  const quoteKey = legacyOrderKey(30);
  const keyedChapters = [
    { id: 'root-key', bookId: 'book', label: 'root', depth: 0, createdAtSort: -1, orderKey: rootKey, createdAt: 0 },
    { id: 'child-key', bookId: 'book', label: 'child', depth: 1, createdAtSort: -2, orderKey: childKey, createdAt: 0 },
  ];
  const keyedCitation = { id: 'quote-key', kind: 'sentence' as const, text: 'q', author: 'a', book: 'b', notes: [], tags: [], createdAt: -3, orderKey: quoteKey };
  const keyedItems = sortBookViewItems(toBookViewItems([keyedCitation], keyedChapters), 'date', 'asc');
  const result = resolveBookInsertion(keyedItems, { afterId: 'quote-key', depth: 2 });
  expect(result?.parent?.id).toBe('child-key');
  expect(result?.previousDepth).toBe(1);
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
