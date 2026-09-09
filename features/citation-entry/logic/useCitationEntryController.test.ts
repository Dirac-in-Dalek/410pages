import { describe, expect, it } from 'vitest';
import { createCitationInput } from './useCitationEntryController';

describe('createCitationInput', () => {
  it('stores short text as a citation with its page', () => {
    expect(
      createCitationInput({ text: '필연적 선택', author: 'Author', book: 'Book', page: '147' })
    ).toEqual({
      kind: 'sentence',
      text: '필연적 선택',
      author: 'Author',
      book: 'Book',
      page: '147',
      tags: [],
    });
  });

  it('keeps page data for a sentence', () => {
    expect(
      createCitationInput({ text: 'This is a sentence', author: 'Author', book: 'Book', page: '147' })
    ).toEqual({
      kind: 'sentence',
      text: 'This is a sentence',
      author: 'Author',
      book: 'Book',
      page: '147',
      tags: [],
    });
  });

  it('keeps the selected book id so same-named books cannot be confused', () => {
    expect(
      createCitationInput({
        text: 'This belongs to the selected book',
        author: 'Author',
        book: 'Same title',
        bookId: 'book-selected',
        page: '',
      })
    ).toMatchObject({
      bookId: 'book-selected',
      author: 'Author',
      book: 'Same title',
    });
  });
});
