import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CitationCard } from './CitationCard';
import { CitationEditor } from './CitationEditor';
import type { Citation } from '../types';

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
    expect(screen.getByTestId('citation-text').className).toContain('line-clamp-2');
    expect(screen.getByTestId('citation-text').className).toContain('lg:line-clamp-3');
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
});
