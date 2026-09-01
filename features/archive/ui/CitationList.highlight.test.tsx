import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Citation } from '../../../types';
import { CitationList } from './CitationList';

const citation: Citation = {
  id: 'citation-1',
  kind: 'sentence',
  text: '드래그해서 강조할 문장',
  author: '저자',
  book: '책',
  notes: [],
  tags: [],
  createdAt: 1,
};

const renderList = (onUpdateCitation: ReturnType<typeof vi.fn>, onPassageNoteCitationChange = vi.fn()) => render(
  <CitationList
    citations={[citation]}
    projects={[]}
    username="독자"
    loading={false}
    searchTerm=""
    selectedIds={new Set()}
    isBookView
    onToggleSelect={vi.fn()}
    onAddNote={vi.fn()}
    onUpdateNote={vi.fn()}
    onDeleteNote={vi.fn()}
    onDeleteCitation={vi.fn()}
    onUpdateCitation={onUpdateCitation}
    onRetryCitationSave={vi.fn()}
    onPassageNoteCitationChange={onPassageNoteCitationChange}
  />
);

describe('CitationList book-view highlights', () => {
  it('saves a dragged text range without opening passage notes', async () => {
    const onUpdateCitation = vi.fn();
    const onPassageNoteCitationChange = vi.fn();
    renderList(onUpdateCitation, onPassageNoteCitationChange);
    const text = screen.getByTestId('book-citation-text-citation-1');
    const range = document.createRange();
    range.setStart(text.firstChild!, 0);
    range.setEnd(text.firstChild!, 4);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    fireEvent.mouseUp(text, { detail: 1 });
    fireEvent.click(text.parentElement!);

    await waitFor(() => expect(onUpdateCitation).toHaveBeenCalledWith('citation-1', {
      highlights: [expect.objectContaining({ start: 0, end: 4, color: 'yellow' })],
    }));
    expect(onPassageNoteCitationChange).not.toHaveBeenCalled();
  });

  it('renders a saved highlight and removes it with the keyboard', async () => {
    const onUpdateCitation = vi.fn();
    render(
      <CitationList
        citations={[{ ...citation, highlights: [{ id: 'hl-1', start: 0, end: 4, color: 'yellow' }] }]}
        projects={[]}
        username="독자"
        loading={false}
        searchTerm=""
        selectedIds={new Set()}
        isBookView
        onToggleSelect={vi.fn()}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDeleteCitation={vi.fn()}
        onUpdateCitation={onUpdateCitation}
        onRetryCitationSave={vi.fn()}
        onPassageNoteCitationChange={vi.fn()}
      />
    );

    const highlight = screen.getByRole('button', { name: /하이라이트 제거:/ });
    expect(highlight.getAttribute('tabindex')).toBe('0');
    await act(async () => fireEvent.keyDown(highlight, { key: 'Enter' }));
    expect(onUpdateCitation).toHaveBeenCalledWith('citation-1', { highlights: [] });
  });

  it('rolls back an optimistic highlight when saving fails', async () => {
    const onUpdateCitation = vi.fn().mockResolvedValue(false);
    renderList(onUpdateCitation);
    const text = screen.getByTestId('book-citation-text-citation-1');
    const range = document.createRange();
    range.setStart(text.firstChild!, 0);
    range.setEnd(text.firstChild!, 4);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    fireEvent.mouseUp(text, { detail: 1 });
    expect(screen.getByTitle('눌러서 강조 제거')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTitle('눌러서 강조 제거')).toBeNull());
  });

  it('does not open passage notes when text is dragged while highlight saving is disabled', () => {
    const onPassageNoteCitationChange = vi.fn();
    render(
      <CitationList
        citations={[{ ...citation, saveStatus: 'saving' }]}
        projects={[]}
        username="독자"
        loading={false}
        searchTerm=""
        selectedIds={new Set()}
        isBookView
        onToggleSelect={vi.fn()}
        onAddNote={vi.fn()}
        onUpdateNote={vi.fn()}
        onDeleteNote={vi.fn()}
        onDeleteCitation={vi.fn()}
        onUpdateCitation={vi.fn()}
        onRetryCitationSave={vi.fn()}
        onPassageNoteCitationChange={onPassageNoteCitationChange}
      />
    );
    const text = screen.getByTestId('book-citation-text-citation-1');
    const range = document.createRange();
    range.setStart(text.firstChild!, 0);
    range.setEnd(text.firstChild!, 4);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    fireEvent.mouseUp(text, { detail: 1 });
    fireEvent.click(text.parentElement!);
    expect(onPassageNoteCitationChange).not.toHaveBeenCalled();
  });
});
