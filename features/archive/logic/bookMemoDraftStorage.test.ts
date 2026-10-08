import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeBookMemoText, moveBookMemoDraftAfterMerge, readBookMemoDraft, removeBookMemoDraft, storeBookMemoDraft } from './bookMemoDraftStorage';

describe('bookMemoDraftStorage', () => {
  beforeEach(() => localStorage.clear());

  it('isolates drafts by user and book', () => {
    expect(storeBookMemoDraft('user-a', 'book-1', '첫 메모')).toBe(true);
    expect(readBookMemoDraft('user-a', 'book-1')).toBe('첫 메모');
    expect(readBookMemoDraft('user-b', 'book-1')).toBeNull();
    expect(readBookMemoDraft('user-a', 'book-2')).toBeNull();
  });

  it('removes a persisted draft', () => {
    storeBookMemoDraft('user-a', 'book-1', '초안');
    expect(removeBookMemoDraft('user-a', 'book-1')).toBe(true);
    expect(readBookMemoDraft('user-a', 'book-1')).toBeNull();
  });

  it('fails safely when browser storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota');
    });
    expect(storeBookMemoDraft('user-a', 'book-1', '초안')).toBe(false);
  });

  it('moves a source draft to the merged target with the approved separator', () => {
    storeBookMemoDraft('user-a', 'source', '최신 원본 메모');
    expect(moveBookMemoDraftAfterMerge('user-a', 'source', 'target', '대상 메모', '기존 원본 메모')).toBe(true);
    expect(readBookMemoDraft('user-a', 'source')).toBeNull();
    expect(readBookMemoDraft('user-a', 'target')).toBe('대상 메모\n\n---\n\n최신 원본 메모');
  });

  it('deduplicates equal memo content while merging drafts', () => {
    expect(mergeBookMemoText(' 같은 메모 ', '같은 메모')).toBe(' 같은 메모 ');
  });

  it('adds the persisted source memo when only the target has a local draft', () => {
    storeBookMemoDraft('user-a', 'target', '최신 대상 초안');
    expect(moveBookMemoDraftAfterMerge(
      'user-a',
      'source',
      'target',
      '기존 대상 메모',
      '원본 서버 메모'
    )).toBe(true);
    expect(readBookMemoDraft('user-a', 'target')).toBe('최신 대상 초안\n\n---\n\n원본 서버 메모');
  });
});

describe('formatted memo draft recovery',()=>{
  beforeEach(()=>localStorage.clear());
  it('stores text and formats together and reads legacy plain drafts', async()=>{
    const {readBookMemoDraftContent}=await import('./bookMemoDraftStorage');
    localStorage.setItem('book-memo-draft.v1:owner:book','old plain draft');
    expect(readBookMemoDraftContent('owner','book')).toEqual({text:'old plain draft',formats:[]});
    storeBookMemoDraft('owner','book','새😀메모',[{start:1,end:3,bold:true,fontSizeOffset:2}]);
    expect(readBookMemoDraftContent('owner','book')).toEqual({text:'새😀메모',formats:[{start:1,end:3,bold:true,fontSizeOffset:2}]});
    removeBookMemoDraft('owner','book');expect(readBookMemoDraftContent('owner','book')).toBeNull();
  });
  it('preserves formatted source and target drafts when books merge',async()=>{
    const {readBookMemoDraftContent}=await import('./bookMemoDraftStorage');
    storeBookMemoDraft('owner','target','😀target',[{start:0,end:2,bold:true}]);
    storeBookMemoDraft('owner','source','source',[{start:0,end:6,italic:true}]);
    expect(moveBookMemoDraftAfterMerge('owner','source','target','','')).toBe(true);
    expect(readBookMemoDraftContent('owner','target')).toEqual({text:'😀target\n\n---\n\nsource',formats:[{start:0,end:2,bold:true},{start:15,end:21,italic:true}]});
  });
});
