import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLibrarySourceMutations } from './useLibrarySourceMutations';
import type { ChapterBlock } from '../../../types';

const api = vi.hoisted(() => ({ renameBook: vi.fn(), renameAuthor: vi.fn() }));
vi.mock('../../../shared/api/bookApi', () => ({ createBook: vi.fn(), renameBook: api.renameBook }));
vi.mock('../../../shared/api/authorApi', () => ({ createAuthor: vi.fn(), renameAuthor: api.renameAuthor }));
vi.mock('./citationDraftStorage', () => ({ readCitationDrafts: () => [], storeCitationDraft: vi.fn() }));
vi.mock('./bookMemoDraftStorage', () => ({ moveBookMemoDraftAfterMerge: () => true }));

beforeEach(() => vi.clearAllMocks());

describe('library merge chapter reconciliation', () => {
  for (const mergeAuthor of [false, true]) {
    it(`immediately reconciles chapter cache and refreshes the destination after ${mergeAuthor ? 'author' : 'book'} merge`, async () => {
      const chapter: ChapterBlock = { id: 'chapter', bookId: 'source', label: 'Child', depth: 2, createdAt: 1, createdAtSort: 100, orderKey: 'a0' };
      const setChapterBlocksByBook = vi.fn();
      const refreshChapterBlocks = vi.fn();
      const options = {
        session: { user: { id: 'owner' } }, books: [], setBooks: vi.fn(), setAuthors: vi.fn(), setCitations: vi.fn(),
        setAuthorFolderMemberships: vi.fn(), invalidateDataLoad: vi.fn(), invalidateAuthorFolderLoad: vi.fn(),
        refreshAuthorFolders: vi.fn(), setMutationError: vi.fn(), setChapterBlocksByBook, refreshChapterBlocks,
      };
      api.renameBook.mockResolvedValue({ merged: true, fromBookId: 'source', bookId: 'target', bookTitle: 'New', bookMemo: '', bookSortIndex: null, chapterOrderKeys: { chapter: 'a0V' } });
      api.renameAuthor.mockResolvedValue({ merged: true, fromAuthorId: 'old', authorId: 'new', authorName: 'New', authorSortIndex: null, isSelf: false, folderId: null,
        bookMerges: [{fromBookId:'source',toBookId:'target',toBookTitle:'New',toBookMemo:'',toBookSortIndex:null,chapterOrderKeys:{chapter:'a0V'}}],
      });
      const { result } = renderHook(() => useLibrarySourceMutations(options));
      await act(async () => { await (mergeAuthor ? result.current.handleRenameAuthor('old','New') : result.current.handleRenameBook('source','New')); });
      const patch = setChapterBlocksByBook.mock.calls[0][0];
      expect(patch({source:[chapter],target:[]})).toEqual({target:[{...chapter,bookId:'target',orderKey:'a0V'}]});
      expect(refreshChapterBlocks).toHaveBeenCalledWith('target');
    });
  }
});
