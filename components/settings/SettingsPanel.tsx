import React, { useEffect, useRef } from 'react';
import type {
  FontPreference,
  TextScalePreference,
  ThemePreference,
  UserPreferences,
} from '../../hooks/useUserPreferences';
import { AppearanceSettingsSection } from './AppearanceSettingsSection';
import { TextSettingsSection } from './TextSettingsSection';

export type SettingsPanelProps = {
  isOpen: boolean;
  isMobile: boolean;
  displayName: string;
  savedDisplayName: string;
  avatarUrl: string | null;
  preferences: UserPreferences;
  isSavingDisplayName?: boolean;
  isSavingAvatar?: boolean;
  avatarError?: string | null;
  displayNameError?: string | null;
  onClose: () => void;
  onDisplayNameChange: (value: string) => void;
  onDisplayNameCommit: (value: string) => void | Promise<void>;
  onAvatarChange: (file: File) => void | Promise<void>;
  onThemeChange: (value: ThemePreference) => void;
  onFontFamilyChange: (value: FontPreference) => void;
  onTextScaleChange: (value: TextScalePreference) => void;
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
  isSavingAvatar = false,
  avatarError = null,
  displayNameError = null,
  onClose,
  onDisplayNameChange,
  onDisplayNameCommit,
  onAvatarChange,
  onThemeChange,
  onFontFamilyChange,
  onTextScaleChange,
  onSignOut,
}) => {
  const dismissingPanelRef = useRef(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

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
  const trimmedDisplayName = displayName.trim();
  const trimmedSavedDisplayName = savedDisplayName.trim();
  const hasPendingDisplayNameChange =
    trimmedDisplayName.length > 0 && trimmedDisplayName !== trimmedSavedDisplayName;

  const commitDisplayName = ({ isBlurTriggered = false } = {}) => {
    if (
      isSavingDisplayName ||
      !hasPendingDisplayNameChange ||
      (isBlurTriggered && dismissingPanelRef.current)
    ) {
      return;
    }

    void onDisplayNameCommit(trimmedDisplayName);
  };

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

            <div className="mt-6 flex items-center gap-5">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                aria-label="프로필 사진 업로드"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = '';
                  if (!file) {
                    return;
                  }

                  void onAvatarChange(file);
                }}
              />

              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-2xl font-semibold text-[var(--accent)]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isSavingAvatar}
                    className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-2 text-sm font-medium text-[var(--text-main)] transition-colors hover:bg-[var(--sidebar-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    사진 변경
                  </button>
                  {avatarError ? (
                    <p className="text-xs text-red-600">{avatarError}</p>
                  ) : null}
                </div>

                <label className="block text-sm font-medium text-[var(--text-main)]">
                  이름
                  <input
                    value={displayName}
                    onChange={(event) => onDisplayNameChange(event.target.value)}
                    onBlur={() => commitDisplayName({ isBlurTriggered: true })}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
                        return;
                      }

                      event.preventDefault();
                      event.currentTarget.blur();
                    }}
                    aria-label="이름"
                    className="mt-2 w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2.5 text-base outline-none transition-colors focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                </label>

                {displayNameError ? (
                  <p className="mt-2 text-xs text-red-600">{displayNameError}</p>
                ) : null}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5">
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
