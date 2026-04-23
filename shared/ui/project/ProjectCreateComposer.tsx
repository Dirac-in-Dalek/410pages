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
            : 'mt-2 flex items-center p-1.5 bg-[var(--bg-card)] rounded-md border border-[var(--accent-border)] shadow-sm'
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
              : 'type-body-bounded w-full border-none p-0 focus:ring-0 placeholder:text-[var(--text-muted)]'
          }
        />
        <button
          onClick={onSubmit}
          className={
            compact
              ? 'p-2.5 rounded-md bg-[var(--accent-active)] hover:bg-[var(--accent)] text-[var(--accent-active-text)] transition-colors'
              : 'ml-2 text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded p-1'
          }
          title="Create"
        >
          {compact ? <Plus size={14} /> : <Check size={14} />}
        </button>
        {!compact && (
          <button
            onClick={onCancel}
            className="ml-1 text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] rounded p-1"
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
          : 'type-label-bounded w-full mt-2 flex items-center px-2 py-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] bg-[var(--bg-card)] hover:bg-[var(--sidebar-hover)] rounded-md border border-[var(--border-main)] shadow-sm transition-all'
      }
    >
      <Plus size={14} className={compact ? '' : 'mr-2'} />
      {createLabel}
    </button>
  );
};
