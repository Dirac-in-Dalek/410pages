import React from 'react';
import type { ThemePreference } from '../../hooks/useUserPreferences';

type AppearanceSettingsSectionProps = {
  theme: ThemePreference;
  onThemeChange: (value: ThemePreference) => void;
};

const themeButtonClass = (isActive: boolean) =>
  `rounded-xl border px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'border-transparent bg-[var(--accent-active)] text-[var(--accent-active-text)]'
      : 'border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]'
  }`;

export const AppearanceSettingsSection: React.FC<AppearanceSettingsSectionProps> = ({
  theme,
  onThemeChange,
}) => (
  <section>
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
      화면
    </h3>

    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-main)] p-4 shadow-sm">
      <p className="mb-2 text-sm font-medium text-[var(--text-main)]">테마</p>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          aria-pressed={theme === 'light'}
          className={themeButtonClass(theme === 'light')}
          onClick={() => onThemeChange('light')}
        >
          라이트
        </button>
        <button
          type="button"
          aria-pressed={theme === 'dark'}
          className={themeButtonClass(theme === 'dark')}
          onClick={() => onThemeChange('dark')}
        >
          다크
        </button>
        <button
          type="button"
          aria-pressed={theme === 'system'}
          className={themeButtonClass(theme === 'system')}
          onClick={() => onThemeChange('system')}
        >
          시스템
        </button>
      </div>
    </div>
  </section>
);
