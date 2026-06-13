import { describe, expect, it } from 'vitest';
import type { Citation, Project } from '../../../types';
import type { ChapterBlocksByBook } from '../contract/archiveMutationContract';
import {
  deleteChapterBlocksForBooks,
  deleteCitationsByAuthorIdOrBookIds,
  removeCitationsFromProjects,
} from './archiveLocalPatch';

const citation = (overrides: Partial<Citation> & Pick<Citation, 'id'>): Citation => ({
  text: 'Quote',
  author: 'Author A',
  book: 'Book A',
  notes: [],
  tags: [],
  createdAt: 100,
  ...overrides,
});

describe('archiveLocalPatch deletion helpers', () => {
  it('removes deleted citation references and chapter blocks from local collections', () => {
    const projects: Project[] = [
      { id: 'project-1', name: 'Project', citationIds: ['citation-1', 'citation-2'] },
    ];
    const blocks: ChapterBlocksByBook = {
      'book-1': [{ id: 'block-1', bookId: 'book-1', label: '1장', createdAtSort: 1, createdAt: 1 }],
      'book-2': [{ id: 'block-2', bookId: 'book-2', label: '2장', createdAtSort: 2, createdAt: 2 }],
    };

    expect(removeCitationsFromProjects(projects, ['citation-1'])).toEqual([
      { id: 'project-1', name: 'Project', citationIds: ['citation-2'] },
    ]);
    expect(deleteChapterBlocksForBooks(blocks, ['book-1'])).toEqual({
      'book-2': blocks['book-2'],
    });
  });

  it('removes author citations and legacy book-linked citations under a deleted author', () => {
    const citations = [
      citation({ id: 'citation-1', authorId: 'author-1', bookId: 'book-1' }),
      citation({ id: 'citation-legacy', bookId: 'book-1' }),
      citation({ id: 'citation-2', authorId: 'author-2', bookId: 'book-2' }),
    ];

    expect(
      deleteCitationsByAuthorIdOrBookIds(citations, 'author-1', new Set(['book-1'])).map(
        (entry) => entry.id
      )
    ).toEqual([
      'citation-2',
    ]);
  });
});
