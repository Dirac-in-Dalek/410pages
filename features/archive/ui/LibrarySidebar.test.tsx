import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LibrarySidebar } from './LibrarySidebar';

describe('LibrarySidebar', () => {
  it('starts a new book from the top of the library', async () => {
    const user = userEvent.setup();
    const onCreateBook = vi.fn().mockResolvedValue(undefined);

    render(
      <LibrarySidebar
        treeData={[]}
        onTreeItemClick={vi.fn()}
        onProjectSelect={vi.fn()}
        selectedProjectId={null}
        selectedFilter={null}
        onCreateBook={onCreateBook}
        width={280}
        isResizing={false}
        onStartResize={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: '새 책 읽기' }));
    expect(screen.getByLabelText('책 제목').compareDocumentPosition(screen.getByLabelText('저자'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    await user.type(screen.getByLabelText('책 제목'), 'The Dispossessed');
    await user.type(screen.getByLabelText('저자'), 'Ursula K. Le Guin');
    await user.click(screen.getByRole('button', { name: '시작' }));

    await waitFor(() => {
      expect(onCreateBook).toHaveBeenCalledWith({
        author: 'Ursula K. Le Guin',
        title: 'The Dispossessed',
      });
    });
  });

  it('keeps the new book dialog open when creation fails', async () => {
    const user = userEvent.setup();
    const onCreateBook = vi.fn().mockResolvedValue(undefined);

    render(
      <LibrarySidebar
        treeData={[]}
        onTreeItemClick={vi.fn()}
        onProjectSelect={vi.fn()}
        selectedProjectId={null}
        selectedFilter={null}
        onCreateBook={onCreateBook}
        width={280}
        isResizing={false}
        onStartResize={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: '새 책 읽기' }));
    await user.type(screen.getByLabelText('책 제목'), 'The Dispossessed');
    await user.type(screen.getByLabelText('저자'), 'Ursula K. Le Guin');
    await user.click(screen.getByRole('button', { name: '시작' }));

    await waitFor(() => {
      expect(onCreateBook).toHaveBeenCalled();
      expect((screen.getByLabelText('저자') as HTMLInputElement).value).toBe('Ursula K. Le Guin');
      expect((screen.getByLabelText('책 제목') as HTMLInputElement).value).toBe('The Dispossessed');
    });
  });
});
