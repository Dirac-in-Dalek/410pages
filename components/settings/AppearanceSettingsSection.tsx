import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getThemeOption, THEME_OPTIONS, type ThemePreference } from '../../lib/themeRegistry';

type AppearanceSettingsSectionProps = {
  theme: ThemePreference;
  onThemeChange: (value: ThemePreference) => void;
};

const themeOptionClass = (isActive: boolean) =>
  `flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
    isActive
      ? 'bg-[var(--accent-soft)] text-[var(--text-main)]'
      : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]'
  }`;

export const AppearanceSettingsSection: React.FC<AppearanceSettingsSectionProps> = ({
  theme,
  onThemeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedOption = useMemo(() => getThemeOption(theme) ?? THEME_OPTIONS[0], [theme]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (wrapperRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <section>
      <h3 className="type-section mb-3 font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        화면
      </h3>

      <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-sidebar)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-4">
          <p className="type-label min-w-0 font-medium text-[var(--text-main)]">테마</p>

          <div ref={wrapperRef} className="relative w-full max-w-[18rem]">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-label={`현재 테마: ${selectedOption.label}`}
              className="type-label-bounded flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-3 text-left font-medium text-[var(--text-main)] shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--sidebar-hover)]"
              onClick={() => setIsOpen((value) => !value)}
            >
              <span className="block min-w-0 truncate">{selectedOption.label}</span>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={`shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isOpen ? (
              <div
                id={listboxId}
                role="listbox"
                aria-label="테마 선택"
                className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-1 shadow-[var(--shadow-panel)]"
              >
                {THEME_OPTIONS.map((option) => {
                  const isActive = option.id === theme;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={themeOptionClass(isActive)}
                      onClick={() => {
                        onThemeChange(option.id);
                        setIsOpen(false);
                      }}
                    >
                      <span className="truncate">{option.label}</span>
                      {isActive ? (
                        <span aria-hidden="true" className="text-[var(--accent)]">
                          ✓
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};
