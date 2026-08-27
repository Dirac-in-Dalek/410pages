import React from 'react';
import type { PendingCitationDelete } from '../logic/useUndoableCitationDelete';

type UndoDeleteToastsProps = {
  pendingDeletes: PendingCitationDelete[];
  onUndo: (operationId: string) => void;
};

export const UndoDeleteToasts: React.FC<UndoDeleteToastsProps> = ({ pendingDeletes, onUndo }) => {
  if (pendingDeletes.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[80] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
      aria-label="삭제 알림"
    >
      {pendingDeletes.map((entry) => (
        <div
          key={entry.id}
          className="flex min-h-14 items-center gap-3 rounded-xl bg-[var(--text-main)] px-4 py-2.5 text-[var(--bg-card)] shadow-[var(--shadow-panel)]"
        >
          <p className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              {entry.count === 1 ? '문장을 삭제했습니다.' : `${entry.count}개 항목을 삭제했습니다.`}
            </span>
            {entry.count === 1 ? (
              <span className="block truncate text-xs opacity-75">{entry.text}</span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => onUndo(entry.id)}
            className="min-h-10 shrink-0 rounded-lg px-3 text-sm font-bold text-[var(--accent)] transition-[background-color,transform] hover:bg-white/10 active:scale-95 motion-reduce:transition-none"
          >
            실행 취소
          </button>
        </div>
      ))}
    </div>
  );
};
