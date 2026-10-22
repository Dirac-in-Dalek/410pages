import { expect, it } from 'vitest';
import { prepareCitationTextUpdate } from './citationEditing';
import {
  createOptimisticCitation,
  createOptimisticCitationEditPatch,
} from '../../features/archive/logic/optimisticCitation';

it('keeps formatting offsets equivalent for saved and optimistic edits', () => {
  const citation = createOptimisticCitation({
    kind: 'sentence',
    text: '기억할 문장',
    author: '',
    book: '',
    tags: [],
    textFormats: [{ start: 0, end: 3, bold: true, highlight: true }],
    highlights: [{ id: 'highlight', start: 0, end: 3 }],
  });
  const update = { text: '오래 기억할 문장', page: null };
  const saved = prepareCitationTextUpdate(citation, update);
  const optimistic = createOptimisticCitationEditPatch(citation, update);
  expect(saved.textFormats).toEqual([{ start: 3, end: 6, bold: true, highlight: true }]);
  expect(optimistic.textFormats).toEqual(saved.textFormats);
  expect(optimistic.highlights).toEqual(saved.highlights);
  expect(optimistic.page).toBeUndefined();
});

it('preserves explicitly supplied formatting, including removing every format', () => {
  const citation = { text: '문장', textFormats: [{ start: 0, end: 2, bold: true }] };
  const update = { text: '다른 문장', textFormats: [] };
  expect(prepareCitationTextUpdate(citation, update)).toBe(update);
});
