import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Citation } from '../types';
import { CitationCard } from '../features/archive/ui/CitationCard';
import { CitationEditor } from '../features/citation-entry/ui/CitationEditor';

const citation: Citation = {
  id: 'citation-1',
  text: 'Font preference should affect this quote.',
  author: 'Charlie Munger',
  book: "Poor Charlie's Almanack",
  page: '147',
  notes: [],
  tags: [],
  createdAt: Date.now(),
};

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.testid === 'citation-text') {
      return (this.textContent?.length ?? 0) > 200 ? 120 : 40;
    }

    return 40;
  });

  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.testid === 'citation-text') {
      return 40;
    }

    return 40;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Citation typography', () => {
  it('does not hardcode the archive editor text area to serif utility classes', () => {
    render(<CitationEditor onAddCitation={vi.fn()} username="Dalek" />);

    const editor = screen.getByPlaceholderText('Write a quote, sentence, or field note...');
    expect(editor.className).not.toContain('font-serif');
    expect(editor.className).not.toContain('placeholder:font-sans');
  });

  it('starts the archive editor at a fixed empty height before typing', () => {
    render(<CitationEditor onAddCitation={vi.fn()} username="Dalek" />);

    const editor = screen.getByPlaceholderText('Write a quote, sentence, or field note...');
    expect((editor as HTMLTextAreaElement).style.height).toBe('72px');
  });

  it('keeps quote text away from the focus edge', () => {
    render(<CitationEditor onAddCitation={vi.fn()} username="Dalek" />);

    const editor = screen.getByPlaceholderText('Write a quote, sentence, or field note...');
    expect(editor.className).toContain('px-2');
    expect(editor.className).toContain('py-1.5');
    expect(editor.className).toContain('focus:outline-none');
  });

  it('moves focus from quote to page before submitting in sequential book-entry mode', async () => {
    const user = userEvent.setup();
    const onAddCitation = vi.fn().mockResolvedValue({ ok: true, citationId: 'citation-2' });

    render(
      <CitationEditor
        onAddCitation={onAddCitation}
        username="Dalek"
        prefillData={{ author: 'Charlie Munger', book: "Poor Charlie's Almanack" }}
        sequentialPageEntry
        autoFocusText
      />
    );

    const editor = screen.getByPlaceholderText('Write a quote, sentence, or field note...');
    const pageInput = screen.getByPlaceholderText('Page');

    await waitFor(() => expect(document.activeElement).toBe(editor));
    await user.type(editor, 'A practical idea');
    await user.keyboard('{Enter}');

    expect(onAddCitation).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(pageInput);
  });

  it('submits from the page field and returns focus to the quote field in sequential mode', async () => {
    const user = userEvent.setup();
    const onAddCitation = vi.fn().mockResolvedValue({ ok: true, citationId: 'citation-3' });

    render(
      <CitationEditor
        onAddCitation={onAddCitation}
        username="Dalek"
        prefillData={{ author: 'Charlie Munger', book: "Poor Charlie's Almanack" }}
        sequentialPageEntry
        autoFocusText
      />
    );

    const editor = screen.getByPlaceholderText('Write a quote, sentence, or field note...');
    const pageInput = screen.getByPlaceholderText('Page');

    await user.type(editor, 'Another quote');
    await user.keyboard('{Enter}');
    await user.type(pageInput, '147');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(onAddCitation).toHaveBeenCalledWith({
        text: 'Another quote',
        author: 'Charlie Munger',
        book: "Poor Charlie's Almanack",
        page: '147',
        tags: []
      });
      expect((editor as HTMLTextAreaElement).value).toBe('');
      expect((pageInput as HTMLInputElement).value).toBe('');
      expect(document.activeElement).toBe(editor);
    });
  });

  it('hides source fields in book view while submitting with the selected source', async () => {
    const user = userEvent.setup();
    const onAddCitation = vi.fn().mockResolvedValue({ ok: true, citationId: 'citation-compact' });

    render(
      <CitationEditor
        onAddCitation={onAddCitation}
        username="Dalek"
        prefillData={{ author: 'Ursula K. Le Guin', book: 'The Dispossessed' }}
        sequentialPageEntry
        hideSourceFields
      />
    );

    const editor = screen.getByPlaceholderText('Write a quote, sentence, or field note...');
    const pageInput = screen.getByPlaceholderText('Page');

    expect(screen.queryByPlaceholderText('Author')).toBeNull();
    expect(screen.queryByPlaceholderText('Book')).toBeNull();

    await user.type(editor, 'Freedom is a heavy load.');
    await user.keyboard('{Enter}');
    await user.type(pageInput, '341');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(onAddCitation).toHaveBeenCalledWith({
        text: 'Freedom is a heavy load.',
        author: 'Ursula K. Le Guin',
        book: 'The Dispossessed',
        page: '341',
        tags: [],
      });
    });
  });

  it('keeps shift-enter as a newline in the quote field during sequential mode', async () => {
    const user = userEvent.setup();
    const onAddCitation = vi.fn();

    render(
      <CitationEditor
        onAddCitation={onAddCitation}
        username="Dalek"
        prefillData={{ author: 'Charlie Munger', book: "Poor Charlie's Almanack" }}
        sequentialPageEntry
      />
    );

    const editor = screen.getByPlaceholderText('Write a quote, sentence, or field note...');

    await user.type(editor, 'Line 1');
    await user.keyboard('{Shift>}{Enter}{/Shift}');

    expect((editor as HTMLTextAreaElement).value).toBe('Line 1\n');
    expect(onAddCitation).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(editor);
  });

  it('does nothing on shift-enter in the page field during sequential mode', async () => {
    const user = userEvent.setup();
    const onAddCitation = vi.fn();

    render(
      <CitationEditor
        onAddCitation={onAddCitation}
        username="Dalek"
        prefillData={{ author: 'Charlie Munger', book: "Poor Charlie's Almanack" }}
        sequentialPageEntry
      />
    );

    const editor = screen.getByPlaceholderText('Write a quote, sentence, or field note...');
    const pageInput = screen.getByPlaceholderText('Page');

    await user.type(editor, 'Line 1');
    await user.keyboard('{Enter}');
    await user.type(pageInput, '147');
    await user.keyboard('{Shift>}{Enter}{/Shift}');

    expect(onAddCitation).not.toHaveBeenCalled();
    expect((pageInput as HTMLInputElement).value).toBe('147');
    expect(document.activeElement).toBe(pageInput);
  });

  it('ignores repeated submit attempts while a save is still pending', async () => {
    const user = userEvent.setup();
    let resolveSave: ((value: { ok: true; citationId: string }) => void) | undefined;
    const onAddCitation = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );

    render(
      <CitationEditor
        onAddCitation={onAddCitation}
        username="Dalek"
        prefillData={{ author: 'Charlie Munger', book: "Poor Charlie's Almanack" }}
        sequentialPageEntry
      />
    );

    const editor = screen.getByPlaceholderText('Write a quote, sentence, or field note...');
    const pageInput = screen.getByPlaceholderText('Page');
    const submitButton = screen.getByRole('button');

    await user.type(editor, 'One slow quote');
    await user.keyboard('{Enter}');
    await user.type(pageInput, '147');
    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');
    await user.click(submitButton);

    expect(onAddCitation).toHaveBeenCalledTimes(1);
    expect(submitButton.hasAttribute('disabled')).toBe(true);

    resolveSave?.({ ok: true, citationId: 'citation-4' });

    await waitFor(() => {
      expect((editor as HTMLTextAreaElement).value).toBe('');
      expect((pageInput as HTMLInputElement).value).toBe('');
    });
  });

  it('does not hardcode quote content or edit text area to serif utility classes', async () => {
    const user = userEvent.setup();

    render(
      <CitationCard
        citation={citation}
        index={0}
        username="Dalek"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    const quote = screen.getByText('Font preference should affect this quote.');
    expect(quote.tagName).toBe('BLOCKQUOTE');
    expect(quote.className).not.toContain('font-serif');

    await user.dblClick(quote);

    const editTextarea = screen.getByDisplayValue('Font preference should affect this quote.');
    expect(editTextarea.tagName).toBe('TEXTAREA');
    expect(editTextarea.className).not.toContain('font-serif');
  });

  it('opens memo input alongside edit mode when the card is double-clicked', async () => {
    const user = userEvent.setup();

    render(
      <CitationCard
        citation={citation}
        index={0}
        username="Dalek"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    await user.dblClick(screen.getByText('Font preference should affect this quote.'));

    expect(screen.getByPlaceholderText('Add a new note...')).not.toBeNull();
  });

  it('keeps failed optimistic cards visible with retry and no memo input', async () => {
    const user = userEvent.setup();
    const onRetrySave = vi.fn();

    render(
      <CitationCard
        citation={{
          ...citation,
          id: 'optimistic-citation-1',
          saveStatus: 'failed',
        }}
        index={0}
        username="Dalek"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        onRetrySave={onRetrySave}
      />
    );

    expect(screen.getByText('저장에 실패했습니다. 다시 시도해주세요.')).not.toBeNull();

    await user.dblClick(screen.getByText('Font preference should affect this quote.'));

    expect(screen.queryByPlaceholderText('Add a new note...')).toBeNull();

    await user.click(screen.getByRole('button', { name: /다시 저장하기/i }));
    expect(onRetrySave).toHaveBeenCalledWith('optimistic-citation-1');
  });

  it('does not render per-card copy, edit, or delete buttons in the resting card UI', () => {
    render(
      <CitationCard
        citation={citation}
        index={0}
        username="Dalek"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    expect(screen.queryByTitle('Copy')).toBeNull();
    expect(screen.queryByTitle('Edit')).toBeNull();
    expect(screen.queryByTitle('Delete')).toBeNull();
  });

  it('places session cancel and save controls below the note input and removes the save note button', async () => {
    const user = userEvent.setup();

    render(
      <CitationCard
        citation={citation}
        index={0}
        username="Dalek"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    await user.dblClick(screen.getByText('Font preference should affect this quote.'));

    const noteInput = screen.getByPlaceholderText('Add a new note...');
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const saveButton = screen.getByRole('button', { name: /^save$/i });

    expect(screen.queryByRole('button', { name: /save note/i })).toBeNull();
    expect(
      noteInput.compareDocumentPosition(cancelButton) & Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0);
    expect(
      noteInput.compareDocumentPosition(saveButton) & Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0);
  });

  it('shows cancel and confirm controls inside the standalone note input', async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn();

    render(
      <CitationCard
        citation={citation}
        index={0}
        username="Dalek"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onAddNote={onAddNote}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /notes 0/i }));

    const noteInput = screen.getByPlaceholderText('Add a new note...');
    expect(noteInput.className).toContain('type-note');
    expect(screen.getByRole('button', { name: /cancel/i })).not.toBeNull();
    expect((screen.getByRole('button', { name: /confirm/i }) as HTMLButtonElement).disabled).toBe(true);

    await user.type(noteInput, 'Fresh memo');
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onAddNote).toHaveBeenCalledWith('citation-1', 'Fresh memo');
  });

  it('closes the standalone note input when cancel is pressed with existing memos', async () => {
    const user = userEvent.setup();

    render(
      <CitationCard
        citation={{
          ...citation,
          notes: [{ id: 'note-1', content: 'A compact memo', createdAt: Date.now() }],
        }}
        index={0}
        username="Dalek"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /notes 1/i }));
    await user.type(screen.getByPlaceholderText('Add a new note...'), 'Draft memo');
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByPlaceholderText('Add a new note...')).toBeNull();
    expect(screen.queryByDisplayValue('Draft memo')).toBeNull();
  });

  it('uses smaller note typography for saved memo text', async () => {
    const user = userEvent.setup();

    render(
      <CitationCard
        citation={{
          ...citation,
          notes: [{ id: 'note-1', content: 'A compact memo', createdAt: Date.now() }],
        }}
        index={0}
        username="Dalek"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /notes 1/i }));

    expect(screen.getByText('A compact memo').parentElement?.className).toContain('type-note');
  });

  it('cancels both quote editing and memo input together', async () => {
    const user = userEvent.setup();

    render(
      <CitationCard
        citation={citation}
        index={0}
        username="Dalek"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    await user.dblClick(screen.getByText('Font preference should affect this quote.'));
    const quoteEditor = screen.getByDisplayValue('Font preference should affect this quote.');
    await user.type(quoteEditor, ' revised');
    await user.type(screen.getByPlaceholderText('Add a new note...'), 'Draft note');
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByDisplayValue(/revised/)).toBeNull();
    expect(screen.queryByPlaceholderText('Add a new note...')).toBeNull();
    expect(screen.getByText('Font preference should affect this quote.')).not.toBeNull();
  });

  it('saves both quote edits and the memo input together', async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn();
    const onUpdate = vi.fn();

    render(
      <CitationCard
        citation={citation}
        index={0}
        username="Dalek"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onAddNote={onAddNote}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={onUpdate}
      />
    );

    await user.dblClick(screen.getByText('Font preference should affect this quote.'));
    const quoteEditor = screen.getByDisplayValue('Font preference should affect this quote.');
    await user.clear(quoteEditor);
    await user.type(quoteEditor, 'Updated quote');
    await user.type(screen.getByPlaceholderText('Add a new note...'), 'Fresh memo');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(onUpdate).toHaveBeenCalledWith('citation-1', {
      text: 'Updated quote',
      author: 'Charlie Munger',
      book: "Poor Charlie's Almanack",
      page: '147'
    });
    expect(onAddNote).toHaveBeenCalledWith('citation-1', 'Fresh memo');
    expect(screen.queryByPlaceholderText('Add a new note...')).toBeNull();
  });

  it('auto-cancels an untouched edit session when clicking outside the card', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <CitationCard
          citation={citation}
          index={0}
          username="Dalek"
          isSelected={false}
          onToggleSelect={vi.fn()}
          onAddNote={vi.fn()}
          onUpdateNote={vi.fn()}
          onDeleteNote={vi.fn()}
          onDelete={vi.fn()}
          onUpdate={vi.fn()}
        />
        <button type="button">Outside target</button>
      </div>
    );

    await user.dblClick(screen.getByText('Font preference should affect this quote.'));
    expect(screen.getByPlaceholderText('Add a new note...')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Outside target' }));

    expect(screen.queryByPlaceholderText('Add a new note...')).toBeNull();
    expect(screen.getByText('Font preference should affect this quote.')).not.toBeNull();
  });

  it('keeps the edit session open on outside click when there are unsaved changes', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <CitationCard
          citation={citation}
          index={0}
          username="Dalek"
          isSelected={false}
          onToggleSelect={vi.fn()}
          onAddNote={vi.fn()}
          onUpdateNote={vi.fn()}
          onDeleteNote={vi.fn()}
          onDelete={vi.fn()}
          onUpdate={vi.fn()}
        />
        <button type="button">Outside target</button>
      </div>
    );

    await user.dblClick(screen.getByText('Font preference should affect this quote.'));
    await user.type(screen.getByPlaceholderText('Add a new note...'), 'Draft note');
    await user.click(screen.getByRole('button', { name: 'Outside target' }));

    expect(screen.getByPlaceholderText('Add a new note...')).not.toBeNull();
    expect(screen.getByDisplayValue('Draft note')).not.toBeNull();
  });

  it('starts long citations in a collapsed state with a More action', async () => {
    render(
      <CitationCard
        citation={{
          ...citation,
          text: 'Long quote '.repeat(80),
        }}
        index={0}
        username="Dalek"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    const moreButton = await screen.findByRole('button', { name: /more/i });
    expect(moreButton).not.toBeNull();
    expect(moreButton.textContent).toBe('...More');
    expect(screen.getByTestId('citation-text').textContent).toContain('...More');
  });

  it('expands long citations when the More action is pressed', async () => {
    const user = userEvent.setup();

    render(
      <CitationCard
        citation={{
          ...citation,
          text: 'Long quote '.repeat(80),
        }}
        index={0}
        username="Dalek"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    await user.click(await screen.findByRole('button', { name: /more/i }));

    expect(screen.getByRole('button', { name: /less/i })).not.toBeNull();
    expect(screen.getByTestId('citation-text').className).not.toContain('line-clamp-2');
  });

  it('hides the current author chip when the archive is already scoped to that author', () => {
    render(
      <CitationCard
        citation={citation}
        index={0}
        username="Dalek"
        selectedFilter={{ type: 'author', value: 'Charlie Munger' }}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    expect(screen.queryByText('Charlie Munger')).toBeNull();
    expect(screen.getByText("Poor Charlie's Almanack")).not.toBeNull();
    expect(screen.getByText('p.147')).not.toBeNull();
  });

  it('hides both author and book chips when the archive is already scoped to that book', () => {
    render(
      <CitationCard
        citation={citation}
        index={0}
        username="Dalek"
        selectedFilter={{ type: 'book', value: "Poor Charlie's Almanack", author: 'Charlie Munger' }}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    expect(screen.queryByText('Charlie Munger')).toBeNull();
    expect(screen.queryByText("Poor Charlie's Almanack")).toBeNull();
    expect(screen.getByText('p.147')).not.toBeNull();
  });
});
