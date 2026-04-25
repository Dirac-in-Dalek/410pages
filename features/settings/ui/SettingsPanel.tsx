import React, { useEffect, useRef, useState } from 'react';
import type { FontPreference, UserPreferences, ThemePreference } from '../contract/userPreferences';
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
          <header className="border-b border-[var(--border-main)] bg-[var(--bg-card)] px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="ui-title">설정</h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={onClose}
                {...dismissIntentProps}
                className="ui-btn ui-btn-icon ui-btn--ghost text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <span aria-hidden="true" className="block text-lg leading-none">
                  ×
                </span>
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <section>
              <h3 className="ui-label mb-3 font-semibold text-[var(--text-muted)]">계정</h3>

              <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-sidebar)] p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-start gap-4">
                  <div className="flex w-24 shrink-0 flex-col items-center gap-2">
                    <div className="ui-action flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>

                    <label
                      className={`ui-btn ui-btn--ghost min-h-8 px-3 py-1.5 text-[0.85rem] ${
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

                    {avatarError ? <p className="ui-body text-center text-red-600">{avatarError}</p> : null}
                  </div>

                  <div className="min-w-0 flex-1 pt-1">
                    <label className="block">
                      <span className="ui-label">이름</span>
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
                        className="ui-body mt-2 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 outline-none transition-colors focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                      />
                    </label>

                    {displayNameError ? <p className="ui-body mt-2 text-red-600">{displayNameError}</p> : null}

                    {onSignOut ? (
                      <button
                        type="button"
                        onClick={onSignOut}
                        {...dismissIntentProps}
                        className="ui-btn mt-3 w-full justify-center text-[var(--text-secondary)] hover:text-red-500"
                      >
                        로그아웃
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <TextSettingsSection
              fontFamily={preferences.fontFamily}
              baseFontPt={preferences.baseFontPt}
              onFontFamilyChange={onFontFamilyChange}
              onBaseFontPtChange={onBaseFontPtChange}
            />

            <AppearanceSettingsSection theme={preferences.theme} onThemeChange={onThemeChange} />
          </div>
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
