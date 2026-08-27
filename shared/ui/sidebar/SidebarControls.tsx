import React from 'react';
import { Check, X } from 'lucide-react';

export const handleMenuKeyboardNavigation = (event: React.KeyboardEvent<HTMLElement>) => {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')
  ) as HTMLElement[];
  if (items.length === 0) return;
  event.preventDefault();
  const currentIndex = items.indexOf(document.activeElement as HTMLElement);
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? items.length - 1
      : event.key === 'ArrowUp'
        ? (currentIndex <= 0 ? items.length - 1 : currentIndex - 1)
        : (currentIndex + 1) % items.length;
  items[nextIndex].focus();
};

type EditorialIconActionButtonProps = {
  ariaLabel: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  danger?: boolean;
  className?: string;
  menuId?: string;
  menuOpen?: boolean;
};

export const EditorialIconActionButton: React.FC<EditorialIconActionButtonProps> = ({
  ariaLabel,
  onClick,
  children,
  danger = false,
  className = '',
  menuId,
  menuOpen = false,
}) => (
  <button
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    aria-label={ariaLabel}
    aria-haspopup={menuId ? 'menu' : undefined}
    aria-expanded={menuId ? menuOpen : undefined}
    aria-controls={menuId ? `author-actions-menu-${menuId}` : undefined}
    data-author-actions-menu={menuId}
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
  actionsPlacement?: 'inline' | 'below';
  confirmAriaLabel?: string;
  cancelAriaLabel?: string;
};

export const EditorialInlineRenameField: React.FC<EditorialInlineRenameFieldProps> = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  onBlur,
  placeholder,
  actionsPlacement = 'inline',
  confirmAriaLabel = '이름 변경 확인',
  cancelAriaLabel = '이름 변경 취소',
}) => (
  <div
    className={[
      'flex min-w-0 flex-1 gap-1',
      actionsPlacement === 'below' ? 'flex-col items-stretch' : 'items-center',
    ].join(' ')}
    onClick={(event) => event.stopPropagation()}
  >
    <input
      autoFocus
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          if (event.nativeEvent.isComposing) return;
          event.preventDefault();
          onSubmit();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
      className="type-body-bounded min-w-0 flex-1 rounded-[0.85rem] border border-[var(--accent-border)] bg-[var(--bg-card)] px-2.5 py-[0.3125rem] text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-ring)]"
    />
    <div
      className={[
        'flex gap-1',
        actionsPlacement === 'below' ? 'justify-end' : 'items-center',
      ].join(' ')}
    >
      <EditorialIconActionButton ariaLabel={confirmAriaLabel} onClick={() => onSubmit()}>
        <Check size={14} />
      </EditorialIconActionButton>
      <EditorialIconActionButton ariaLabel={cancelAriaLabel} onClick={() => onCancel()}>
        <X size={14} />
      </EditorialIconActionButton>
    </div>
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
  cancelLabel = '취소',
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
