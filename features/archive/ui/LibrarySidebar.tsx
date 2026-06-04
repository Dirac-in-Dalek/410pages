import React, { useState } from 'react';
import { BookPlus, FolderOpen } from 'lucide-react';
import type { LibrarySidebarProps } from '../contract/librarySidebarContract';
import { LibrarySidebarTree } from './LibrarySidebarTree';

export const LibrarySidebar: React.FC<LibrarySidebarProps> = ({
  treeData,
  onTreeItemClick,
  onProjectSelect,
  selectedProjectId,
  selectedFilter = null,
  onCreateBook,
  onReorderBookAt,
  onRenameAuthor,
  onRenameBook,
  width,
  isResizing,
  onStartResize,
}) => {
  const [isNewBookOpen, setIsNewBookOpen] = useState(false);
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookTitle, setNewBookTitle] = useState('');
  const [isCreatingBook, setIsCreatingBook] = useState(false);

  const resetNewBookForm = () => {
    setNewBookAuthor('');
    setNewBookTitle('');
  };

  const closeNewBook = () => {
    if (isCreatingBook) return;
    setIsNewBookOpen(false);
    resetNewBookForm();
  };

  const submitNewBook = async () => {
    const title = newBookTitle.trim();
    if (!title || !onCreateBook || isCreatingBook) return;

    setIsCreatingBook(true);
    try {
      const result = await Promise.resolve(
        onCreateBook({
          author: newBookAuthor.trim(),
          title,
        })
      );
      if (result) {
        setIsNewBookOpen(false);
        resetNewBookForm();
      }
    } finally {
      setIsCreatingBook(false);
    }
  };

  return (
    <aside
      style={{ width: `${width}px` }}
      className="relative flex h-full flex-col overflow-hidden border-l border-[var(--border-main)] bg-[var(--bg-sidebar)] shadow-[var(--shadow-sidebar)] transition-colors duration-200"
    >
      <div
        onMouseDown={onStartResize}
        className="absolute top-0 -left-1 w-2 h-full cursor-col-resize z-30 group"
      >
        <div
          className={`w-[2px] h-full mx-auto transition-colors ${
            isResizing ? 'bg-[var(--accent)]' : 'group-hover:bg-[var(--accent-border)]'
          }`}
        />
      </div>

      <div className="border-b border-[var(--border-main)] px-3.5 pb-3 pt-3.5">
        <div>
          <span className="type-title-bounded block text-[1.45rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">
            Library
          </span>
        </div>
      </div>

      <LibrarySidebarTree
        treeData={treeData}
        onTreeItemClick={onTreeItemClick}
        selectedFilter={selectedFilter}
        onReorderBookAt={onReorderBookAt}
        onRenameAuthor={onRenameAuthor}
        onRenameBook={onRenameBook}
        headerContent={
          <div className="mb-5">
            {onCreateBook && (
              <button
                type="button"
                onClick={() => setIsNewBookOpen(true)}
                className="mb-2 flex w-full items-center gap-2.5 rounded-[0.85rem] bg-[var(--bg-card)] px-3 py-[0.55rem] text-left text-[14px] font-medium text-[var(--text-main)] shadow-[var(--shadow-card)] transition-[background-color,color,box-shadow,transform] duration-150 hover:bg-[var(--sidebar-hover)] active:scale-[0.98]"
              >
                <BookPlus size={15} className="shrink-0 text-[var(--accent)]" />
                <span>새 책 읽기</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onProjectSelect(null)}
              className={[
                'flex w-full items-center gap-2.5 rounded-[0.85rem] px-3 py-[0.55rem] text-left text-[14px] font-medium transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98]',
                selectedProjectId === null
                  ? 'bg-[var(--accent-active)] text-[var(--accent-active-text)] shadow-[var(--shadow-card)]'
                  : 'bg-[var(--sidebar-hover)] text-[var(--text-main)] hover:bg-[var(--sidebar-active)]',
              ].join(' ')}
            >
              <FolderOpen size={15} className="shrink-0" />
              <span>All Citations</span>
            </button>
          </div>
        }
      />
      {isNewBookOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <form
            className="w-full max-w-sm rounded-[0.9rem] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-popover)]"
            onSubmit={(event) => {
              event.preventDefault();
              void submitNewBook();
            }}
          >
            <div className="mb-4">
              <h3 className="text-base font-semibold text-[var(--text-main)]">새 책 읽기</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">책 컨텍스트를 만들고 바로 인용을 시작합니다.</p>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">저자</span>
                <input
                  aria-label="저자"
                  value={newBookAuthor}
                  onChange={(event) => setNewBookAuthor(event.target.value)}
                  className="w-full rounded-[0.7rem] border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-main)] focus:border-[var(--accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                  placeholder="비워두면 내 책"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">책 제목</span>
                <input
                  aria-label="책 제목"
                  value={newBookTitle}
                  onChange={(event) => setNewBookTitle(event.target.value)}
                  className="w-full rounded-[0.7rem] border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-main)] focus:border-[var(--accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                  autoFocus
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeNewBook}
                disabled={isCreatingBook}
                className="rounded-[0.7rem] px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-[background-color,transform] duration-150 hover:bg-[var(--sidebar-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!newBookTitle.trim() || isCreatingBook}
                className="rounded-[0.7rem] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[var(--accent-strong)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingBook ? '시작 중' : '시작'}
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
};
