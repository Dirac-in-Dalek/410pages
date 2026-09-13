import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CitationCard } from './CitationCard';
import { CitationEditDraftStore } from '../logic/citationEditDrafts';
import type { Citation } from '../../../types';

const citation: Citation = { id: 'q', kind: 'sentence', text: 'Original quote', author: 'Author', book: 'Book', notes: [{ id: 'n', content: 'Original note', createdAt: 1 }], tags: [], createdAt: 1 };
describe('session-owned citation drafts', () => {
  it.each(['new-note', 'quote', 'existing-note', 'pristine-quote'] as const)('keeps %s saving locked and synchronizes completion across remounts', async kind => {
    let resolve!: (value: boolean) => void;
    const pending = new Promise<boolean>(done => { resolve = done; });
    const save = vi.fn(() => pending);
    const drafts = new CitationEditDraftStore();
    drafts.set('q', { isEditing: kind === 'quote' || kind === 'pristine-quote', isNotesExpanded: true, newNote: kind === 'new-note' ? 'First note' : '', editingNoteId: kind === 'existing-note' ? 'n' : null, editNoteContent: 'Edited note', editText: kind === 'pristine-quote' ? citation.text : 'Edited quote', editAuthor: citation.author, editBook: citation.book, editPage: '' });
    const card = <CitationCard citation={citation} index={0} username="Reader" showDetailActions isSelected={false} editDrafts={drafts} onToggleSelect={vi.fn()} onAddNote={save} onUpdateNote={save} onDeleteNote={vi.fn()} onDelete={vi.fn()} onUpdate={save} onRetrySave={vi.fn()} />;
    const view = render(card);
    fireEvent.click(screen.getByRole('button', { name: kind === 'new-note' ? '추가' : '저장' }));
    fireEvent.mouseDown(document.body);
    view.rerender(null);
    view.rerender(card);
    const input = kind === 'new-note' ? screen.getByPlaceholderText('이 인용문에 메모 추가…') : (kind === 'quote' || kind === 'pristine-quote') ? screen.getByRole('textbox', { name: '인용문 내용 수정' }) : screen.getAllByRole('textbox').find(e => (e as HTMLTextAreaElement).value === 'Edited note')!;
    expect((input as HTMLTextAreaElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: kind === 'new-note' ? '추가' : '저장' }));
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => resolve(true));
    if (kind === 'new-note') {
      const next = screen.getByPlaceholderText('이 인용문에 메모 추가…') as HTMLTextAreaElement;
      expect(next.value).toBe('');
      fireEvent.click(screen.getByRole('button', { name: '추가' }));
      expect(save).toHaveBeenCalledTimes(1);
      fireEvent.change(next, { target: { value: 'Second unsaved note' } });
      view.rerender(null);
      view.rerender(card);
      expect((screen.getByPlaceholderText('이 인용문에 메모 추가…') as HTMLTextAreaElement).value).toBe('Second unsaved note');
    } else {
      expect(screen.queryByRole('textbox', { name: '인용문 내용 수정' })).toBeNull();
      expect(screen.queryAllByRole('textbox').some(e => (e as HTMLTextAreaElement).value === 'Edited note')).toBe(false);
    }
  });
});

it('starts a fresh edit with current source names after a memo-only visit', async () => {
  const drafts = new CitationEditDraftStore();
  drafts.set('q', { isEditing: false, isNotesExpanded: true, newNote: '', editingNoteId: null, editNoteContent: '', editText: citation.text, editAuthor: 'Old author', editBook: 'Old book', editPage: '' });
  const update = vi.fn().mockResolvedValue(true);
  render(<CitationCard citation={{ ...citation, author: 'Current author', book: 'Current book' }} index={0} username="Reader" showDetailActions isSelected={false} editDrafts={drafts} onToggleSelect={vi.fn()} onAddNote={vi.fn()} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} onDelete={vi.fn()} onUpdate={update} onRetrySave={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: '편집' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '저장' })); });
  expect(update).toHaveBeenCalledWith('q', expect.objectContaining({ author: 'Current author', book: 'Current book' }));
});
