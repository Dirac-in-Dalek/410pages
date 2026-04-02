import React from 'react';

type ProfileSettingsSectionProps = {
  displayName: string;
  savedDisplayName: string;
  avatarUrl: string | null;
  isSavingDisplayName?: boolean;
  displayNameError?: string | null;
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
  onDisplayNameChange,
  onDisplayNameCommit,
  onAvatarChange,
}) => {
  const initials = displayName.trim().slice(0, 2) || 'RT';
  const trimmedDisplayName = displayName.trim();
  const trimmedSavedDisplayName = savedDisplayName.trim();
  const hasPendingDisplayNameChange =
    trimmedDisplayName.length > 0 && trimmedDisplayName !== trimmedSavedDisplayName;

  const commitDisplayName = () => {
    if (isSavingDisplayName || !hasPendingDisplayNameChange) {
      return;
    }

    void onDisplayNameCommit(trimmedDisplayName);
  };

  return (
    <section className="mb-8">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        프로필
      </h3>

      <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-main)] p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--text-main)]">프로필 사진</p>
              <p className="text-xs text-[var(--text-secondary)]">placeholder flow</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAvatarChange}
            className="rounded-md border border-[var(--border-main)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]"
          >
            변경
          </button>
        </div>

        <label className="block text-sm text-[var(--text-main)]">
          이름
          <input
            value={displayName}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            onBlur={commitDisplayName}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') {
                return;
              }

              event.preventDefault();
              event.currentTarget.blur();
            }}
            aria-describedby="profile-display-name-hint"
            className="mt-2 w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2.5 outline-none transition-colors focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-ring)]"
          />
        </label>

        <p
          id="profile-display-name-hint"
          aria-live="polite"
          className={`mt-2 text-xs ${displayNameError ? 'text-red-600' : 'text-[var(--text-secondary)]'}`}
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
