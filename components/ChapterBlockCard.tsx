import React from 'react';

interface ChapterBlockCardProps {
  label: string;
}

export const ChapterBlockCard: React.FC<ChapterBlockCardProps> = ({ label }) => {
  return (
    <div className="mx-4 rounded-2xl border border-dashed border-[var(--border-main)] bg-[var(--bg-elevated)] px-4 py-3 shadow-sm">
      <div className="type-body text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
        Chapter block
      </div>
      <div className="mt-1 type-heading text-[var(--text-main)]">{label}</div>
    </div>
  );
};
