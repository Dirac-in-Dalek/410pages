import React, { useState } from 'react';
import type { DeleteAuthorCascadeResult } from '../../../types';
import { useModalFocus } from '../../../shared/ui/useModalFocus';

type AuthorDeleteDialogProps = {
  authorId: string;
  authorName: string;
  bookCount: number;
  citationCount: number;
  onClose: () => void;
  onDelete: (authorId: string) => Promise<DeleteAuthorCascadeResult | undefined>;
};

export const AuthorDeleteDialog: React.FC<AuthorDeleteDialogProps> = ({
  authorId,
  authorName,
  bookCount,
  citationCount,
  onClose,
  onDelete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const dialogRef = useModalFocus<HTMLDivElement>(true, () => {
    if (!isDeleting) onClose();
  });

  const confirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const result = await onDelete(authorId);
      if (result) onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-author-title"
        tabIndex={-1}
        className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] p-5 shadow-[var(--shadow-popover)]"
      >
        <h2 id="delete-author-title" className="text-lg font-semibold text-[var(--text-main)]">{authorName} 삭제</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          책 {bookCount}권과 인용문 {citationCount}개가 함께 삭제됩니다. 이 작업은 실행 취소할 수 없습니다.
        </p>
        {step === 2 ? (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 dark:bg-red-500/10 dark:text-red-100">
            마지막 확인입니다. 저자와 모든 기록을 영구 삭제합니다.
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2">
          {step === 1 ? (
            <button type="button" autoFocus onClick={() => setStep(2)} className="min-h-11 rounded-lg bg-[var(--bg-input)] px-3 text-sm font-semibold text-[var(--text-main)] transition-[background-color,transform] hover:bg-[var(--sidebar-hover)] active:scale-95">
              삭제 계속
            </button>
          ) : (
            <button type="button" autoFocus disabled={isDeleting} onClick={() => void confirmDelete()} className="min-h-11 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-red-700 active:scale-95 disabled:opacity-60">
              {isDeleting ? '삭제 중…' : '저자와 모든 기록 삭제'}
            </button>
          )}
          <button type="button" disabled={isDeleting} onClick={onClose} className="min-h-10 rounded-lg px-3 text-sm font-medium text-[var(--text-muted)] transition-[background-color,transform] hover:bg-[var(--sidebar-hover)] active:scale-95 disabled:opacity-60">취소</button>
        </div>
      </div>
    </div>
  );
};
