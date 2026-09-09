import type { AddCitationInput, Citation } from '../../../types';

export const CITATION_SAVE_FAILED_MESSAGE = '저장에 실패했습니다. 다시 시도해주세요.';

export const attachOptimisticOrigin = (
  citation: Citation,
  optimisticCitationId: string
): Citation => ({
  ...citation,
  optimisticOriginId: optimisticCitationId,
});

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
    id: data.id ?? globalThis.crypto.randomUUID(),
    kind: 'sentence',
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

const normalizeSourceName = (value: string | undefined) => value?.trim() || '';

export const createOptimisticCitationEditPatch = (
  citation: Citation,
  data: Partial<Citation>
): Partial<Citation> => {
  const patch: Partial<Citation> = { ...data };
  if (data.page !== undefined) {
    patch.pageSort = extractCitationPageSort(data.page);
  }

  const didAuthorChange =
    data.author !== undefined &&
    normalizeSourceName(data.author) !== normalizeSourceName(citation.author);
  const didBookChange =
    data.book !== undefined &&
    normalizeSourceName(data.book) !== normalizeSourceName(citation.book);

  if (didAuthorChange) {
    patch.isSelf = !normalizeSourceName(data.author);
    patch.authorId = undefined;
    patch.authorSortIndex = undefined;
    patch.bookId = undefined;
    patch.bookSortIndex = undefined;
  } else if (didBookChange) {
    patch.bookId = undefined;
    patch.bookSortIndex = undefined;
  }

  return patch;
};

export const reconcilePersistedCitationSource = (
  persisted: Citation,
  currentOptimistic: Citation | undefined,
  submitted: AddCitationInput
): Citation => {
  if (!currentOptimistic) return persisted;

  const didAuthorChange =
    currentOptimistic.authorId !== submitted.authorId ||
    normalizeSourceName(currentOptimistic.author) !== normalizeSourceName(submitted.author);
  const didBookChange =
    currentOptimistic.bookId !== submitted.bookId ||
    normalizeSourceName(currentOptimistic.book) !== normalizeSourceName(submitted.book);

  return {
    ...persisted,
    ...(didAuthorChange
      ? {
          authorId: currentOptimistic.authorId,
          author: currentOptimistic.author,
          authorSortIndex: currentOptimistic.authorSortIndex,
          isSelf: currentOptimistic.isSelf,
        }
      : {}),
    ...(didBookChange
      ? {
          bookId: currentOptimistic.bookId,
          book: currentOptimistic.book,
          bookSortIndex: currentOptimistic.bookSortIndex,
        }
      : {}),
  };
};

export const createRetryCitationInput = (citation: Citation): AddCitationInput => ({
  id: citation.id,
  kind: 'sentence',
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
