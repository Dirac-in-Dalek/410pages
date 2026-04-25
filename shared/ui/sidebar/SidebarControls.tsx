import React from 'react';
import { Check, X } from 'lucide-react';

type EditorialIconActionButtonProps = {
  ariaLabel: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  danger?: boolean;
  className?: string;
};

export const EditorialIconActionButton: React.FC<EditorialIconActionButtonProps> = ({
  ariaLabel,
  onClick,
  children,
  danger = false,
  className = '',
}) => (
  <button
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    aria-label={ariaLabel}
    className={[
      'ui-btn ui-btn-icon h-[1.625rem] w-[1.625rem] min-h-0 rounded-lg border-transparent',
      danger
        ? 'text-red-500 hover:bg-red-100'
        : 'text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]',
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

type EditorialInlineRenameFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onBlur?: () => void;
  placeholder?: string;
};

export const EditorialInlineRenameField: React.FC<EditorialInlineRenameFieldProps> = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  onBlur,
  placeholder,
}) => (
  <div className="flex min-w-0 flex-1 items-center gap-1" onClick={(event) => event.stopPropagation()}>
    <input
      autoFocus
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onSubmit();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
      className="type-body-bounded min-w-0 flex-1 rounded-[0.85rem] border border-[var(--accent-border)] bg-[var(--bg-card)] px-2.5 py-[0.3125rem] text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-ring)]"
    />
    <EditorialIconActionButton ariaLabel="Confirm rename" onClick={() => onSubmit()}>
      <Check size={14} />
    </EditorialIconActionButton>
    <EditorialIconActionButton ariaLabel="Cancel rename" onClick={() => onCancel()}>
      <X size={14} />
    </EditorialIconActionButton>
  </div>
);

type EditorialDangerConfirmProps = {
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const EditorialDangerConfirm: React.FC<EditorialDangerConfirmProps> = ({
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => (
  <div className="mb-1 rounded-xl border border-red-200 bg-red-50 p-3 shadow-inner">
    <div className="type-body-muted mb-3 text-center font-semibold leading-tight text-red-800">
      {message}
    </div>
    <div className="flex justify-center gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="ui-btn ui-btn--ghost"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="type-label-bounded rounded-lg border border-red-700 bg-red-600 px-3 py-1.5 text-white transition-colors active:scale-95 hover:bg-red-700"
      >
        {confirmLabel}
      </button>
    </div>
  </div>
);
