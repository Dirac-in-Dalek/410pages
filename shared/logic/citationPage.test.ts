import { expect, it } from 'vitest';
import { parseCitationPage } from './citationPage';
import { createOptimisticCitation } from '../../features/archive/logic/optimisticCitation';
import { getPageNumber } from '../../features/archive/logic/archiveSort';

it.each([
  ['12', 12],
  ['32–35쪽', 32],
  ['p. 008', 8],
  ['0', 0],
  ['', undefined],
  ['앞표지', undefined],
  [null, undefined],
  [undefined, undefined],
] as const)('interprets %s consistently for a saved page and an optimistic citation', (page, expected) => {
  expect(parseCitationPage(page)).toBe(expected);
  const draft = createOptimisticCitation({
    kind: 'sentence',
    text: '문장',
    author: '',
    book: '',
    tags: [],
    page: page ?? undefined,
  });
  expect(draft.pageSort).toBe(expected);
  expect(getPageNumber({ ...draft, pageSort: undefined })).toBe(expected);
});

it('preserves an explicit server sort value, including zero', () => {
  const draft = createOptimisticCitation({
    kind: 'sentence',
    text: '문장',
    author: '',
    book: '',
    tags: [],
    page: '12',
  });
  expect(getPageNumber({ ...draft, pageSort: 0 })).toBe(0);
});
