import React, { useId } from 'react';
import { Monitor } from 'lucide-react';
import { getThemeOption, THEME_OPTIONS } from '../../../lib/themeRegistry';
import type { ThemeScheme } from '../../../lib/themeRegistry';
import type { ThemePreference } from '../contract/userPreferences';
import { SettingsSelection } from './SettingsSelection';

type AppearanceSettingsSectionProps = {
  theme: ThemePreference;
  onThemeChange: (value: ThemePreference) => void;
};

const THEME_GROUPS: Array<{ scheme: ThemeScheme; label: string }> = [
  { scheme: 'auto', label: '자동' },
  { scheme: 'light', label: '라이트' },
  { scheme: 'dark', label: '다크' },
];
const GROUPED_THEME_OPTIONS = THEME_GROUPS.map(group => ({
  label: group.label,
  options: THEME_OPTIONS.filter(option => option.scheme === group.scheme),
}));

export const AppearanceSettingsSection: React.FC<AppearanceSettingsSectionProps> = ({ theme, onThemeChange }) => {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className="ui-label mb-2 px-1 font-semibold text-[var(--text-muted)]">화면</h3>
      <div className="rounded-xl bg-[var(--bg-main)] p-1">
        <SettingsSelection
          label="테마"
          value={theme}
          groups={GROUPED_THEME_OPTIONS}
          onChange={onThemeChange}
          renderOption={option => {
            const themeOption = getThemeOption(option.id)!;
            return (
              <>
                {themeOption.scheme === 'auto' ? (
                  <Monitor size={18} aria-hidden="true" className="shrink-0" />
                ) : (
                  <span aria-hidden="true" className="flex h-6 w-8 shrink-0 items-end overflow-hidden rounded-md border" style={{ backgroundColor: themeOption.preview.background, borderColor: themeOption.preview.border }}>
                    <span className="h-2 w-full" style={{ backgroundColor: themeOption.preview.accent }} />
                  </span>
                )}
                <span className="min-w-0 truncate">{option.label}</span>
              </>
            );
          }}
        />
        {theme === 'auto' ? <p className="px-3 pb-3 text-xs text-[var(--text-muted)]">기기의 밝은 화면·어두운 화면 설정을 따릅니다.</p> : null}
      </div>
    </section>
  );
};
