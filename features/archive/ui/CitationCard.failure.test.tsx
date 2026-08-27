import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Citation } from '../../../types';
import { CitationCard } from './CitationCard';

const citation: Citation = {
  id: 'citation-1',
  kind: 'sentence',
  text: 'Original sentence',
  author: 'Author',
  book: 'Book',
  notes: [],
  tags: [],
  createdAt: 1,
};

const renderCard = (overrides: Partial<React.ComponentProps<typeof CitationCard>> = {}) => render(
  <CitationCard
    citation={citation}
    index={0}
    username="Reader"
    showDetailActions
    isSelected={false}
    onToggleSelect={vi.fn()}
    onAddNote={vi.fn()}
    onUpdateNote={vi.fn()}
    onDeleteNote={vi.fn()}
    onDelete={vi.fn()}
    onUpdate={vi.fn()}
    onRetrySave={vi.fn()}
    {...overrides}
  />
);

describe('CitationCard failed saves', () => {
  it('keeps a sentence edit open when the update fails', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(false);
    renderCard({ onUpdate });

    await user.click(screen.getByRole('button', { name: '편집' }));
    const editor = screen.getByDisplayValue('Original sentence');
    await user.clear(editor);
    await user.type(editor, 'Edited but unsaved');
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect((screen.getByDisplayValue('Edited but unsaved') as HTMLTextAreaElement).value).toBe('Edited but unsaved');
  });

  it('keeps a new note draft when adding the note fails', async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn().mockResolvedValue(false);
    renderCard({ onAddNote });

    await user.click(screen.getByRole('button', { name: '메모 0개' }));
    const noteInput = screen.getByPlaceholderText('메모 추가…');
    await user.type(noteInput, 'Do not lose this');
    await user.click(screen.getByRole('button', { name: '추가' }));

    await waitFor(() => expect(onAddNote).toHaveBeenCalledWith('citation-1', 'Do not lose this'));
    expect((screen.getByPlaceholderText('메모 추가…') as HTMLTextAreaElement).value).toBe('Do not lose this');
  });

  it('submits a new note only once while the first request is pending', async () => {
    const user = userEvent.setup();
    let resolveSave!: (value: boolean) => void;
    const onAddNote = vi.fn(
      () => new Promise<boolean>((resolve) => { resolveSave = resolve; })
    );
    renderCard({ onAddNote });

    await user.click(screen.getByRole('button', { name: '메모 0개' }));
    const noteInput = screen.getByPlaceholderText('메모 추가…');
    await user.type(noteInput, 'Only once');
    const addButton = screen.getByRole('button', { name: '추가' });
    await user.click(addButton);
    await user.click(addButton);

    expect(onAddNote).toHaveBeenCalledTimes(1);
    expect((addButton as HTMLButtonElement).disabled).toBe(true);

    resolveSave(true);
    await waitFor(() => expect(screen.queryByDisplayValue('Only once')).toBeNull());
  });

  it('does not submit a note while IME composition is active', async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn();
    renderCard({ onAddNote });

    await user.click(screen.getByRole('button', { name: '메모 0개' }));
    const noteInput = screen.getByPlaceholderText('메모 추가…');
    await user.type(noteInput, '한');

    const keyDownEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(keyDownEvent, 'isComposing', {
      configurable: true,
      value: true,
    });
    fireEvent(noteInput, keyDownEvent);

    expect(onAddNote).not.toHaveBeenCalled();
    expect((noteInput as HTMLTextAreaElement).value).toBe('한');
  });
});
