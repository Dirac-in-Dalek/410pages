import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AuthorSource, BookSource } from '../../../types';
import { AuthorBooks } from './AuthorBooks';

const author: AuthorSource = {
  id: 'author-1', name: '정희진', sortIndex: 0, createdAt: 100, isSelf: false,
};
const book: BookSource = {
  id: 'book-1', title: '정정하는 힘', sortIndex: 0, createdAt: 200,
  authorId: author.id, author: author.name, authorSortIndex: 0, isSelf: false,
};

const renderBooks = (overrides: Partial<React.ComponentProps<typeof AuthorBooks>> = {}) => render(
  <AuthorBooks
    author={author}
    username="Reader"
    books={[]}
    citations={[]}
    isMobileApp={false}
    loading={false}
    loadError={null}
    onRetry={vi.fn()}
    onBack={vi.fn()}
    onCreateBook={vi.fn().mockResolvedValue(book)}
    onBookSelect={vi.fn()}
    onReadPdf={vi.fn()}
    onBeforeReadPdf={() => true}
    onRenameBook={vi.fn()}
    onDeleteBook={vi.fn()}
    onPreviewBookDelete={vi.fn()}
    {...overrides}
  />
);

describe('AuthorBooks', () => {
  it('creates a book with the selected author id and opens its citation view', async () => {
    const user = userEvent.setup();
    const onCreateBook = vi.fn().mockResolvedValue(book);
    const onBookSelect = vi.fn();
    renderBooks({ onCreateBook, onBookSelect });

    await user.click(screen.getByRole('button', { name: '책 추가' }));
    await user.type(screen.getByRole('textbox', { name: '책 제목' }), book.title);
    await user.click(screen.getByRole('button', { name: '시작' }));

    expect(onCreateBook).toHaveBeenCalledWith({ authorId: author.id, title: book.title });
    expect(onBookSelect).toHaveBeenCalledWith(book);
  });

  it('keeps the title after failure and offers PDF only on desktop', async () => {
    const user = userEvent.setup();
    renderBooks({ onCreateBook: vi.fn().mockResolvedValue(undefined) });

    await user.click(screen.getByRole('button', { name: '책 추가' }));
    await user.type(screen.getByRole('textbox', { name: '책 제목' }), '실패한 책');
    expect(screen.getByRole('button', { name: 'PDF로 추가하기' })).not.toBeNull();
    await user.click(screen.getByRole('button', { name: '시작' }));
    expect((screen.getByRole('textbox', { name: '책 제목' }) as HTMLInputElement).value).toBe('실패한 책');
  });

  it('hides PDF creation on mobile', async () => {
    const user = userEvent.setup();
    renderBooks({ isMobileApp: true });
    await user.click(screen.getByRole('button', { name: '책 추가' }));
    expect(screen.queryByRole('button', { name: 'PDF로 추가하기' })).toBeNull();
  });

  it('keeps the book management button visible on mobile', () => {
    renderBooks({ isMobileApp: true, books: [book] });
    expect(screen.getByRole('button', { name: '정정하는 힘 관리' }).className).toContain('opacity-100');
  });

  it('shows tile management on hover or mobile and opens the book delete preview', async () => {
    const user = userEvent.setup();
    const onPreviewBookDelete = vi.fn().mockResolvedValue({ bookId: book.id, citationCount: 3 });
    renderBooks({ books: [book], onPreviewBookDelete });

    const manageButton = screen.getByRole('button', { name: '정정하는 힘 관리' });
    expect(manageButton.className).toContain('group-hover:opacity-100');
    await user.click(manageButton);
    expect(screen.getByRole('menu').className).toContain('bottom-3');
    expect(screen.getByRole('menu').className).toContain('right-[3.25rem]');
    await user.click(screen.getByRole('menuitem', { name: '삭제' }));
    expect(onPreviewBookDelete).toHaveBeenCalledWith(book.id);
    expect(screen.getByText(/인용문 3개와 메모·장 구분/)).not.toBeNull();
  });

  it('keeps the book rename input when saving fails', async () => {
    const user = userEvent.setup();
    const onRenameBook = vi.fn().mockResolvedValue(false);
    renderBooks({ books: [book], onRenameBook });

    await user.click(screen.getByRole('button', { name: '정정하는 힘 관리' }));
    await user.click(screen.getByRole('menuitem', { name: /이름 변경/ }));
    const input = screen.getByRole('textbox', { name: '정정하는 힘 이름 변경' });
    await user.clear(input);
    await user.type(input, '새 제목');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect((input as HTMLInputElement).value).toBe('새 제목');
  });
});
