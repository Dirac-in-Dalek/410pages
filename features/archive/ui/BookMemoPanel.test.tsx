import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookSource } from '../../../types';
import { moveBookMemoDraftAfterMerge, readBookMemoDraft, storeBookMemoDraft } from '../logic/bookMemoDraftStorage';
import { BookMemoPanel } from './BookMemoPanel';

const book: BookSource = {
  id: 'book-1',
  title: '테스트 책',
  memo: '서버 메모',
  sortIndex: null,
  createdAt: 1,
  authorId: 'author-1',
  author: '저자',
  authorSortIndex: null,
  isSelf: false,
};

describe('BookMemoPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => vi.useRealTimers());

  it('saves 800ms after the last input and removes the recovered draft', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<BookMemoPanel userId="user-1" book={book} onSave={onSave} />);

    fireEvent.change(screen.getByRole('textbox', { name: '책 전체 메모' }), { target: { value: '새 메모' } });
    expect(readBookMemoDraft('user-1', 'book-1')).toBe('새 메모');
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTimeAsync(800));
    expect(onSave).toHaveBeenCalledWith('book-1', '새 메모');
    expect(readBookMemoDraft('user-1', 'book-1')).toBeNull();
    expect(screen.getByText('저장됨')).toBeTruthy();
  });

  it('keeps a failed memo draft for recovery', async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    render(<BookMemoPanel userId="user-1" book={book} onSave={onSave} />);
    fireEvent.change(screen.getByRole('textbox', { name: '책 전체 메모' }), { target: { value: '실패 초안' } });

    await act(async () => vi.advanceTimersByTimeAsync(800));
    expect(screen.getByText('실패')).toBeTruthy();
    expect(readBookMemoDraft('user-1', 'book-1')).toBe('실패 초안');
  });

  it('shows a recovered draft without overwriting the server until explicit save', async () => {
    localStorage.setItem('book-memo-draft.v1:user-1:book-1', '다른 기기와 비교할 초안');
    const onSave = vi.fn().mockResolvedValue(true);
    render(<BookMemoPanel userId="user-1" book={book} onSave={onSave} />);

    expect(screen.getByText('복구됨')).toBeTruthy();
    expect((screen.getByRole('textbox', { name: '책 전체 메모' }) as HTMLTextAreaElement).value).toBe('다른 기기와 비교할 초안');
    await act(async () => vi.advanceTimersByTimeAsync(800));
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => fireEvent.click(screen.getByRole('button', { name: '저장' })));
    expect(onSave).toHaveBeenCalledWith('book-1', '다른 기기와 비교할 초안');
  });

  it('saves immediately when the explicit save button is pressed', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<BookMemoPanel userId="user-1" book={book} onSave={onSave} />);
    fireEvent.change(screen.getByRole('textbox', { name: '책 전체 메모' }), { target: { value: '즉시 저장할 메모' } });

    await act(async () => fireEvent.click(screen.getByRole('button', { name: '저장' })));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('book-1', '즉시 저장할 메모');
    expect(readBookMemoDraft('user-1', 'book-1')).toBeNull();
  });

  it('serializes overlapping saves so the newest memo reaches the server last', async () => {
    let finishFirst!: (value: boolean) => void;
    const onSave = vi.fn()
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => { finishFirst = resolve; }))
      .mockResolvedValueOnce(true);
    render(<BookMemoPanel userId="user-1" book={book} onSave={onSave} />);
    const textbox = screen.getByRole('textbox', { name: '책 전체 메모' });

    fireEvent.change(textbox, { target: { value: '첫 메모' } });
    await act(async () => vi.advanceTimersByTimeAsync(800));
    fireEvent.change(textbox, { target: { value: '최신 메모' } });
    await act(async () => vi.advanceTimersByTimeAsync(800));
    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => finishFirst(true));
    expect(onSave).toHaveBeenNthCalledWith(2, 'book-1', '최신 메모');
  });

  it('does not let an older save delete a newer debounce draft', async () => {
    let finishFirst!: (value: boolean) => void;
    const onSave = vi.fn()
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => { finishFirst = resolve; }))
      .mockResolvedValueOnce(true);
    render(<BookMemoPanel userId="user-1" book={book} onSave={onSave} />);
    const textbox = screen.getByRole('textbox', { name: '책 전체 메모' });
    fireEvent.change(textbox, { target: { value: '첫 메모' } });
    await act(async () => vi.advanceTimersByTimeAsync(800));

    fireEvent.change(textbox, { target: { value: '더 최신 메모' } });
    await act(async () => finishFirst(true));

    expect(readBookMemoDraft('user-1', 'book-1')).toBe('더 최신 메모');
    await act(async () => vi.advanceTimersByTimeAsync(800));
    expect(onSave).toHaveBeenNthCalledWith(2, 'book-1', '더 최신 메모');
  });

  it('clears a matching saved draft after switching to another book', async () => {
    let finishSave!: (value: boolean) => void;
    const onSave = vi.fn(() => new Promise<boolean>((resolve) => { finishSave = resolve; }));
    const { rerender } = render(<BookMemoPanel userId="user-1" book={book} onSave={onSave} />);
    fireEvent.change(screen.getByRole('textbox', { name: '책 전체 메모' }), { target: { value: '저장 중 메모' } });
    await act(async () => vi.advanceTimersByTimeAsync(800));

    rerender(<BookMemoPanel userId="user-1" book={{ ...book, id: 'book-2', title: '다른 책' }} onSave={onSave} />);
    await act(async () => finishSave(true));

    expect(readBookMemoDraft('user-1', 'book-1')).toBeNull();
  });

  it('adopts a merged server memo for the same selected book when no draft exists', () => {
    const { rerender } = render(<BookMemoPanel userId="user-1" book={book} onSave={vi.fn()} />);
    rerender(<BookMemoPanel userId="user-1" book={{ ...book, memo: '병합된 메모' }} onSave={vi.fn()} />);
    expect((screen.getByRole('textbox', { name: '책 전체 메모' }) as HTMLTextAreaElement).value).toBe('병합된 메모');
  });

  it('adopts a merged source-only local draft and cancels the pre-merge autosave', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { rerender } = render(<BookMemoPanel userId="user-1" book={book} onSave={onSave} />);
    fireEvent.change(screen.getByRole('textbox', { name: '책 전체 메모' }), { target: { value: '병합 전 대상 초안' } });
    storeBookMemoDraft('user-1', 'source-book', '원본 책 로컬 초안');
    act(() => {
      moveBookMemoDraftAfterMerge('user-1', 'source-book', 'book-1', '서버 대상 메모', '');
    });

    rerender(<BookMemoPanel userId="user-1" book={{ ...book }} onSave={onSave} />);
    expect((screen.getByRole('textbox', { name: '책 전체 메모' }) as HTMLTextAreaElement).value).toContain('원본 책 로컬 초안');
    expect(screen.getByText('복구됨')).toBeTruthy();
    await act(async () => vi.advanceTimersByTimeAsync(800));
    expect(onSave).not.toHaveBeenCalled();
  });
});
