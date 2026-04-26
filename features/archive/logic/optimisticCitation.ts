import type { AddCitationInput, Citation } from '../../../types';

export const OPTIMISTIC_CITATION_ID_PREFIX = 'optimistic-citation-';
export const CITATION_SAVE_FAILED_MESSAGE = '저장에 실패했습니다. 다시 시도해주세요.';

export const isOptimisticCitationId = (citationId: string) =>
  citationId.startsWith(OPTIMISTIC_CITATION_ID_PREFIX);

export const extractCitationPageSort = (page: string | undefined): number | undefined => {
  if (!page) return undefined;
  const match = page.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : undefined;
};

export const createOptimisticCitation = (
  data: AddCitationInput,
  now = Date.now()
): Citation => {
  const author = data.author?.trim() || '';
  const book = data.book?.trim() || '';
  const page = data.page || undefined;

  return {
    id: `${OPTIMISTIC_CITATION_ID_PREFIX}${now}-${Math.random().toString(36).slice(2, 8)}`,
    text: data.text,
    author,
    authorId: data.authorId,
    authorSortIndex: data.authorSortIndex,
    isSelf: !author || data.isSelf,
    book,
    bookId: data.bookId,
    bookSortIndex: data.bookSortIndex,
    page,
    pageSort: extractCitationPageSort(page),
    notes: [],
    tags: data.tags || [],
    highlights: data.highlights,
    createdAt: now,
    saveStatus: 'saving',
  };
};

export const createRetryCitationInput = (citation: Citation): AddCitationInput => ({
  text: citation.text,
  author: citation.isSelf && !citation.author ? '' : citation.author,
  authorId: citation.authorId,
  authorSortIndex: citation.authorSortIndex,
  isSelf: citation.isSelf,
  book: citation.book,
  bookId: citation.bookId,
  bookSortIndex: citation.bookSortIndex,
  page: citation.page,
  pageSort: citation.pageSort,
  tags: citation.tags,
  highlights: citation.highlights,
});
