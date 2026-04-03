import React from 'react';

type ProfileSettingsSectionProps = {
  displayName: string;
  savedDisplayName: string;
  avatarUrl: string | null;
  isSavingDisplayName?: boolean;
  displayNameError?: string | null;
  shouldSuppressBlurCommit?: () => boolean;
  onDisplayNameChange: (value: string) => void;
  onDisplayNameCommit: (value: string) => void | Promise<void>;
  onAvatarChange: () => void;
};

export const ProfileSettingsSection: React.FC<ProfileSettingsSectionProps> = ({
  displayName,
  savedDisplayName,
  avatarUrl,
  isSavingDisplayName = false,
  displayNameError = null,
  shouldSuppressBlurCommit,
  onDisplayNameChange,
  onDisplayNameCommit,
  onAvatarChange,
}) => {
  const initials = displayName.trim().slice(0, 2) || 'RT';
  const trimmedDisplayName = displayName.trim();
  const trimmedSavedDisplayName = savedDisplayName.trim();
  const hasPendingDisplayNameChange =
    trimmedDisplayName.length > 0 && trimmedDisplayName !== trimmedSavedDisplayName;

  const commitDisplayName = ({ isBlurTriggered = false } = {}) => {
    if (
      isSavingDisplayName ||
      !hasPendingDisplayNameChange ||
      (isBlurTriggered && shouldSuppressBlurCommit?.())
    ) {
      return;
    }

    void onDisplayNameCommit(trimmedDisplayName);
  };

  return (
    <section className="mb-8">
      <h3 className="type-section mb-3 font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        프로필
      </h3>

      <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-main)] p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="type-label-bounded flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] font-semibold text-[var(--accent)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>

            <div>
              <p className="type-label font-medium text-[var(--text-main)]">프로필 사진</p>
              <p className="type-body-muted text-[var(--text-secondary)]">placeholder flow</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAvatarChange}
            className="type-label-bounded rounded-md border border-[var(--border-main)] px-3 py-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]"
          >
            변경
          </button>
        </div>

        <label className="type-label block text-[var(--text-main)]">
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
            aria-describedby="profile-display-name-hint"
            className="type-body-bounded mt-2 w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2.5 outline-none transition-colors focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-ring)]"
          />
        </label>

        <p
          id="profile-display-name-hint"
          aria-live="polite"
          className={`type-body-muted mt-2 ${displayNameError ? 'text-red-600' : 'text-[var(--text-secondary)]'}`}
        >
          {isSavingDisplayName
            ? '이름을 저장하고 있습니다.'
            : displayNameError
              ? displayNameError
            : '변경 내용을 적용하려면 Enter를 누르거나 입력란을 벗어나세요.'}
        </p>
      </div>
    </section>
  );
};
