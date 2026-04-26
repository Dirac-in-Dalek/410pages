import { describe, expect, it } from 'vitest';
import {
  CITATION_SAVE_FAILED_MESSAGE,
  createOptimisticCitation,
  createRetryCitationInput,
  isOptimisticCitationId,
} from './optimisticCitation';

describe('optimistic citation helpers', () => {
  it('creates a saving citation that can be rendered before persistence finishes', () => {
    const citation = createOptimisticCitation(
      {
        text: 'Fast quote',
        author: '',
        book: 'The Book',
        page: '147',
        tags: [],
      },
      1700
    );

    expect(isOptimisticCitationId(citation.id)).toBe(true);
    expect(citation.saveStatus).toBe('saving');
    expect(citation.text).toBe('Fast quote');
    expect(citation.book).toBe('The Book');
    expect(citation.pageSort).toBe(147);
    expect(citation.isSelf).toBe(true);
  });

  it('keeps failed citation data available for retry', () => {
    const citation = createOptimisticCitation(
      {
        text: 'Recoverable quote',
        author: 'Simone Weil',
        book: 'Gravity and Grace',
        page: '30-31',
        tags: [],
      },
      1800
    );

    expect(CITATION_SAVE_FAILED_MESSAGE).toBe('저장에 실패했습니다. 다시 시도해주세요.');
    expect(createRetryCitationInput({ ...citation, saveStatus: 'failed' })).toMatchObject({
      text: 'Recoverable quote',
      author: 'Simone Weil',
      book: 'Gravity and Grace',
      page: '30-31',
      tags: [],
    });
  });

  it('does not erase a visible author when preparing a retry', () => {
    const citation = createOptimisticCitation(
      {
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
});
