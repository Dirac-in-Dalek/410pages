import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  SettingsPanelBindings,
  SettingsPanelControllerDependencies,
  SettingsPanelControllerResult,
} from '../contract/settingsPanelController';

export const useSettingsPanelController = ({
  isMobile,
  username,
  avatarUrl,
  preferences,
  onThemeChange,
  onFontFamilyChange,
  onBaseFontPtChange,
  onCitationWidthRemChange,
  onUpdateUsername,
  onUpdateAvatar,
  onSignOut,
}: SettingsPanelControllerDependencies): SettingsPanelControllerResult => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [displayName, setDisplayName] = useState('Researcher');
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const displayNameCommitVersionRef = useRef(0);
  const avatarCommitVersionRef = useRef(0);
  const previousCommittedUsernameRef = useRef(username);

  useEffect(() => {
    const previousCommittedUsername = previousCommittedUsernameRef.current;
    if (username === previousCommittedUsername) {
      return;
    }

    setDisplayNameError(null);
    setDisplayName((currentDraft) =>
      currentDraft === previousCommittedUsername ? username : currentDraft
    );
    previousCommittedUsernameRef.current = username;
  }, [username]);

  const resetSettingsPanelState = useCallback(() => {
    displayNameCommitVersionRef.current += 1;
    avatarCommitVersionRef.current += 1;
    setDisplayName(username);
    setDisplayNameError(null);
    setAvatarError(null);
    setIsSavingDisplayName(false);
    setIsSavingAvatar(false);
  }, [username]);

  const openSettings = useCallback(() => {
    resetSettingsPanelState();
    setIsSettingsOpen(true);
  }, [resetSettingsPanelState]);

  const closeSettings = useCallback(() => {
    resetSettingsPanelState();
    setIsSettingsOpen(false);
  }, [resetSettingsPanelState]);

  const commitDisplayName = useCallback(
    async (nextDisplayName: string) => {
      const submittedDisplayName = nextDisplayName;
      const trimmedDisplayName = nextDisplayName.trim();
      const trimmedUsername = username.trim();

      if (!trimmedDisplayName || trimmedDisplayName === trimmedUsername || isSavingDisplayName) {
        return;
      }

      const commitVersion = displayNameCommitVersionRef.current;
      setIsSavingDisplayName(true);
      setDisplayNameError(null);

      try {
        const didSave = await Promise.resolve(onUpdateUsername(trimmedDisplayName));
        if (commitVersion !== displayNameCommitVersionRef.current) {
          return;
        }

        if (didSave) {
          setDisplayName((currentDraft) =>
            currentDraft === submittedDisplayName ? trimmedDisplayName : currentDraft
          );
          setDisplayNameError(null);
          return;
        }

        setDisplayNameError('이름 저장에 실패했습니다.');
      } finally {
        if (commitVersion === displayNameCommitVersionRef.current) {
          setIsSavingDisplayName(false);
        }
      }
    },
    [isSavingDisplayName, onUpdateUsername, username]
  );

  const commitAvatar = useCallback(
    async (file: File) => {
      if (isSavingAvatar) {
        return false;
      }

      if (!file.type.startsWith('image/')) {
        setAvatarError('이미지 파일만 업로드할 수 있습니다.');
        return false;
      }

      const commitVersion = avatarCommitVersionRef.current;
      setIsSavingAvatar(true);
      setAvatarError(null);

      try {
        const didSave = await Promise.resolve(onUpdateAvatar(file));
        if (commitVersion !== avatarCommitVersionRef.current) {
          return false;
        }

        if (!didSave) {
          setAvatarError('프로필 사진 저장에 실패했습니다.');
          return false;
        }

        return true;
      } finally {
        if (commitVersion === avatarCommitVersionRef.current) {
          setIsSavingAvatar(false);
        }
      }
    },
    [isSavingAvatar, onUpdateAvatar]
  );

  const settingsPanelProps = useMemo<SettingsPanelBindings>(
    () => ({
      isOpen: isSettingsOpen,
      isMobile,
      displayName,
      savedDisplayName: username,
      avatarUrl,
      preferences,
      isSavingDisplayName,
      isSavingAvatar,
      avatarError,
      displayNameError,
      onClose: closeSettings,
      onDisplayNameChange: setDisplayName,
      onDisplayNameCommit: commitDisplayName,
      onAvatarChange: commitAvatar,
      onThemeChange,
      onFontFamilyChange,
      onBaseFontPtChange,
      onCitationWidthRemChange,
      onSignOut,
    }),
    [
      avatarError,
      avatarUrl,
      closeSettings,
      commitAvatar,
      commitDisplayName,
      displayName,
      displayNameError,
      isMobile,
      isSavingAvatar,
      isSavingDisplayName,
      isSettingsOpen,
      onBaseFontPtChange,
      onCitationWidthRemChange,
      onFontFamilyChange,
      onSignOut,
      onThemeChange,
      preferences,
      username,
    ]
  );

  return {
    isSettingsOpen,
    openSettings,
    closeSettings,
    resetSettingsPanelState,
    settingsPanelProps,
  };
};
