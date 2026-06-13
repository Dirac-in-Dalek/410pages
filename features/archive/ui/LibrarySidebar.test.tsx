import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LibrarySidebar } from './LibrarySidebar';

describe('LibrarySidebar', () => {
  const treeData = [
    {
      id: 'author-1',
      label: 'Ursula K. Le Guin',
      type: 'author' as const,
      data: { authorId: 'author-1', author: 'Ursula K. Le Guin' },
      children: [
        {
          id: 'book-1',
          label: 'The Dispossessed',
          type: 'book' as const,
          data: {
            authorId: 'author-1',
            author: 'Ursula K. Le Guin',
            bookId: 'book-1',
            book: 'The Dispossessed',
          },
        },
      ],
    },
  ];

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

  it('deletes a book only after confirmation', async () => {
    const user = userEvent.setup();
    const onDeleteBook = vi.fn();

    render(
      <LibrarySidebar
        treeData={treeData}
        onTreeItemClick={vi.fn()}
        onProjectSelect={vi.fn()}
        selectedProjectId={null}
        selectedFilter={null}
        onDeleteBook={onDeleteBook}
        width={280}
        isResizing={false}
        onStartResize={vi.fn()}
      />
    );

    await user.click(screen.getByText('Ursula K. Le Guin'));
    await user.click(screen.getByRole('button', { name: 'Delete book' }));

    expect(onDeleteBook).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm delete book' }));

    expect(onDeleteBook).toHaveBeenCalledWith('book-1');
  });

  it('deletes an author only after confirmation', async () => {
    const user = userEvent.setup();
    const onDeleteAuthor = vi.fn();

    render(
      <LibrarySidebar
        treeData={treeData}
        onTreeItemClick={vi.fn()}
        onProjectSelect={vi.fn()}
        selectedProjectId={null}
        selectedFilter={null}
        onDeleteAuthor={onDeleteAuthor}
        width={280}
        isResizing={false}
        onStartResize={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete author' }));

    expect(onDeleteAuthor).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm delete author' }));

    expect(onDeleteAuthor).toHaveBeenCalledWith('author-1');
  });
});
