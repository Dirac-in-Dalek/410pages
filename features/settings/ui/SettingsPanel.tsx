import React, { useEffect, useId, useRef, useState } from 'react';
import type { FontPreference, UserPreferences, ThemePreference } from '../contract/userPreferences';
import { AvatarCropModal } from './AvatarCropModal';
import { AppearanceSettingsSection } from './AppearanceSettingsSection';
import { TextSettingsSection } from './TextSettingsSection';

const MAX_AVATAR_SOURCE_BYTES = 5 * 1024 * 1024;

export type SettingsPanelProps = {
  isOpen: boolean;
  isMobile: boolean;
  displayName: string;
  savedDisplayName: string;
  avatarUrl: string | null;
  preferences: UserPreferences;
  isSavingDisplayName?: boolean;
  isSavingAvatar?: boolean;
  isDisplayNameSaved?: boolean;
  isAvatarSaved?: boolean;
  avatarError?: string | null;
  displayNameError?: string | null;
  onClose: () => void;
  onDisplayNameChange: (value: string) => void;
  onDisplayNameCommit: (value: string) => void | Promise<void>;
  onAvatarChange: (file: File) => boolean | Promise<boolean>;
  onThemeChange: (value: ThemePreference) => void;
  onFontFamilyChange: (value: FontPreference) => void;
  onBaseFontPtChange: (value: number) => void;
  onCitationWidthRemChange: (value: number) => void;
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
  isDisplayNameSaved = false,
  isAvatarSaved = false,
  avatarError = null,
  displayNameError = null,
  onClose,
  onDisplayNameChange,
  onDisplayNameCommit,
  onAvatarChange,
  onThemeChange,
  onFontFamilyChange,
  onBaseFontPtChange,
  onCitationWidthRemChange,
  onSignOut,
}) => {
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarSelectionError, setAvatarSelectionError] = useState<string | null>(null);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [didSubmitDisplayName, setDidSubmitDisplayName] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const displayNameInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const avatarChangeButtonRef = useRef<HTMLButtonElement | null>(null);
  const editDisplayNameButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || pendingAvatarFile) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (panelRef.current?.querySelector('[aria-expanded="true"]')) {
          return;
        }
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]):not([type="hidden"]):not(.hidden), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ) as HTMLElement[];

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, pendingAvatarFile]);

  useEffect(() => {
    if (!isEditingDisplayName) {
      return;
    }

    displayNameInputRef.current?.focus();
    displayNameInputRef.current?.select();
  }, [isEditingDisplayName]);

  useEffect(() => {
    if (isOpen && displayNameError) {
      setIsEditingDisplayName(true);
    }
  }, [displayNameError, isOpen]);

  useEffect(() => {
    if (!didSubmitDisplayName || !isDisplayNameSaved) {
      return;
    }

    setIsEditingDisplayName(false);
    setDidSubmitDisplayName(false);
    window.requestAnimationFrame(() => editDisplayNameButtonRef.current?.focus());
  }, [didSubmitDisplayName, isDisplayNameSaved]);

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.inert = Boolean(pendingAvatarFile);
    }
  }, [pendingAvatarFile]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditingDisplayName(false);
      setDidSubmitDisplayName(false);
      setPendingAvatarFile(null);
      setAvatarSelectionError(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const initials = displayName.trim().slice(0, 2) || 'RT';
  const panelClasses = isMobile
    ? 'inset-x-0 bottom-0 top-16 rounded-t-[28px] border-t'
    : 'right-0 top-0 h-full w-[min(460px,100vw)] border-l';
  const trimmedDisplayName = displayName.trim();
  const trimmedSavedDisplayName = savedDisplayName.trim();
  const hasPendingDisplayNameChange =
    trimmedDisplayName.length > 0 && trimmedDisplayName !== trimmedSavedDisplayName;

  const commitDisplayName = () => {
    if (isSavingDisplayName || !hasPendingDisplayNameChange) {
      return;
    }

    setDidSubmitDisplayName(true);
    void onDisplayNameCommit(trimmedDisplayName);
  };

  const cancelDisplayNameEdit = () => {
    onDisplayNameChange(savedDisplayName);
    setDidSubmitDisplayName(false);
    setIsEditingDisplayName(false);
    window.requestAnimationFrame(() => editDisplayNameButtonRef.current?.focus());
  };

  return (
    <>
      <div
        aria-hidden="true"
        data-testid="settings-backdrop"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside
        ref={panelRef}
        aria-labelledby={titleId}
        aria-hidden={pendingAvatarFile ? true : undefined}
        aria-modal="true"
        role="dialog"
        className={`fixed z-50 bg-[var(--bg-card)] border-[var(--border-main)] shadow-[var(--shadow-panel)] ${panelClasses}`}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <header className="border-b border-[var(--border-main)] bg-[var(--bg-card)] px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <h2 id={titleId} className="ui-title">설정</h2>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="닫기"
                onClick={onClose}
                className="ui-btn ui-btn-icon ui-btn--ghost text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <span aria-hidden="true" className="block text-lg leading-none">
                  ×
                </span>
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6">
            <section aria-labelledby={`${titleId}-profile`}>
              <h3 id={`${titleId}-profile`} className="ui-label mb-2 px-1 font-semibold text-[var(--text-muted)]">프로필</h3>

              <div className="rounded-xl bg-[var(--bg-sidebar)] p-3">
                <div className="flex items-start gap-3">
                  <div className="ui-action flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {isEditingDisplayName ? (
                      <div>
                        <label htmlFor={`${titleId}-display-name`} className="sr-only">이름</label>
                        <input
                          ref={displayNameInputRef}
                          id={`${titleId}-display-name`}
                          value={displayName}
                          disabled={isSavingDisplayName}
                          onChange={(event) => onDisplayNameChange(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.nativeEvent.isComposing) {
                              return;
                            }
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              commitDisplayName();
                            } else if (event.key === 'Escape') {
                              event.preventDefault();
                              event.stopPropagation();
                              cancelDisplayNameEdit();
                            }
                          }}
                          aria-label="이름"
                          className="ui-body w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2 outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            className="ui-btn ui-btn--ghost min-h-11 px-3 sm:min-h-10"
                            disabled={isSavingDisplayName}
                            onClick={cancelDisplayNameEdit}
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            className="ui-btn ui-btn--solid min-h-11 px-3 sm:min-h-10"
                            disabled={isSavingDisplayName || !hasPendingDisplayNameChange}
                            onClick={commitDisplayName}
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-11 items-center justify-between gap-2">
                        <p className="ui-action min-w-0 truncate">{savedDisplayName || displayName}</p>
                        <button
                          ref={editDisplayNameButtonRef}
                          type="button"
                          className="ui-btn ui-btn--ghost min-h-11 shrink-0 px-3 text-[var(--text-secondary)] sm:min-h-10"
                          disabled={isSavingDisplayName}
                          onClick={() => {
                            onDisplayNameChange(savedDisplayName);
                            setIsEditingDisplayName(true);
                          }}
                        >
                          수정
                        </button>
                      </div>
                    )}

                    <div className="mt-1 min-h-5" aria-live="polite">
                      {isSavingDisplayName ? <p role="status" className="text-xs text-[var(--text-muted)]">이름 저장 중…</p> : null}
                      {!isSavingDisplayName && isDisplayNameSaved ? <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">이름 저장됨</p> : null}
                      {displayNameError ? <p role="alert" className="text-xs text-red-600 dark:text-red-300">{displayNameError}</p> : null}
                    </div>

                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <button
                        ref={avatarChangeButtonRef}
                        type="button"
                        disabled={isSavingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                        className={`ui-btn ui-btn--ghost min-h-11 px-2.5 text-[0.85rem] sm:min-h-10 ${
                          isSavingAvatar ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                        }`}
                      >
                        사진 변경
                      </button>
                      <input
                        ref={avatarInputRef}
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
                          if (!file.type.startsWith('image/')) {
                            setAvatarSelectionError('이미지 파일만 업로드할 수 있습니다.');
                            return;
                          }
                          if (file.size > MAX_AVATAR_SOURCE_BYTES) {
                            setAvatarSelectionError('프로필 사진은 5MB 이하만 업로드할 수 있습니다.');
                            return;
                          }
                          setAvatarSelectionError(null);
                          setPendingAvatarFile(file);
                        }}
                      />
                      <div className="min-w-0 text-xs" aria-live="polite">
                        {isSavingAvatar ? <p role="status" className="text-[var(--text-muted)]">사진 저장 중…</p> : null}
                        {!isSavingAvatar && isAvatarSaved && !avatarSelectionError && !avatarError ? <p role="status" className="text-emerald-700 dark:text-emerald-300">사진 저장됨</p> : null}
                        {avatarSelectionError || avatarError ? <p role="alert" className="text-red-600 dark:text-red-300">{avatarSelectionError || avatarError}</p> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <TextSettingsSection
              fontFamily={preferences.fontFamily}
              baseFontPt={preferences.baseFontPt}
              citationWidthRem={preferences.citationWidthRem}
              onFontFamilyChange={onFontFamilyChange}
              onBaseFontPtChange={onBaseFontPtChange}
              onCitationWidthRemChange={onCitationWidthRemChange}
            />

            <AppearanceSettingsSection theme={preferences.theme} onThemeChange={onThemeChange} />

            {onSignOut ? (
              <section aria-labelledby={`${titleId}-account`}>
                <h3 id={`${titleId}-account`} className="ui-label mb-2 px-1 font-semibold text-[var(--text-muted)]">계정</h3>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="ui-btn ui-btn--ghost min-h-11 w-full justify-start px-3 text-[var(--text-secondary)] focus-visible:text-red-500 sm:min-h-10 [@media(hover:hover)]:hover:text-red-500"
                >
                  로그아웃
                </button>
              </section>
            ) : null}
          </div>
        </div>
      </aside>

      <AvatarCropModal
        file={pendingAvatarFile}
        isSaving={isSavingAvatar}
        onCancel={() => {
          setPendingAvatarFile(null);
          window.requestAnimationFrame(() => avatarChangeButtonRef.current?.focus());
        }}
        onSave={async (croppedFile) => {
          const didSave = await onAvatarChange(croppedFile);
          if (didSave === false) {
            return false;
          }

          setPendingAvatarFile(null);
          window.requestAnimationFrame(() => avatarChangeButtonRef.current?.focus());
          return true;
        }}
      />
    </>
  );
};
