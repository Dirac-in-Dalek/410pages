import { describe, expect, it } from 'vitest';
import type { BookSource, Citation, Project } from '../../../types';
import type { ChapterBlocksByBook } from '../contract/archiveMutationContract';
import {
  deleteBookSource,
  deleteChapterBlocksForBooks,
  deleteCitationsByAuthorId,
  deleteCitationsByAuthorIdOrBookIds,
  deleteCitationsByBookId,
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

const book = (overrides: Partial<BookSource> & Pick<BookSource, 'id'>): BookSource => ({
  title: 'Book A',
  sortIndex: null,
  createdAt: 100,
  authorId: 'author-1',
  author: 'Author A',
  authorSortIndex: null,
  isSelf: false,
  ...overrides,
});

describe('archiveLocalPatch deletion helpers', () => {
  it('removes a deleted book from local books, citations, projects, and chapter blocks', () => {
    const books = [book({ id: 'book-1' }), book({ id: 'book-2' })];
    const citations = [
      citation({ id: 'citation-1', bookId: 'book-1' }),
      citation({ id: 'citation-2', bookId: 'book-2' }),
    ];
    const projects: Project[] = [
      { id: 'project-1', name: 'Project', citationIds: ['citation-1', 'citation-2'] },
    ];
    const blocks: ChapterBlocksByBook = {
      'book-1': [{ id: 'block-1', bookId: 'book-1', label: '1장', createdAtSort: 1, createdAt: 1 }],
      'book-2': [{ id: 'block-2', bookId: 'book-2', label: '2장', createdAtSort: 2, createdAt: 2 }],
    };

    expect(deleteBookSource(books, 'book-1').map((entry) => entry.id)).toEqual(['book-2']);
    expect(deleteCitationsByBookId(citations, 'book-1').map((entry) => entry.id)).toEqual([
      'citation-2',
    ]);
    expect(removeCitationsFromProjects(projects, ['citation-1'])).toEqual([
      { id: 'project-1', name: 'Project', citationIds: ['citation-2'] },
    ]);
    expect(deleteChapterBlocksForBooks(blocks, ['book-1'])).toEqual({
      'book-2': blocks['book-2'],
    });
  });

  it('removes every citation under a deleted author', () => {
    const citations = [
      citation({ id: 'citation-1', authorId: 'author-1', bookId: 'book-1' }),
      citation({ id: 'citation-legacy', bookId: 'book-1' }),
      citation({ id: 'citation-2', authorId: 'author-2', bookId: 'book-2' }),
    ];

    expect(deleteCitationsByAuthorId(citations, 'author-1').map((entry) => entry.id)).toEqual([
      'citation-legacy',
      'citation-2',
    ]);
    expect(
      deleteCitationsByAuthorIdOrBookIds(citations, 'author-1', ['book-1']).map(
        (entry) => entry.id
      )
    ).toEqual([
      'citation-2',
    ]);
  });
});
