import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AuthorSource, Citation } from '../../../types';
import { sortAuthorsByActivity } from '../logic/archiveTree';
import { LibraryHome } from './LibraryHome';

describe('LibraryHome', () => {
  it('shows a retry action instead of claiming the library is empty after a load failure', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <LibraryHome
        authors={[]}
        books={[]}
        citations={[]}
        username="Reader"
        loading={false}
        loadError="책장을 불러오지 못했습니다."
        onRetry={onRetry}
        onCreateAuthor={vi.fn()}
        onAuthorSelect={vi.fn()}
        onRenameAuthor={vi.fn()}
        onDeleteAuthor={vi.fn()}
        onPreviewAuthorDelete={vi.fn()}
        isMobileApp={false}
      />
    );

    expect(screen.getByRole('alert').textContent).toContain('책장을 불러오지 못했습니다.');
    expect(screen.queryByText('아직 책장이 비어 있습니다.')).toBeNull();

    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('keeps a failed author name and moves to the author after success', async () => {
    const user = userEvent.setup();
    const author: AuthorSource = {
      id: 'author-1', name: '정희진', sortIndex: 0, createdAt: 100, isSelf: false,
    };
    const onCreateAuthor = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(author);
    const onAuthorSelect = vi.fn();

    render(
      <LibraryHome
        authors={[]}
        books={[]}
        citations={[]}
        username="Reader"
        loading={false}
        loadError={null}
        onRetry={vi.fn()}
        onCreateAuthor={onCreateAuthor}
        onAuthorSelect={onAuthorSelect}
        onRenameAuthor={vi.fn()}
        onDeleteAuthor={vi.fn()}
        onPreviewAuthorDelete={vi.fn()}
        isMobileApp={false}
      />
    );

    await user.click(screen.getByRole('button', { name: '저자 추가' }));
    await user.type(screen.getByRole('textbox', { name: '저자 이름' }), '정희진');
    await user.click(screen.getByRole('button', { name: '추가' }));
    expect((screen.getByRole('textbox', { name: '저자 이름' }) as HTMLInputElement).value).toBe('정희진');

    await user.click(screen.getByRole('button', { name: '추가' }));
    expect(onAuthorSelect).toHaveBeenCalledWith(author);
  });

  it('orders authors by their latest persisted activity', () => {
    const authors: AuthorSource[] = [
      { id: 'a', name: 'A', sortIndex: 0, createdAt: 100, isSelf: false },
      { id: 'b', name: 'B', sortIndex: 1, createdAt: 200, isSelf: false },
    ];
    const citation = {
      id: 'c', kind: 'sentence', text: '문장', authorId: 'a', author: 'A', book: '', notes: [], tags: [], createdAt: 300,
    } as Citation;

    expect(sortAuthorsByActivity(authors, [citation]).map((author) => author.id)).toEqual(['a', 'b']);
  });

  it('centers the author name without a decorative sequence label', () => {
    render(
      <LibraryHome
        authors={[{ id: 'author-1', name: '긴 저자 이름', sortIndex: 0, createdAt: 1, isSelf: false }]}
        books={[]}
        citations={[]}
        username="Reader"
        loading={false}
        loadError={null}
        onRetry={vi.fn()}
        onCreateAuthor={vi.fn()}
        onAuthorSelect={vi.fn()}
        onRenameAuthor={vi.fn()}
        onDeleteAuthor={vi.fn()}
        onPreviewAuthorDelete={vi.fn()}
        isMobileApp={false}
      />
    );

    expect(screen.queryByText(/Author ·/)).toBeNull();
    expect(screen.getByText('긴 저자 이름').parentElement?.className).toContain('justify-center');
    expect(screen.getByText('책 0권')).not.toBeNull();
  });

  it('opens the same rename and delete menu from the tile action and right click', async () => {
    const user = userEvent.setup();
    const author = { id: 'author-1', name: 'Dirac', sortIndex: 0, createdAt: 1, isSelf: false } as AuthorSource;
    const onRenameAuthor = vi.fn().mockResolvedValue(true);
    const onPreviewAuthorDelete = vi.fn().mockResolvedValue({ authorId: author.id, bookIds: [], bookCount: 0, citationCount: 0 });
    render(
      <LibraryHome
        authors={[author]}
        books={[]}
        citations={[]}
        username="Reader"
        loading={false}
        loadError={null}
        onRetry={vi.fn()}
        onCreateAuthor={vi.fn()}
        onAuthorSelect={vi.fn()}
        onRenameAuthor={onRenameAuthor}
        onDeleteAuthor={vi.fn()}
        onPreviewAuthorDelete={onPreviewAuthorDelete}
        isMobileApp={false}
      />
    );

    const manageButton = screen.getByRole('button', { name: 'Dirac 관리' });
    expect(manageButton.className).toContain('opacity-0');
    await user.click(manageButton);
    expect(screen.getByRole('menu').className).toContain('bottom-3');
    expect(screen.getByRole('menu').className).toContain('right-[3.25rem]');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: /이름 변경/ }));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '삭제' }));
    await user.keyboard('{ArrowUp}');
    await user.click(screen.getByRole('menuitem', { name: /이름 변경/ }));
    await user.clear(screen.getByRole('textbox', { name: 'Dirac 이름 변경' }));
    await user.type(screen.getByRole('textbox', { name: 'Dirac 이름 변경' }), 'Paul Dirac');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(onRenameAuthor).toHaveBeenCalledWith(author.id, 'Paul Dirac');

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Dirac의 책 보기' }));
    await user.click(screen.getByRole('menuitem', { name: '삭제' }));
    expect(onPreviewAuthorDelete).toHaveBeenCalledWith(author.id);
    expect(screen.getByRole('dialog')).not.toBeNull();
  });

  it('keeps author management visible whenever the app is in mobile mode', () => {
    render(
      <LibraryHome
        authors={[{ id: 'author-1', name: 'Tablet Author', sortIndex: 0, createdAt: 1, isSelf: false }]}
        books={[]}
        citations={[]}
        username="Reader"
        loading={false}
        loadError={null}
        onRetry={vi.fn()}
        onCreateAuthor={vi.fn()}
        onAuthorSelect={vi.fn()}
        onRenameAuthor={vi.fn()}
        onDeleteAuthor={vi.fn()}
        onPreviewAuthorDelete={vi.fn()}
        isMobileApp
      />
    );

    expect(screen.getByRole('button', { name: 'Tablet Author 관리' }).className).toContain('opacity-100');
  });
});
