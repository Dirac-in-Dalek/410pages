import React, { useEffect } from 'react';
import type {
  FontPreference,
  TextScalePreference,
  ThemePreference,
  UserPreferences,
} from '../../hooks/useUserPreferences';
import { AppearanceSettingsSection } from './AppearanceSettingsSection';
import { ProfileSettingsSection } from './ProfileSettingsSection';
import { TextSettingsSection } from './TextSettingsSection';

export type SettingsPanelProps = {
  isOpen: boolean;
  isMobile: boolean;
  displayName: string;
  avatarUrl: string | null;
  preferences: UserPreferences;
  onClose: () => void;
  onDisplayNameChange: (value: string) => void;
  onAvatarChange: () => void;
  onThemeChange: (value: ThemePreference) => void;
  onFontFamilyChange: (value: FontPreference) => void;
  onTextScaleChange: (value: TextScalePreference) => void;
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  isMobile,
  displayName,
  avatarUrl,
  preferences,
  onClose,
  onDisplayNameChange,
  onAvatarChange,
  onThemeChange,
  onFontFamilyChange,
  onTextScaleChange,
}) => {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const initials = displayName.trim().slice(0, 2) || 'RT';
  const panelClasses = isMobile
    ? 'inset-x-0 bottom-0 top-16 rounded-t-[28px] border-t'
    : 'right-0 top-0 h-full w-[min(520px,100vw)] border-l';

  return (
    <>
      <button
        type="button"
        aria-label="설정 닫기 배경"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside
        aria-label="설정"
        aria-modal="true"
        role="dialog"
        className={`fixed z-50 bg-[var(--bg-card)] border-[var(--border-main)] shadow-2xl ${panelClasses}`}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <header className="border-b border-[var(--border-main)] bg-[linear-gradient(180deg,#f4efe7_0%,#fbfaf8_100%)] px-6 py-5 dark:bg-none">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-main)]">설정</h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={onClose}
                className="rounded-full p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]"
              >
                <span aria-hidden="true" className="block text-lg leading-none">
                  ×
                </span>
              </button>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[var(--text-main)]">{displayName}</p>
                <p className="text-sm text-[var(--text-secondary)]">reading environment</p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <ProfileSettingsSection
              displayName={displayName}
              avatarUrl={avatarUrl}
              onDisplayNameChange={onDisplayNameChange}
              onAvatarChange={onAvatarChange}
            />

            <TextSettingsSection
              fontFamily={preferences.fontFamily}
              textScale={preferences.textScale}
              onFontFamilyChange={onFontFamilyChange}
              onTextScaleChange={onTextScaleChange}
            />

            <AppearanceSettingsSection
              theme={preferences.theme}
              onThemeChange={onThemeChange}
            />
          </div>
        </div>
      </aside>
    </>
  );
};
