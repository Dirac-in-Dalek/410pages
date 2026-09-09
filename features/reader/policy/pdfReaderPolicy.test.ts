import { describe, expect, it } from 'vitest';
import { createPdfCitationInput } from './pdfReaderPolicy';

describe('createPdfCitationInput', () => {
  it('keeps the PDF page for short text', () => {
    expect(
      createPdfCitationInput({
        text: '근원적 고독',
        author: '  Author  ',
        book: '  Book  ',
        page: '147',
      })
    ).toEqual({
      kind: 'sentence',
      text: '근원적 고독',
      author: 'Author',
      book: 'Book',
      page: '147',
      tags: [],
    });
  });

  it('keeps the PDF page for a sentence selection', () => {
    expect(
      createPdfCitationInput({
        text: 'This is a sentence',
        bookId: 'book-1',
        author: 'Author',
        book: 'Book',
        page: '147',
      })
    ).toMatchObject({ kind: 'sentence', bookId: 'book-1', page: '147' });
  });
});
