import { describe, expect, it } from 'vitest';
import {
  attachOptimisticOrigin,
  CITATION_SAVE_FAILED_MESSAGE,
  createOptimisticCitation,
  createOptimisticCitationEditPatch,
  createRetryCitationInput,
  reconcilePersistedCitationSource,
} from './optimisticCitation';

describe('optimistic citation helpers', () => {
  it('records the optimistic id on the persisted citation without changing its real id', () => {
    const persisted = createOptimisticCitation({
      kind: 'sentence',
      text: '고독',
      author: 'Author',
      book: 'Book',
      tags: [],
    }, 100);
    const realCitation = { ...persisted, id: 'persisted-1', saveStatus: undefined };

    expect(attachOptimisticOrigin(realCitation, 'optimistic-citation-1')).toMatchObject({
      id: 'persisted-1',
      optimisticOriginId: 'optimistic-citation-1',
    });
  });
  it('creates a saving citation that can be rendered before persistence finishes', () => {
    const citation = createOptimisticCitation(
      {
        id: '018f47a2-8594-7c09-a488-2f73384e4711',
        kind: 'sentence',
        text: 'Fast quote',
        author: '',
        book: 'The Book',
        page: '147',
        tags: [],
      },
      1700
    );

    expect(citation.id).toBe('018f47a2-8594-7c09-a488-2f73384e4711');
    expect(citation.saveStatus).toBe('saving');
    expect(citation.text).toBe('Fast quote');
    expect(citation.book).toBe('The Book');
    expect(citation.pageSort).toBe(147);
    expect(citation.isSelf).toBe(true);
  });

  it('keeps failed citation data available for retry', () => {
    const citation = createOptimisticCitation(
      {
        kind: 'sentence',
        text: 'Recoverable quote',
        author: 'Simone Weil',
        book: 'Gravity and Grace',
        page: '30-31',
        orderKey: 'a1V',
        tags: [],
      },
      1800
    );

    expect(CITATION_SAVE_FAILED_MESSAGE).toBe('저장에 실패했습니다. 다시 시도해주세요.');
    expect(createRetryCitationInput({ ...citation, saveStatus: 'failed' })).toMatchObject({
      id: citation.id,
      createdAt: 1800,
      text: 'Recoverable quote',
      author: 'Simone Weil',
      book: 'Gravity and Grace',
      page: '30-31',
      orderKey: 'a1V',
      tags: [],
    });
  });

  it('does not erase a visible author when preparing a retry', () => {
    const citation = createOptimisticCitation(
      {
        kind: 'sentence',
        text: 'Edited quote',
        author: '',
        book: 'The Book',
        page: '9',
        tags: [],
      },
      1900
    );

    expect(createRetryCitationInput({ ...citation, author: 'Ursula K. Le Guin', isSelf: true })).toMatchObject({
      author: 'Ursula K. Le Guin',
    });
  });

  it('preserves a short citation and its page through retry', () => {
    const citation = createOptimisticCitation(
      {
        kind: 'sentence',
        text: '근원적 고독',
        author: 'Author',
        book: 'Book',
        page: '147',
        tags: [],
      },
      2000
    );

    expect(citation).toMatchObject({ kind: 'sentence', page: '147', pageSort: 147 });
    expect(createRetryCitationInput({ ...citation, saveStatus: 'failed' })).toMatchObject({
      kind: 'sentence',
      text: '근원적 고독',
      page: '147',
      pageSort: 147,
    });
  });

  it('clears a stale order key when the optimistic source changes', () => {
    const citation = createOptimisticCitation({
      kind: 'sentence', text: 'quote', author: 'Author', book: 'Old Book', bookId: 'old-book',
      orderKey: 'a1V', tags: [],
    }, 2100);

    expect(createOptimisticCitationEditPatch(citation, { book: 'New Book' })).toMatchObject({
      book: 'New Book', bookId: undefined, orderKey: undefined,
    });
  });

  it('does not carry the persisted source key onto a newer local source', () => {
    const submitted = createRetryCitationInput(createOptimisticCitation({
      kind: 'sentence', text: 'quote', author: 'Author', book: 'Old Book', bookId: 'old-book',
      orderKey: 'a1V', tags: [],
    }, 2200));
    const current = { ...createOptimisticCitation(submitted, 2200), book: 'New Book', bookId: undefined, orderKey: undefined };
    const persisted = { ...current, book: 'Old Book', bookId: 'old-book', orderKey: 'a2V', saveStatus: undefined };

    expect(reconcilePersistedCitationSource(persisted, current, submitted)).toMatchObject({
      book: 'New Book', bookId: undefined, orderKey: undefined,
    });
  });
});
