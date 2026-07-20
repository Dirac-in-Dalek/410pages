import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { Citation } from '../../../types';

type WordCardProps = {
  citation: Citation;
  isSelected: boolean;
  onToggleSelect: (id: string, selected: boolean) => void;
};

export const WordCard: React.FC<WordCardProps> = ({
  citation,
  isSelected,
  onToggleSelect,
}) => {
  const isFailed = citation.saveStatus === 'failed';

  return (
    <div role="listitem" className="min-w-0 max-w-full">
      <div
        className={`flex min-h-11 max-w-full items-center rounded-lg bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(28,22,16,0.04)] transition-[background-color,box-shadow] duration-150 motion-reduce:transition-none ${
          isFailed
            ? 'ring-1 ring-inset ring-red-500/70'
            : isSelected
              ? 'bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent-border)]'
              : ''
        }`}
      >
        <label className="flex min-h-11 min-w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-lg transition-transform active:scale-95 motion-reduce:transition-none">
          <input
            type="checkbox"
            checked={isSelected}
            aria-label={`단어 선택: ${citation.text}`}
            onChange={(event) => onToggleSelect(citation.id, event.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-[var(--border-main)] text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          />
        </label>
        <span className="type-body min-w-0 max-w-[min(26rem,calc(100vw-5rem))] break-words py-2 pr-3 text-[var(--text-main)]">
          {citation.text}
        </span>
        {isFailed ? (
          <AlertCircle
            size={15}
            aria-label="저장 실패"
            className="mr-3 shrink-0 text-red-600 dark:text-red-300"
          />
        ) : null}
      </div>
    </div>
  );
};
