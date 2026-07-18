import type { BookViewItem, Citation } from '../../../types';

export type CitationRenderRow =
  | { type: 'sentence'; id: string; citation: Citation; pageSort?: number; createdAtSort: number }
  | { type: 'word_group'; id: string; citations: Citation[]; pageSort?: number; createdAtSort: number }
  | Extract<BookViewItem, { type: 'chapter_block' }>;

const getBookKey = (citation: Citation) =>
  `${citation.author.trim().toLocaleLowerCase()}\u0000${citation.book.trim().toLocaleLowerCase()}`;

const getCitationKind = (citation: Citation) => citation.kind || 'sentence';

const findLatestPrecedingSentence = (sentences: Citation[], word: Citation) => {
  let result: Citation | undefined;
  for (const sentence of sentences) {
    if (sentence.createdAt > word.createdAt) break;
    result = sentence;
  }
  return result;
};

export const buildCitationRenderRows = (
  visibleCitations: Citation[],
  orderedBaseItems: BookViewItem[],
  chronologyCitations: Citation[] = visibleCitations
): CitationRenderRow[] => {
  const sentencesByBook = new Map<string, Citation[]>();
  const words = visibleCitations
    .filter((citation) => getCitationKind(citation) === 'word')
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));

  chronologyCitations.forEach((citation) => {
    if (getCitationKind(citation) !== 'sentence') return;
    const bookKey = getBookKey(citation);
    const sentences = sentencesByBook.get(bookKey) || [];
    sentences.push(citation);
    sentencesByBook.set(bookKey, sentences);
  });
  sentencesByBook.forEach((sentences) => {
    sentences.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  });

  const baseItemById = new Map(orderedBaseItems.map((item) => [item.id, item]));
  const wordGroupsByPlacementId = new Map<string, Citation[]>();
  const orphanGroupsByBoundary = new Map<string, Citation[]>();
  const chapterBlocksByBook = new Map<string, Extract<BookViewItem, { type: 'chapter_block' }>[]>();

  orderedBaseItems.forEach((item) => {
    if (item.type !== 'chapter_block') return;
    const blocks = chapterBlocksByBook.get(item.block.bookId) || [];
    blocks.push(item);
    chapterBlocksByBook.set(item.block.bookId, blocks);
  });
  chapterBlocksByBook.forEach((blocks) => blocks.sort((a, b) => a.createdAtSort - b.createdAtSort));

  words.forEach((word) => {
    const bookKey = getBookKey(word);
    const precedingSentence = findLatestPrecedingSentence(sentencesByBook.get(bookKey) || [], word);
    if (!precedingSentence || !baseItemById.has(precedingSentence.id)) {
      const boundaryKey = `${bookKey}\u0000${precedingSentence?.id || 'leading'}`;
      const orphanGroup = orphanGroupsByBoundary.get(boundaryKey) || [];
      orphanGroup.push(word);
      orphanGroupsByBoundary.set(boundaryKey, orphanGroup);
      return;
    }

    const sourceBookId = word.bookId || precedingSentence.bookId;
    const blocks = sourceBookId ? chapterBlocksByBook.get(sourceBookId) || [] : [];
    let interveningBlock: Extract<BookViewItem, { type: 'chapter_block' }> | undefined;
    for (const block of blocks) {
      if (block.createdAtSort > word.createdAt) break;
      if (block.createdAtSort > precedingSentence.createdAt) interveningBlock = block;
    }
    const placementId = interveningBlock?.id || precedingSentence.id;
    const group = wordGroupsByPlacementId.get(placementId) || [];
    group.push(word);
    wordGroupsByPlacementId.set(placementId, group);
  });

  const toWordGroup = (key: string, citations: Citation[], placement?: BookViewItem): CitationRenderRow => ({
    type: 'word_group',
    id: `word-group-${key}-${citations[0].id}`,
    citations,
    pageSort: placement?.pageSort,
    createdAtSort: citations.at(-1)?.createdAt ?? placement?.createdAtSort ?? 0,
  });

  const rows: CitationRenderRow[] = [...orphanGroupsByBoundary.entries()]
    .sort(([, a], [, b]) => a[0].createdAt - b[0].createdAt || a[0].id.localeCompare(b[0].id))
    .map(([bookKey, citations]) => toWordGroup(`orphan-${bookKey}`, citations));

  orderedBaseItems.forEach((item) => {
    const group = wordGroupsByPlacementId.get(item.id);
    if (group?.length && item.type === 'citation') {
      rows.push(toWordGroup(item.id, group, item));
    }

    rows.push(
      item.type === 'citation'
        ? {
            type: 'sentence',
            id: item.id,
            citation: item.citation,
            pageSort: item.pageSort,
            createdAtSort: item.createdAtSort,
          }
        : item
    );

    if (group?.length && item.type === 'chapter_block') {
      rows.push(toWordGroup(item.id, group, item));
    }
  });

  return rows;
};
