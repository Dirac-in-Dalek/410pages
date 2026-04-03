import React, { useEffect, useRef } from 'react';
import type {
  FontPreference,
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
  savedDisplayName: string;
  avatarUrl: string | null;
  preferences: UserPreferences;
  isSavingDisplayName?: boolean;
  displayNameError?: string | null;
  onClose: () => void;
  onDisplayNameChange: (value: string) => void;
  onDisplayNameCommit: (value: string) => void | Promise<void>;
  onAvatarChange: () => void;
  onThemeChange: (value: ThemePreference) => void;
  onFontFamilyChange: (value: FontPreference) => void;
  onBaseFontPtChange: (value: number) => void;
  onSignOut?: () => void;
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  isMobile,
  displayName,
  savedDisplayName,
  avatarUrl,
  preferences,
  isSavingDisplayName = false,
  displayNameError = null,
  onClose,
  onDisplayNameChange,
  onDisplayNameCommit,
  onAvatarChange,
  onThemeChange,
  onFontFamilyChange,
  onBaseFontPtChange,
  onSignOut,
}) => {
  const dismissingPanelRef = useRef(false);

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

  const markDismissIntent = () => {
    dismissingPanelRef.current = true;
  };

  const clearDismissIntent = () => {
    dismissingPanelRef.current = false;
  };

  const dismissIntentProps = {
    onPointerDown: markDismissIntent,
    onMouseDown: markDismissIntent,
    onPointerUp: clearDismissIntent,
    onMouseUp: clearDismissIntent,
    onPointerCancel: clearDismissIntent,
    onMouseLeave: clearDismissIntent,
  };

  const initials = displayName.trim().slice(0, 2) || 'RT';
  const panelClasses = isMobile
    ? 'inset-x-0 bottom-0 top-16 rounded-t-[28px] border-t'
    : 'right-0 top-0 h-full w-[min(520px,100vw)] border-l';

  return (
    <>
      <div
        aria-hidden="true"
        data-testid="settings-backdrop"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        {...dismissIntentProps}
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
                {...dismissIntentProps}
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
              savedDisplayName={savedDisplayName}
              avatarUrl={avatarUrl}
              isSavingDisplayName={isSavingDisplayName}
              displayNameError={displayNameError}
              shouldSuppressBlurCommit={() => dismissingPanelRef.current}
              onDisplayNameChange={onDisplayNameChange}
              onDisplayNameCommit={onDisplayNameCommit}
              onAvatarChange={onAvatarChange}
            />

            <TextSettingsSection
              fontFamily={preferences.fontFamily}
              baseFontPt={preferences.baseFontPt}
              onFontFamilyChange={onFontFamilyChange}
              onBaseFontPtChange={onBaseFontPtChange}
            />

            <AppearanceSettingsSection
              theme={preferences.theme}
              onThemeChange={onThemeChange}
            />
          </div>

          {onSignOut ? (
            <div className="border-t border-[var(--border-main)] px-6 py-4">
              <button
                type="button"
                onClick={onSignOut}
                {...dismissIntentProps}
                className="w-full rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-red-500"
              >
                로그아웃
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
};
