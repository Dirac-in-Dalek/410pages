import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';

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
        className="flex h-full w-full items-center gap-2 text-[var(--text-muted)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100"
        onClick={onOpen}
      >
        <span className="h-px flex-1 bg-[var(--border-main)]" />
        <span className="inline-flex h-5 items-center gap-1 rounded-full border border-[var(--border-main)] bg-[var(--bg-card)] px-2 text-[0.68rem] font-medium text-[var(--text-secondary)] shadow-[0_1px_2px_rgba(28,22,16,0.04)] transition-colors hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]">
          <Plus size={12} />
          Insert
        </span>
        <span className="h-px flex-1 bg-[var(--border-main)]" />
      </button>
    );
  }

  return (
    <form ref={formRef} className="flex w-full items-center gap-2 py-2" onSubmit={handleSubmit}>
      <span className="h-px flex-1 bg-[var(--border-main)]" />
      <input
        aria-label="Chapter block label"
        className="type-body-bounded h-10 min-w-0 flex-[1.2] rounded-full border border-[var(--accent-border)] bg-[var(--bg-card)] px-4 leading-tight text-[var(--text-main)] outline-none shadow-[0_1px_2px_rgba(28,22,16,0.04)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent-ring)]"
        value={label}
        autoFocus
        placeholder="Chapter title"
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
        className="ui-btn ui-btn-icon h-10 w-10 min-h-0 rounded-full border-transparent bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] disabled:opacity-40"
        disabled={!label.trim()}
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        aria-label="Cancel chapter block"
        className="ui-btn ui-btn-icon h-10 w-10 min-h-0 rounded-full text-[var(--text-muted)]"
        onClick={() => {
          setLabel('');
          onCancel?.();
        }}
      >
        <X size={14} />
      </button>
      <span className="h-px flex-1 bg-[var(--border-main)]" />
    </form>
  );
};
