import React from 'react';
import { Search, X } from 'lucide-react';

type EditorialSheetProps = {
  side: 'left' | 'right';
  isOpen: boolean;
  widthClassName: string;
  children: React.ReactNode;
};

export const EditorialSheet: React.FC<EditorialSheetProps> = ({
  side,
  isOpen,
  widthClassName,
  children,
}) => {
  const sideClassName = side === 'left' ? 'left-0 border-r' : 'right-0 border-l';
  const translateClassName = isOpen
    ? 'translate-x-0'
    : side === 'left'
      ? '-translate-x-full'
      : 'translate-x-full';

  return (
    <aside
      className={[
        'fixed inset-y-0 z-50 bg-[var(--bg-card)] border-[var(--border-main)] shadow-[var(--shadow-panel)]',
        'transition-transform duration-300 ease-out',
        'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        sideClassName,
        widthClassName,
        translateClassName,
      ].join(' ')}
    >
      {children}
    </aside>
  );
};

type EditorialSheetHeaderProps = {
  title: string;
  onClose: () => void;
};

export const EditorialSheetHeader: React.FC<EditorialSheetHeaderProps> = ({
  title,
  onClose,
}) => (
  <div className="h-14 px-4 border-b border-[var(--border-main)] flex items-center justify-between gap-3 bg-[var(--bg-card)]">
    <h2 className="type-title-bounded font-semibold tracking-[-0.012em] text-[var(--text-main)]">
      {title}
    </h2>
    <button
      type="button"
      onClick={onClose}
      className="ui-btn ui-btn-icon ui-btn--ghost text-[var(--text-muted)]"
      aria-label={`${title} 닫기`}
    >
      <X size={16} />
    </button>
  </div>
);

type EditorialToolbarButtonProps = {
  active?: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
};

export const EditorialToolbarButton: React.FC<EditorialToolbarButtonProps> = ({
  active = false,
  onClick,
  ariaLabel,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'ui-btn ui-btn-icon',
      active
        ? 'border-transparent bg-[var(--accent-active)] text-[var(--accent-active-text)]'
        : 'text-[var(--text-muted)]',
    ].join(' ')}
    aria-label={ariaLabel}
  >
    {children}
  </button>
);

type EditorialSearchFieldProps = {
  value: string;
  onChange?: (value: string) => void;
  placeholder: string;
};

export const EditorialSearchField: React.FC<EditorialSearchFieldProps> = ({
  value,
  onChange,
  placeholder,
}) => (
  <div className="flex items-center rounded-[0.9rem] border border-[var(--border-main)] bg-[var(--bg-input)] px-[0.7rem] py-[0.45rem] shadow-[var(--shadow-card)]">
    <Search size={14} className="mr-2 text-[var(--text-muted)]" />
    <input
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      className="type-body-bounded w-full border-none bg-transparent p-0 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:ring-0"
    />
    {value ? (
      <button
        type="button"
        onClick={() => onChange?.('')}
        className="ui-btn ui-btn-icon ui-btn--ghost h-7 w-7 min-h-0 text-[var(--text-muted)]"
        aria-label="검색어 지우기"
      >
        <X size={14} />
      </button>
    ) : null}
  </div>
);

type EditorialListButtonProps = {
  active?: boolean;
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
} & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'title' | 'type'>;

export const EditorialListButton: React.FC<EditorialListButtonProps> = ({
  active = false,
  className = '',
  onClick,
  children,
  type = 'button',
  ...buttonProps
}) => (
  <button
    type={type}
    onClick={onClick}
    className={[
      'type-label-bounded w-full rounded-[0.85rem] border px-[0.7rem] py-[0.45rem] text-left transition-colors active:scale-95',
      active
        ? 'border-transparent bg-[var(--accent-active)] text-[var(--accent-active-text)]'
        : 'border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]',
      className,
    ].join(' ')}
    {...buttonProps}
  >
    {children}
  </button>
);

type EditorialSectionLabelProps = {
  children: React.ReactNode;
};

export const EditorialSectionLabel: React.FC<EditorialSectionLabelProps> = ({
  children,
}) => (
  <div className="type-section-bounded mb-1.5 px-1 uppercase tracking-[0.09em] text-[var(--text-muted)]">
    {children}
  </div>
);

type EditorialProfileCardProps = {
  username: string;
  avatarUrl?: string | null;
  subtitle?: string;
  children?: React.ReactNode;
};

export const EditorialProfileCard: React.FC<EditorialProfileCardProps> = ({
  username,
  avatarUrl = null,
  subtitle = 'Research workspace',
  children,
}) => (
  <div className="mt-auto rounded-[1rem] border border-[var(--border-main)] bg-[var(--bg-card)] p-2.5 shadow-[var(--shadow-card)]">
    <div className="mb-2 flex items-center gap-2.5">
      <div className="type-label-bounded flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] font-semibold text-[var(--accent)]">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          username.trim().slice(0, 2).toUpperCase() || 'RT'
        )}
      </div>
      <div className="min-w-0">
        <div className="type-label-bounded truncate text-[0.95rem] font-medium text-[var(--text-main)]">
          {username}
        </div>
        <div className="type-body-muted leading-tight text-[0.82rem] text-[var(--text-muted)]">{subtitle}</div>
      </div>
    </div>
    {children}
  </div>
);
