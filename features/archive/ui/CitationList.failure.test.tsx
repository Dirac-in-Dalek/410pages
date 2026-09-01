import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Citation } from '../../../types';
import { CitationList } from './CitationList';

const failedCitation: Citation = {
  id: '018f47a2-8594-7c09-a488-2f73384e4711',
  kind: 'sentence',
  text: '저장하지 못한 문장',
  author: '저자',
  book: '책',
  bookId: 'book-1',
  notes: [],
  tags: [],
  createdAt: 1,
  saveStatus: 'failed',
};

describe('CitationList book-view save recovery', () => {
  it('shows copy and retry actions directly on a failed flat row', async () => {
    const user = userEvent.setup();
    const onRetryCitationSave = vi.fn();

    render(
      <CitationList
        citations={[failedCitation]}
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
        onRetryCitationSave={onRetryCitationSave}
      />
    );

    expect(screen.getByRole('alert').textContent).toContain('저장 실패');
    expect(screen.getByRole('button', { name: '실패한 문장 복사' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '문장 다시 저장' }));
    expect(onRetryCitationSave).toHaveBeenCalledWith(failedCitation.id);
  });
});
