import type {
  ChapterBlock,
  Citation,
  Note,
  Project,
} from '../../../types';
import type {
  ChapterBlocksByBook,
  RenameAuthorMutationResult,
  RenameBookMutationResult,
} from '../contract/archiveMutationContract';

const toIdSet = (ids: string | string[]) => new Set(Array.isArray(ids) ? ids : [ids]);

export const prependCitation = (citations: Citation[], citation: Citation) => [citation, ...citations];

export const replaceCitationById = (
  citations: Citation[],
  citationId: string,
  nextCitation: Citation
) => citations.map((citation) => (citation.id === citationId ? nextCitation : citation));

export const appendCitationNote = (citations: Citation[], citationId: string, note: Note) =>
  citations.map((citation) =>
    citation.id === citationId ? { ...citation, notes: [...citation.notes, note] } : citation
  );

export const updateCitationNote = (
  citations: Citation[],
  citationId: string,
  noteId: string,
  content: string
) =>
  citations.map((citation) =>
    citation.id === citationId
      ? {
          ...citation,
          notes: citation.notes.map((note) => (note.id === noteId ? { ...note, content } : note)),
        }
      : citation
  );

export const deleteCitationNote = (citations: Citation[], citationId: string, noteId: string) =>
  citations.map((citation) =>
    citation.id === citationId
      ? {
          ...citation,
          notes: citation.notes.filter((note) => note.id !== noteId),
        }
      : citation
  );

export const deleteCitationById = (citations: Citation[], citationId: string) =>
  citations.filter((citation) => citation.id !== citationId);

export const removeCitationsFromProjects = (
  projects: Project[],
  citationIds: string | string[]
) => {
  const deletedIdSet = toIdSet(citationIds);

  return projects.map((project) => ({
    ...project,
    citationIds: project.citationIds.filter((existingId) => !deletedIdSet.has(existingId)),
  }));
};

export const isCitationOwnedByAuthorOrBookIds = (
  citation: Citation,
  authorId: string,
  bookIds: ReadonlySet<string>
) => citation.authorId === authorId || bookIds.has(citation.bookId || '');

export const deleteCitationsByAuthorIdOrBookIds = (
  citations: Citation[],
  authorId: string,
  bookIds: ReadonlySet<string>
) =>
  citations.filter(
    (citation) => !isCitationOwnedByAuthorOrBookIds(citation, authorId, bookIds)
  );

export const deleteChapterBlocksForBooks = (
  current: ChapterBlocksByBook,
  bookIds: string | string[]
) => {
  const deletedBookIdSet = toIdSet(bookIds);
  return Object.fromEntries(
    Object.entries(current).filter(([bookId]) => !deletedBookIdSet.has(bookId))
  );
};

export const patchCitation = (
  citations: Citation[],
  citationId: string,
  patch: Partial<Citation>
) => citations.map((citation) => (citation.id === citationId ? { ...citation, ...patch } : citation));

export const patchCitations = (
  citations: Citation[],
  citationIds: string[],
  patch: Partial<Citation>
) => {
  const updatedIdSet = new Set(citationIds);
  return citations.map((citation) =>
    updatedIdSet.has(citation.id) ? { ...citation, ...patch } : citation
  );
};

export const applyRenameAuthorToCitations = (
  citations: Citation[],
  result: RenameAuthorMutationResult
) => {
  const bookMergeMap = new Map(
    result.bookMerges.map((merge) => [
      merge.fromBookId,
      {
        toBookId: merge.toBookId,
        toBookTitle: merge.toBookTitle,
        toBookSortIndex: merge.toBookSortIndex,
      },
    ])
  );

  return citations.map((citation) => {
    let nextCitation = citation;

    if (citation.authorId === result.fromAuthorId) {
      nextCitation = {
        ...nextCitation,
        authorId: result.authorId,
        author: result.authorName,
        authorSortIndex: result.authorSortIndex,
        isSelf: result.isSelf,
      };
    }

    if (citation.bookId && bookMergeMap.has(citation.bookId)) {
      const mergeTarget = bookMergeMap.get(citation.bookId)!;
      nextCitation = {
        ...nextCitation,
        bookId: mergeTarget.toBookId,
        book: mergeTarget.toBookTitle,
        bookSortIndex: mergeTarget.toBookSortIndex,
      };
    }

    return nextCitation;
  });
};

export const applyRenameBookToCitations = (
  citations: Citation[],
  result: RenameBookMutationResult
) =>
  citations.map((citation) =>
    citation.bookId === result.fromBookId
      ? {
          ...citation,
          bookId: result.bookId,
          book: result.bookTitle,
          bookSortIndex: result.bookSortIndex,
        }
      : citation
  );

export const mergeChapterBlocksByBook = (
  current: ChapterBlocksByBook,
  bookId: string,
  chapterBlocks: ChapterBlock[]
) => ({
  ...current,
  [bookId]: chapterBlocks,
});

export const appendChapterBlock = (
  current: ChapterBlocksByBook,
  chapterBlock: ChapterBlock
) => ({
  ...current,
  [chapterBlock.bookId]: [...(current[chapterBlock.bookId] || []), chapterBlock],
});

export const deleteChapterBlock = (
  current: ChapterBlocksByBook,
  bookId: string,
  blockId: string
) => ({
  ...current,
  [bookId]: (current[bookId] || []).filter((block) => block.id !== blockId),
});

export const reorderProjectsLocally = (
  projects: Project[],
  dragIndex: number,
  dropIndex: number
) => {
  if (dragIndex < 0 || dragIndex >= projects.length) {
    return null;
  }

  const nextProjects = [...projects];
  const [moved] = nextProjects.splice(dragIndex, 1);
  if (!moved) {
    return null;
  }

  const adjustedIndex = dragIndex < dropIndex ? dropIndex - 1 : dropIndex;
  const safeIndex = Math.max(0, Math.min(adjustedIndex, nextProjects.length));
  nextProjects.splice(safeIndex, 0, moved);
  return nextProjects;
};

export const attachCitationToProject = (
  projects: Project[],
  projectId: string,
  citationId: string
) =>
  projects.map((project) => {
    if (project.id !== projectId || project.citationIds.includes(citationId)) {
      return project;
    }

    return {
      ...project,
      citationIds: [...project.citationIds, citationId],
    };
  });
