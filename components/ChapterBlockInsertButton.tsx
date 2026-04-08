import React, { useEffect, useRef, useState } from 'react';

interface ChapterBlockInsertButtonProps {
  isEditing: boolean;
  onOpen: () => void;
  onCancel?: () => void;
  onSubmit: (label: string) => Promise<unknown> | unknown;
}

export const ChapterBlockInsertButton: React.FC<ChapterBlockInsertButtonProps> = ({
  isEditing,
  onOpen,
  onCancel,
  onSubmit,
}) => {
  const [label, setLabel] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isEditing) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (formRef.current?.contains(event.target as Node)) return;
      setLabel('');
      onCancel?.();
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isEditing, onCancel]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = label.trim();
    if (!trimmed) return;

    await Promise.resolve(onSubmit(trimmed));
    setLabel('');
    onCancel?.();
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        aria-label="Add chapter block"
        className="inline-flex h-5 w-5 items-center justify-center text-base leading-none text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--text-main)]"
        onClick={onOpen}
      >
        +
      </button>
    );
  }

  return (
    <form ref={formRef} className="flex items-center gap-2" onSubmit={handleSubmit}>
      <input
        aria-label="Chapter block label"
        className="min-w-[11rem] rounded-full border border-[var(--border-main)] bg-[var(--bg-main)] px-3 py-1 type-body text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
        value={label}
        autoFocus
        placeholder="3장"
        onChange={(event) => setLabel(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setLabel('');
            onCancel?.();
          }
        }}
      />
      <button
        type="submit"
        aria-label="Save chapter block"
        className="rounded-full bg-[var(--text-main)] px-3 py-1 type-body text-[var(--bg-main)] disabled:opacity-50"
        disabled={!label.trim()}
      >
        Save
      </button>
      <button
        type="button"
        aria-label="Cancel chapter block"
        className="rounded-full px-2 py-1 text-sm text-[var(--text-muted)]"
        onClick={() => {
          setLabel('');
          onCancel?.();
        }}
      >
        ×
      </button>
    </form>
  );
};
