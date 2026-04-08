import React, { useState } from 'react';

interface ChapterBlockInsertButtonProps {
  onSubmit: (label: string) => Promise<unknown> | unknown;
}

export const ChapterBlockInsertButton: React.FC<ChapterBlockInsertButtonProps> = ({ onSubmit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = label.trim();
    if (!trimmed) return;

    await Promise.resolve(onSubmit(trimmed));
    setLabel('');
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        aria-label="Add chapter block"
        className="inline-flex h-7 items-center justify-center rounded-full border border-[var(--border-main)] bg-[var(--bg-main)] px-3 text-xs text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--text-main)]"
        onClick={() => setIsEditing(true)}
      >
        +
      </button>
    );
  }

  return (
    <form className="flex items-center gap-2" onSubmit={handleSubmit}>
      <input
        aria-label="Chapter block label"
        className="min-w-[11rem] rounded-full border border-[var(--border-main)] bg-[var(--bg-main)] px-3 py-1.5 type-body text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
        value={label}
        autoFocus
        placeholder="3장"
        onChange={(event) => setLabel(event.target.value)}
      />
      <button
        type="submit"
        aria-label="Save chapter block"
        className="rounded-full bg-[var(--text-main)] px-3 py-1.5 type-body text-[var(--bg-main)]"
      >
        Save
      </button>
    </form>
  );
};
