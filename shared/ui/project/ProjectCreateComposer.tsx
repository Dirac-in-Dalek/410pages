import React from 'react';
import { Check, Plus, X } from 'lucide-react';

type ProjectCreateComposerProps = {
  isCreating: boolean;
  value: string;
  placeholder?: string;
  createLabel?: string;
  onStart: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  compact?: boolean;
};

export const ProjectCreateComposer: React.FC<ProjectCreateComposerProps> = ({
  isCreating,
  value,
  placeholder = 'Project Name',
  createLabel = 'New Project',
  onStart,
  onChange,
  onSubmit,
  onCancel,
  compact = false,
}) => {
  if (isCreating) {
    return (
      <div
        className={
          compact
            ? 'mt-3 flex items-center gap-1'
            : 'mt-2 flex items-center rounded-[0.9rem] border border-[var(--accent-border)] bg-[var(--bg-card)] p-[0.3125rem] shadow-[0_8px_18px_rgba(209,15,37,0.08)]'
        }
      >
        <input
          autoFocus
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSubmit();
            if (event.key === 'Escape') onCancel();
          }}
          className={
            compact
              ? 'type-body-bounded flex-1 px-3 py-2.5 border border-[var(--border-main)] rounded-md bg-[var(--bg-input)]'
              : 'type-body-bounded w-full border-none bg-transparent px-2 py-1.5 text-[0.92rem] text-[var(--text-main)] focus:ring-0 placeholder:text-[var(--text-muted)]'
          }
        />
        <button
          onClick={onSubmit}
          className={
            compact
              ? 'p-2.5 rounded-md bg-[var(--accent-active)] hover:bg-[var(--accent)] text-[var(--accent-active-text)] transition-colors'
              : 'ml-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-colors hover:bg-[var(--accent-strong)]'
          }
          title="Create"
        >
          {compact ? <Plus size={14} /> : <Check size={14} />}
        </button>
        {!compact && (
          <button
            onClick={onCancel}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]"
            aria-label="Cancel new project"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={onStart}
      className={
        compact
          ? 'type-label-bounded mt-3 w-full flex items-center justify-center gap-2 border border-[var(--border-main)] rounded-md p-2.5 text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]'
          : 'type-label-bounded mt-2.5 flex h-10 w-full items-center justify-center rounded-full border border-transparent bg-[var(--accent)] px-3.5 py-2.5 text-[0.94rem] font-semibold text-white shadow-[0_10px_24px_rgba(209,15,37,0.22)] transition-all hover:bg-[var(--accent-strong)] hover:text-white active:scale-[0.985]'
      }
    >
      <Plus size={14} className={compact ? '' : 'mr-2.5'} />
      {createLabel}
    </button>
  );
};
