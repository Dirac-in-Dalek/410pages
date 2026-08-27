import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthorDeleteDialog } from './AuthorDeleteDialog';

describe('AuthorDeleteDialog', () => {
  it('requires two confirmation actions and shows cascade counts', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue({
      authorId: 'author-1', deletedBookIds: ['book-1'], deletedBookCount: 1, deletedCitationCount: 3,
    });
    render(<AuthorDeleteDialog authorId="author-1" authorName="Author" bookCount={1} citationCount={3} onClose={vi.fn()} onDelete={onDelete} />);

    expect(screen.getByText(/책 1권과 인용문 3개/)).not.toBeNull();
    expect(screen.queryByRole('button', { name: '저자와 모든 기록 삭제' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '삭제 계속' }));
    await user.click(screen.getByRole('button', { name: '저자와 모든 기록 삭제' }));

    expect(onDelete).toHaveBeenCalledOnce();
  });
});
