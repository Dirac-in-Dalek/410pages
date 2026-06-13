import React from 'react';
import { X } from 'lucide-react';

interface ChapterBlockCardProps {
  id: string;
  label: string;
  onDelete?: (id: string) => void;
}

export const ChapterBlockCard: React.FC<ChapterBlockCardProps> = ({ id, label, onDelete }) => {
  return (
    <div className="group mx-1 my-0.5 flex items-center gap-2">
      <div className="h-px flex-1 bg-[var(--border-main)]" />
      <div className="inline-flex min-w-0 max-w-[calc(100%-5rem)] items-center gap-1.5 px-1">
        <span className="type-label-bounded min-w-0 whitespace-normal break-words text-center text-[0.76rem] font-medium text-[var(--text-muted)]">
          {label}
        </span>
        <button
          type="button"
          aria-label={`Delete chapter block ${label}`}
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] opacity-0 transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-secondary)] group-hover:opacity-80 focus-visible:opacity-100"
          onClick={() => onDelete?.(id)}
        >
          <X size={10} strokeWidth={2.2} />
        </button>
      </div>
      <div className="h-px flex-1 bg-[var(--border-main)]" />
    </div>
  );
};
