import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

    await user.click(screen.getByTitle('Edit'));

    const editTextarea = screen.getByDisplayValue('Font preference should affect this quote.');
    expect(editTextarea.tagName).toBe('TEXTAREA');
    expect(editTextarea.className).not.toContain('font-serif');
  });
});
