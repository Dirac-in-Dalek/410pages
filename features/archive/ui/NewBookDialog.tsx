import React, { useState } from 'react';
import type { CreateBookInput } from '../../../types';

interface NewBookDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBook: (input: CreateBookInput) => Promise<unknown> | unknown;
  onCreated?: () => void;
  overlayClassName?: string;
}

export const NewBookDialog: React.FC<NewBookDialogProps> = ({
  isOpen,
  onClose,
  onCreateBook,
  onCreated,
  overlayClassName = 'z-50',
}) => {
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setAuthor('');
    setTitle('');
  };

  const close = () => {
    if (isCreating) return;
    reset();
    onClose();
  };

  const submit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isCreating) return;

    setIsCreating(true);
    try {
      const result = await Promise.resolve(
        onCreateBook({
          author: author.trim(),
          title: trimmedTitle,
        })
      );
      if (result) {
        reset();
        onClose();
        onCreated?.();
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={`fixed inset-0 ${overlayClassName} flex items-center justify-center bg-black/35 p-4`}>
      <form
        className="w-full max-w-sm rounded-[0.9rem] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-popover)]"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
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
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              className="w-full rounded-[0.7rem] border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-main)] focus:border-[var(--accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
              placeholder="비워두면 내 책"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">책 제목</span>
            <input
              aria-label="책 제목"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-[0.7rem] border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-main)] focus:border-[var(--accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
              autoFocus
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            disabled={isCreating}
            className="rounded-[0.7rem] px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-[background-color,transform] duration-150 hover:bg-[var(--sidebar-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!title.trim() || isCreating}
            className="rounded-[0.7rem] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[var(--accent-strong)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? '시작 중' : '시작'}
          </button>
        </div>
      </form>
    </div>
  );
};
