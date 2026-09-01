import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { SidebarItem } from '../../../types';
import { LibrarySidebarTree } from './LibrarySidebarTree';

const authorItem: SidebarItem = {
  id: 'author-author-1', label: 'Author', type: 'author',
  data: { authorId: 'author-1', author: 'Author', book: '' },
};
const folderTree: SidebarItem[] = [{
  id: 'author-folder-folder-1', label: '철학', type: 'author_folder',
  data: { folderId: 'folder-1', author: '', book: '' },
  children: [authorItem],
}];

describe('LibrarySidebarTree author folders', () => {
  it('reorders loose authors inside the same group', () => {
    const onReorderAuthorAt = vi.fn();
    const secondAuthor: SidebarItem = {
      ...authorItem,
      id: 'author-author-2',
      label: 'Second',
      data: { ...authorItem.data, authorId: 'author-2', author: 'Second' },
    };
    const store = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: '', dropEffect: '',
      get types() { return [...store.keys()]; },
      setData: (type: string, value: string) => { store.set(type, value); },
      getData: (type: string) => store.get(type) || '',
    };
    render(<LibrarySidebarTree embedded treeData={[authorItem, secondAuthor]} onTreeItemClick={vi.fn()} onReorderAuthorAt={onReorderAuthorAt} />);

    const authorRows = screen.getAllByRole('button', { name: /저자 순서 변경/ });
    fireEvent.dragStart(authorRows[0], { dataTransfer, clientY: 0 });
    fireEvent.dragOver(authorRows[1], { dataTransfer, clientY: 1 });
    fireEvent.drop(authorRows[1], { dataTransfer, clientY: 1 });

    expect(onReorderAuthorAt).toHaveBeenCalledWith(['author-1', 'author-2'], 'author-1', 2);
  });

  it('offers Alt+Arrow keyboard reordering for authors', () => {
    const onReorderAuthorAt = vi.fn();
    const secondAuthor: SidebarItem = {
      ...authorItem,
      id: 'author-author-2',
      label: 'Second',
      data: { ...authorItem.data, authorId: 'author-2', author: 'Second' },
    };
    render(<LibrarySidebarTree embedded treeData={[authorItem, secondAuthor]} onTreeItemClick={vi.fn()} onReorderAuthorAt={onReorderAuthorAt} />);

    const firstRow = screen.getByRole('button', { name: /Author.*Alt\+위아래 화살표/ });
    expect(firstRow.getAttribute('aria-keyshortcuts')).toBe('Alt+ArrowUp Alt+ArrowDown');
    fireEvent.keyDown(firstRow, { key: 'ArrowDown', altKey: true });

    expect(onReorderAuthorAt).toHaveBeenCalledWith(['author-1', 'author-2'], 'author-1', 2);
  });

  it('keeps a cross-group author drop as a folder move instead of a reorder', async () => {
    const user = userEvent.setup();
    const onMoveAuthorToFolder = vi.fn();
    const onReorderAuthorAt = vi.fn();
    const tree: SidebarItem[] = [
      { id: 'folder', label: '철학', type: 'author_folder', data: { folderId: 'folder-1', author: '', book: '' }, children: [] },
      authorItem,
    ];
    const store = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: '', dropEffect: '',
      get types() { return [...store.keys()]; },
      setData: (type: string, value: string) => { store.set(type, value); },
      getData: (type: string) => store.get(type) || '',
    };
    render(<LibrarySidebarTree embedded treeData={tree} onTreeItemClick={vi.fn()} onMoveAuthorToFolder={onMoveAuthorToFolder} onReorderAuthorAt={onReorderAuthorAt} />);

    await user.click(screen.getByRole('button', { name: '철학 펼치기' }));
    fireEvent.dragStart(screen.getByRole('button', { name: /저자 순서 변경/ }), { dataTransfer });
    fireEvent.dragOver(screen.getByLabelText('철학 저자 놓기 영역'), { dataTransfer });
    fireEvent.drop(screen.getByLabelText('철학 저자 놓기 영역'), { dataTransfer });

    expect(onMoveAuthorToFolder).toHaveBeenCalledWith('author-1', 'folder-1');
    expect(onReorderAuthorAt).not.toHaveBeenCalled();
  });

  it('limits the author management menu to rename and delete', async () => {
    const user = userEvent.setup();
    render(
      <LibrarySidebarTree
        embedded
        mobile
        treeData={folderTree}
        onTreeItemClick={vi.fn()}
        onDeleteAuthor={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: '철학 펼치기' }));
    const menuButton = screen.getByRole('button', { name: 'Author 관리' });
    await user.click(menuButton);
    expect(menuButton.getAttribute('aria-haspopup')).toBe('menu');
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '이름 변경' }));
    expect(screen.getByRole('menuitem', { name: '이름 변경' })).not.toBeNull();
    expect(screen.getByRole('menuitem', { name: '삭제' })).not.toBeNull();
    expect(screen.queryByText('폴더로 이동')).toBeNull();
  });

  it('opens the two-step delete dialog from the mobile menu', async () => {
    const user = userEvent.setup();
    render(
      <LibrarySidebarTree
        embedded
        mobile
        treeData={folderTree}
        onTreeItemClick={vi.fn()}
        books={[]}
        citations={[]}
        onDeleteAuthor={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: '철학 펼치기' }));
    await user.click(screen.getByRole('button', { name: 'Author 관리' }));
    await user.click(screen.getByRole('menuitem', { name: '삭제' }));
    expect(screen.getByRole('dialog')).not.toBeNull();
    expect(screen.getByRole('button', { name: '삭제 계속' })).not.toBeNull();
  });

  it('moves a dragged author into an expanded folder body', async () => {
    const user = userEvent.setup();
    const onMoveAuthorToFolder = vi.fn();
    const tree: SidebarItem[] = [
      { id: 'folder', label: '철학', type: 'author_folder', data: { folderId: 'folder-1', author: '', book: '' }, children: [] },
      authorItem,
    ];
    const store = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: '', dropEffect: '', types: ['application/json'],
      setData: (type: string, value: string) => { store.set(type, value); },
      getData: (type: string) => store.get(type) || '',
    };
    render(<LibrarySidebarTree embedded treeData={tree} onTreeItemClick={vi.fn()} onMoveAuthorToFolder={onMoveAuthorToFolder} />);

    await user.click(screen.getByRole('button', { name: '철학 펼치기' }));
    fireEvent.dragStart(screen.getByRole('button', { name: 'Author' }), { dataTransfer });
    fireEvent.dragOver(screen.getByLabelText('철학 저자 놓기 영역'), { dataTransfer });
    fireEvent.drop(screen.getByLabelText('철학 저자 놓기 영역'), { dataTransfer });

    expect(onMoveAuthorToFolder).toHaveBeenCalledWith('author-1', 'folder-1');
  });

  it('removes a folder author when dropped back into the outside author area', async () => {
    const user = userEvent.setup();
    const onRemoveAuthorFromFolder = vi.fn();
    const store = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: '', dropEffect: '', types: ['application/json'],
      setData: (type: string, value: string) => { store.set(type, value); },
      getData: (type: string) => store.get(type) || '',
    };
    render(<LibrarySidebarTree embedded treeData={folderTree} onTreeItemClick={vi.fn()} onRemoveAuthorFromFolder={onRemoveAuthorFromFolder} />);

    await user.click(screen.getByRole('button', { name: '철학 펼치기' }));
    fireEvent.dragStart(screen.getByRole('button', { name: 'Author' }), { dataTransfer });
    fireEvent.dragOver(screen.getByLabelText('폴더 밖 저자 영역'), { dataTransfer });
    fireEvent.drop(screen.getByLabelText('폴더 밖 저자 영역'), { dataTransfer });

    expect(onRemoveAuthorFromFolder).toHaveBeenCalledWith('author-1');
  });

  it('removes a folder author when dropped on an existing loose author row', async () => {
    const user = userEvent.setup();
    const onRemoveAuthorFromFolder = vi.fn();
    const folderedAuthor = { ...authorItem, id: 'author-foldered', label: 'Foldered', data: { ...authorItem.data, authorId: 'author-foldered', author: 'Foldered' } };
    const looseAuthor = { ...authorItem, id: 'author-loose', label: 'Loose', data: { ...authorItem.data, authorId: 'author-loose', author: 'Loose' } };
    const tree: SidebarItem[] = [{ ...folderTree[0], children: [folderedAuthor] }, looseAuthor];
    const store = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: '', dropEffect: '', types: ['application/json'],
      setData: (type: string, value: string) => { store.set(type, value); },
      getData: (type: string) => store.get(type) || '',
    };
    render(<LibrarySidebarTree embedded treeData={tree} onTreeItemClick={vi.fn()} onRemoveAuthorFromFolder={onRemoveAuthorFromFolder} />);

    await user.click(screen.getByRole('button', { name: '철학 펼치기' }));
    fireEvent.dragStart(screen.getByRole('button', { name: 'Foldered' }), { dataTransfer });
    fireEvent.dragOver(screen.getByRole('button', { name: 'Loose' }), { dataTransfer });
    fireEvent.drop(screen.getByRole('button', { name: 'Loose' }), { dataTransfer });

    expect(onRemoveAuthorFromFolder).toHaveBeenCalledWith('author-foldered');
  });

  it('does not offer folder movement from the management menu', async () => {
    const user = userEvent.setup();
    render(
      <LibrarySidebarTree
        embedded
        mobile
        treeData={[authorItem]}
        onTreeItemClick={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Author 관리' }));
    expect(screen.queryByRole('menuitem', { name: '폴더에서 빼기' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: '철학' })).toBeNull();
  });

  it('does not expose manual author or book reordering in mobile mode', async () => {
    const user = userEvent.setup();
    const tree: SidebarItem[] = [{
      ...authorItem,
      children: [{
        id: 'book-1', label: 'Book', type: 'book',
        data: { authorId: 'author-1', author: 'Author', bookId: 'book-1', book: 'Book' },
      }],
    }];
    render(<LibrarySidebarTree embedded mobile treeData={tree} onTreeItemClick={vi.fn()} onReorderAuthorAt={vi.fn()} onReorderBookAt={vi.fn()} />);

    const authorRow = screen.getByRole('button', { name: 'Author' });
    expect(authorRow.getAttribute('draggable')).toBe('false');
    await user.click(screen.getByRole('button', { name: 'Author 펼치기' }));
    const bookRow = screen.getByRole('button', { name: 'Book' });
    expect(bookRow.getAttribute('draggable')).toBe('false');
  });

  it('returns focus to the menu trigger when Escape closes the menu', async () => {
    const user = userEvent.setup();
    render(<LibrarySidebarTree embedded mobile treeData={[authorItem]} onTreeItemClick={vi.fn()} />);

    const menuButton = screen.getByRole('button', { name: 'Author 관리' });
    await user.click(menuButton);
    await user.keyboard('{Escape}');

    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(menuButton);
  });

  it('does not treat a dragged book as an author-folder move', async () => {
    const user = userEvent.setup();
    const onMoveAuthorToFolder = vi.fn();
    const onReorderBookAt = vi.fn();
    const bookItem: SidebarItem = {
      id: 'book-1', label: 'Book', type: 'book',
      data: { authorId: 'author-1', author: 'Author', bookId: 'book-1', book: 'Book' },
    };
    const tree: SidebarItem[] = [
      { id: 'folder', label: '철학', type: 'author_folder', data: { folderId: 'folder-1', author: '', book: '' }, children: [] },
      { ...authorItem, children: [bookItem] },
    ];
    const store = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: '', dropEffect: '', types: ['application/json'],
      setData: (type: string, value: string) => { store.set(type, value); },
      getData: (type: string) => store.get(type) || '',
    };
    render(<LibrarySidebarTree embedded treeData={tree} onTreeItemClick={vi.fn()} onMoveAuthorToFolder={onMoveAuthorToFolder} onReorderBookAt={onReorderBookAt} />);

    await user.click(screen.getByRole('button', { name: '철학 펼치기' }));
    await user.click(screen.getByRole('button', { name: 'Author 펼치기' }));
    fireEvent.dragStart(screen.getByRole('button', { name: /책 순서 변경/ }), { dataTransfer });
    expect(screen.getByLabelText('철학 저자 놓기 영역').className).not.toContain('sidebar-hover');
    fireEvent.dragOver(screen.getByLabelText('철학 저자 놓기 영역'), { dataTransfer });
    fireEvent.drop(screen.getByLabelText('철학 저자 놓기 영역'), { dataTransfer });

    expect(onMoveAuthorToFolder).not.toHaveBeenCalled();
    expect(onReorderBookAt).not.toHaveBeenCalled();
  });

  it('keeps book boundary reorder available for an author nested in a folder', async () => {
    const user = userEvent.setup();
    const onReorderBookAt = vi.fn();
    const bookItem: SidebarItem = {
      id: 'book-1', label: 'Book', type: 'book',
      data: { authorId: 'author-1', author: 'Author', bookId: 'book-1', book: 'Book' },
    };
    const tree: SidebarItem[] = [{ ...folderTree[0], children: [{ ...authorItem, children: [bookItem] }] }];
    const store = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: '', dropEffect: '', types: ['application/json'],
      setData: (type: string, value: string) => { store.set(type, value); },
      getData: (type: string) => store.get(type) || '',
    };
    const { container } = render(<LibrarySidebarTree embedded treeData={tree} onTreeItemClick={vi.fn()} onReorderBookAt={onReorderBookAt} />);

    await user.click(screen.getByRole('button', { name: '철학 펼치기' }));
    await user.click(screen.getByRole('button', { name: 'Author 펼치기' }));
    fireEvent.dragStart(screen.getByRole('button', { name: /책 순서 변경/ }), { dataTransfer, clientY: 0 });
    fireEvent.dragOver(container.firstElementChild!, { dataTransfer, clientY: 0 });
    fireEvent.drop(container.firstElementChild!, { dataTransfer, clientY: 0 });

    expect(onReorderBookAt).toHaveBeenCalledWith('author-1', 'book-1', expect.any(Number));
  });

  it('renders author folders above loose authors', () => {
    render(<LibrarySidebarTree embedded treeData={[authorItem, ...folderTree]} onTreeItemClick={vi.fn()} />);

    const folderRow = screen.getByRole('button', { name: '철학' });
    const authorRow = screen.getByRole('button', { name: 'Author' });
    expect(folderRow.compareDocumentPosition(authorRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps folder rename controls on one row', () => {
    render(<LibrarySidebarTree embedded treeData={folderTree} onTreeItemClick={vi.fn()} onRenameAuthorFolder={vi.fn()} />);
    fireEvent.doubleClick(screen.getByRole('button', { name: '철학' }));

    const input = screen.getByPlaceholderText('폴더 이름');
    expect(input.parentElement?.className).not.toContain('flex-col');
    expect(screen.getByRole('button', { name: '이름 변경 확인' })).not.toBeNull();
    expect(screen.getByRole('button', { name: '이름 변경 취소' })).not.toBeNull();
  });

  it('moves a mobile author after a long press and touch drag into a folder', () => {
    vi.useFakeTimers();
    const onMoveAuthorToFolder = vi.fn();
    const onTreeItemClick = vi.fn();
    const tree: SidebarItem[] = [
      { id: 'folder', label: '철학', type: 'author_folder', data: { folderId: 'folder-1', author: '', book: '' }, children: [] },
      authorItem,
    ];
    render(<LibrarySidebarTree embedded mobile treeData={tree} onTreeItemClick={onTreeItemClick} onMoveAuthorToFolder={onMoveAuthorToFolder} />);
    fireEvent.click(screen.getByRole('button', { name: '철학 펼치기' }));
    const dropTarget = screen.getByLabelText('철학 저자 놓기 영역');
    const originalElementFromPoint = document.elementFromPoint;
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => dropTarget });

    fireEvent.touchStart(screen.getByRole('button', { name: 'Author' }), {
      touches: [{ identifier: 1, clientX: 10, clientY: 10 }],
    });
    act(() => vi.advanceTimersByTime(450));
    fireEvent.touchMove(document, {
      touches: [{ identifier: 1, clientX: 20, clientY: 20 }],
    });
    fireEvent.touchEnd(document, {
      changedTouches: [{ identifier: 1, clientX: 20, clientY: 20 }],
    });

    expect(onMoveAuthorToFolder).toHaveBeenCalledWith('author-1', 'folder-1');
    act(() => vi.advanceTimersByTime(701));
    fireEvent.click(screen.getByRole('button', { name: 'Author' }));
    expect(onTreeItemClick).toHaveBeenCalledWith(authorItem);
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: originalElementFromPoint });
    vi.useRealTimers();
  });

  it('auto-scrolls the mobile sidebar while a long-pressed author stays near an edge', () => {
    vi.useFakeTimers();
    const tree: SidebarItem[] = [
      { id: 'folder', label: '철학', type: 'author_folder', data: { folderId: 'folder-1', author: '', book: '' }, children: [] },
      authorItem,
    ];
    const { container } = render(
      <div data-library-sidebar-scroll="true">
        <LibrarySidebarTree embedded mobile treeData={tree} onTreeItemClick={vi.fn()} onMoveAuthorToFolder={vi.fn()} />
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: '철학 펼치기' }));
    const scrollContainer = container.firstElementChild as HTMLElement;
    vi.spyOn(scrollContainer, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 200, left: 0, right: 300, width: 300, height: 200, x: 0, y: 0, toJSON: () => ({}) });
    const dropTarget = screen.getByLabelText('철학 저자 놓기 영역');
    const originalElementFromPoint = document.elementFromPoint;
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => dropTarget });

    fireEvent.touchStart(screen.getByRole('button', { name: 'Author' }), {
      touches: [{ identifier: 1, clientX: 10, clientY: 100 }],
    });
    act(() => vi.advanceTimersByTime(450));
    fireEvent.touchMove(document, {
      touches: [{ identifier: 1, clientX: 10, clientY: 190 }],
    });
    act(() => vi.advanceTimersByTime(64));
    expect(scrollContainer.scrollTop).toBeGreaterThan(0);
    fireEvent.touchEnd(document, {
      changedTouches: [{ identifier: 1, clientX: 10, clientY: 190 }],
    });

    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: originalElementFromPoint });
    vi.useRealTimers();
  });
});
