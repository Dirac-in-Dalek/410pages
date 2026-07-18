import { describe, expect, it } from 'vitest';
import { createPdfCitationInput } from './pdfReaderPolicy';

describe('createPdfCitationInput', () => {
  it('captures a one-to-two-word PDF selection as a page-less word', () => {
    expect(
      createPdfCitationInput({
        text: '근원적 고독',
        author: '  Author  ',
        book: '  Book  ',
        page: '147',
      })
    ).toEqual({
      kind: 'word',
      text: '근원적 고독',
      author: 'Author',
      book: 'Book',
      page: undefined,
      tags: [],
    });
  });

  it('keeps the PDF page for a sentence selection', () => {
    expect(
      createPdfCitationInput({
        text: 'This is a sentence',
        author: 'Author',
        book: 'Book',
        page: '147',
      })
    ).toMatchObject({ kind: 'sentence', page: '147' });
  });
});
