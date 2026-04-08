import React from 'react';

interface ChapterBlockCardProps {
  id: string;
  label: string;
  onDelete?: (id: string) => void;
}

export const ChapterBlockCard: React.FC<ChapterBlockCardProps> = ({ id, label, onDelete }) => {
  return (
    <div className="mx-4 flex items-center gap-4 py-1.5">
      <div className="h-px flex-1 bg-[var(--border-main)]" />
      <div className="type-body text-[11px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
        Chapter
      </div>
      <div className="type-body font-medium text-[var(--text-main)]">{label}</div>
      <button
        type="button"
        aria-label={`Delete chapter block ${label}`}
        className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)]"
        onClick={() => onDelete?.(id)}
      >
        ×
      </button>
      <div className="h-px flex-1 bg-[var(--border-main)]" />
    </div>
  );
};
