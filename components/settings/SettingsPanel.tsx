import React, { useEffect, useRef, useState } from 'react';
import type { FontPreference, UserPreferences } from '../../hooks/useUserPreferences';
import type { ThemePreference } from '../../lib/themeRegistry';
import { AvatarCropModal } from './AvatarCropModal';
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
  onAvatarChange: (file: File) => boolean | void | Promise<boolean | void>;
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
  isSavingAvatar = false,
  avatarError = null,
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
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

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
    : 'right-0 top-0 h-full w-[min(460px,100vw)] border-l';
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
        className={`fixed z-50 bg-[var(--bg-card)] border-[var(--border-main)] shadow-[var(--shadow-panel)] ${panelClasses}`}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <header className="border-b border-[var(--border-main)] bg-[var(--bg-card)] px-5 py-4.5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="type-display-bounded font-semibold tracking-[-0.02em] text-[var(--text-main)]">설정</h2>
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
              <div className="type-title-bounded flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] font-semibold text-[var(--accent)]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center gap-2">
                  <label
                    className={`type-label-bounded rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-1.5 font-medium text-[var(--text-main)] transition-colors ${
                      isSavingAvatar ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-[var(--sidebar-hover)]'
                    }`}
                  >
                    사진 변경
                    <input
                      type="file"
                      accept="image/*"
                      aria-label="프로필 사진 업로드"
                      className="hidden"
                      disabled={isSavingAvatar}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.currentTarget.value = '';
                        if (!file) {
                          return;
                        }

                        setPendingAvatarFile(file);
                      }}
                    />
                  </label>
                  {avatarError ? (
                    <p className="type-body-muted text-red-600">{avatarError}</p>
                  ) : null}
                </div>

                <label className="type-label block font-medium text-[var(--text-main)]">
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
                    className="type-body-bounded mt-2 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 outline-none transition-colors focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                </label>

                {displayNameError ? (
                  <p className="type-body-muted mt-2 text-red-600">{displayNameError}</p>
                ) : null}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5">
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
            <div className="border-t border-[var(--border-main)] px-5 py-3.5">
              <button
                type="button"
                onClick={onSignOut}
                {...dismissIntentProps}
                className="type-label-bounded w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-2.5 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-red-500"
              >
                로그아웃
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <AvatarCropModal
        file={pendingAvatarFile}
        isSaving={isSavingAvatar}
        onCancel={() => setPendingAvatarFile(null)}
        onSave={async (croppedFile) => {
          const didSave = await onAvatarChange(croppedFile);
          if (didSave === false) {
            return;
          }

          setPendingAvatarFile(null);
        }}
      />
    </>
  );
};
