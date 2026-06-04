import type {
  ChapterBlock,
  BookSource,
  Citation,
  Note,
  Project,
} from '../../../types';
import type {
  ChapterBlocksByBook,
  RenameAuthorMutationResult,
  RenameBookMutationResult,
} from '../contract/archiveMutationContract';

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

export const removeCitationFromProjects = (projects: Project[], citationId: string) =>
  projects.map((project) => ({
    ...project,
    citationIds: project.citationIds.filter((existingId) => existingId !== citationId),
  }));

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

export const appendProject = (projects: Project[], project: Project) => [...projects, project];

export const appendBookSource = (books: BookSource[], book: BookSource) =>
  books.some((entry) => entry.id === book.id) ? books : [...books, book];

export const renameProject = (projects: Project[], projectId: string, name: string) =>
  projects.map((project) => (project.id === projectId ? { ...project, name } : project));

export const deleteProject = (projects: Project[], projectId: string) =>
  projects.filter((project) => project.id !== projectId);

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
