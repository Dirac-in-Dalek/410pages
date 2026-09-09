import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Citation } from '../../../types';
import { PassageNotesPanel } from './PassageNotesPanel';

const citation: Citation = {
  id: 'citation-1',
  kind: 'sentence',
  text: '검토할 문장',
  author: '저자',
  book: '책',
  notes: [{ id: 'note-1', content: '기존 메모', createdAt: 1 }],
  tags: [],
  createdAt: 1,
};

describe('PassageNotesPanel', () => {
  it('separates desktop comments with space while preserving the mobile sheet', () => {
    const props = { citation, onClose: vi.fn(), onAddNote: vi.fn(), onUpdateNote: vi.fn(), onDeleteNote: vi.fn() };
    const { container, rerender } = render(<PassageNotesPanel {...props} inline />);
    expect(container.querySelector('article')?.parentElement?.className).toBe('space-y-3');
    rerender(<PassageNotesPanel {...props} mobile />);
    expect(container.querySelector('article')?.parentElement?.className).toContain('divide-y');
  });

  it('keeps inline comments open while using the whole-book memo', () => {
    const close = vi.fn();
    render(<><PassageNotesPanel inline citation={citation} onClose={close} onAddNote={vi.fn()} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} /><aside data-book-memo-panel><textarea aria-label="책 메모 테스트" /></aside></>);
    fireEvent.pointerDown(screen.getByRole('textbox', { name: '책 메모 테스트' }));
    expect(close).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    expect(close).toHaveBeenCalledOnce();
  });

  it('keeps inline comments open when the shared scrollbar is pressed', () => {
    const close = vi.fn();
    render(<div data-archive-scroll data-testid="scroll"><PassageNotesPanel inline citation={citation} onClose={close} onAddNote={vi.fn()} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} /></div>);
    const viewport = screen.getByTestId('scroll');
    Object.defineProperty(viewport, 'clientWidth', { value: 100 });
    fireEvent.pointerDown(viewport, { clientX: 102 });
    expect(close).not.toHaveBeenCalled();
    fireEvent.pointerDown(viewport, { clientX: 90 });
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('renders inline comments without duplicating the source and preserves failed input', async () => {
    const onAddNote = vi.fn().mockResolvedValue(false);
    render(<PassageNotesPanel inline citation={{ ...citation, page: '35' }} onClose={vi.fn()} onAddNote={onAddNote} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} />);
    expect(screen.queryByRole('heading', { name: '댓글 · 35쪽' })).toBeNull();
    expect(document.querySelector('time')).toBeNull();
    expect(screen.queryByText('검토할 문장')).toBeNull();
    const input = screen.getByPlaceholderText('댓글을 남기세요');
    fireEvent.change(input, { target: { value: '실패해도 남길 댓글' } });
    fireEvent.click(screen.getByRole('button', { name: '메모 저장' }));
    await waitFor(() => expect(onAddNote).toHaveBeenCalledWith('citation-1', '실패해도 남길 댓글'));
    expect((input as HTMLTextAreaElement).value).toBe('실패해도 남길 댓글');
  });
  it('does not add a draft until explicit save succeeds', async () => {
    const onAddNote = vi.fn().mockResolvedValue(true);
    render(<PassageNotesPanel citation={citation} onClose={vi.fn()} onAddNote={onAddNote} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('이 구절에 대한 생각을 적으세요.'), { target: { value: '새 메모' } });
    expect(onAddNote).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '메모 저장' }));
    await waitFor(() => expect(onAddNote).toHaveBeenCalledWith('citation-1', '새 메모'));
  });

  it('saves with Enter and keeps Shift+Enter for a newline', async () => {
    const onAddNote = vi.fn().mockResolvedValue(true);
    render(<PassageNotesPanel citation={citation} onClose={vi.fn()} onAddNote={onAddNote} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} />);
    const textbox = screen.getByPlaceholderText('이 구절에 대한 생각을 적으세요.');
    fireEvent.change(textbox, { target: { value: '키보드 메모' } });

    fireEvent.keyDown(textbox, { key: 'Enter', shiftKey: true });
    expect(onAddNote).not.toHaveBeenCalled();
    fireEvent.keyDown(textbox, { key: 'Enter' });
    await waitFor(() => expect(onAddNote).toHaveBeenCalledWith('citation-1', '키보드 메모'));

    const saveButton = screen.getByRole('button', { name: '메모 저장' });
    expect(saveButton.textContent).toBe('');
    expect(saveButton.className).toContain('w-10');
  });

  it('does not save when Enter confirms an IME composition', () => {
    const onAddNote = vi.fn();
    render(<PassageNotesPanel citation={citation} onClose={vi.fn()} onAddNote={onAddNote} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} />);
    const textbox = screen.getByPlaceholderText('이 구절에 대한 생각을 적으세요.');
    fireEvent.change(textbox, { target: { value: '조합 중' } });
    fireEvent.keyDown(textbox, { key: 'Enter', isComposing: true });
    expect(onAddNote).not.toHaveBeenCalled();
  });

  it('closes on Escape and an outside click but ignores passage triggers', () => {
    const onClose = vi.fn();
    render(<><button data-passage-note-trigger>구절</button><PassageNotesPanel citation={citation} onClose={onClose} onAddNote={vi.fn()} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} /></>);

    fireEvent.pointerDown(screen.getByRole('button', { name: '구절' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('does not clear the next passage draft when the previous save finishes late', async () => {
    let finishSave!: (value: boolean) => void;
    const onAddNote = vi.fn(() => new Promise<boolean>((resolve) => { finishSave = resolve; }));
    const { rerender } = render(<PassageNotesPanel citation={citation} onClose={vi.fn()} onAddNote={onAddNote} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('이 구절에 대한 생각을 적으세요.'), { target: { value: 'A 메모' } });
    fireEvent.click(screen.getByRole('button', { name: '메모 저장' }));

    rerender(<PassageNotesPanel citation={{ ...citation, id: 'citation-2', text: '다음 문장' }} onClose={vi.fn()} onAddNote={onAddNote} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} />);
    const textbox = screen.getByPlaceholderText('이 구절에 대한 생각을 적으세요.');
    fireEvent.change(textbox, { target: { value: 'B 메모' } });
    finishSave(true);

    await waitFor(() => expect((textbox as HTMLTextAreaElement).value).toBe('B 메모'));
  });
});
