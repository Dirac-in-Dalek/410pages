import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BookDeleteDialog } from './BookDeleteDialog';

describe('BookDeleteDialog', () => {
  it('requires two confirmations and submits the exact book id once', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue({ bookId: 'book-1', deletedCitationCount: 3 });
    render(<BookDeleteDialog bookId="book-1" bookTitle="Book" citationCount={3} onClose={vi.fn()} onDelete={onDelete} />);

    expect(screen.getByText(/인용문 3개와 메모·챕터/)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: '삭제 계속' }));
    await user.click(screen.getByRole('button', { name: '책과 모든 기록 삭제' }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith('book-1');
  });
});
