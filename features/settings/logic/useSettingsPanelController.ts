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
  const [isDisplayNameSaved, setIsDisplayNameSaved] = useState(false);
  const [isAvatarSaved, setIsAvatarSaved] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
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
    setDisplayName(username);
    setDisplayNameError(null);
    setAvatarError(null);
    setIsDisplayNameSaved(false);
    setIsAvatarSaved(false);
  }, [username]);

  const openSettings = useCallback(() => {
    if (!isSavingDisplayName && !displayNameError) {
      resetSettingsPanelState();
    }
    setIsSettingsOpen(true);
  }, [displayNameError, isSavingDisplayName, resetSettingsPanelState]);

  const closeSettings = useCallback(() => {
    if (!isSavingDisplayName && !displayNameError) {
      resetSettingsPanelState();
    }
    setIsSettingsOpen(false);
  }, [displayNameError, isSavingDisplayName, resetSettingsPanelState]);

  const commitDisplayName = useCallback(
    async (nextDisplayName: string) => {
      const submittedDisplayName = nextDisplayName;
      const trimmedDisplayName = nextDisplayName.trim();
      const trimmedUsername = username.trim();

      if (!trimmedDisplayName || trimmedDisplayName === trimmedUsername || isSavingDisplayName) {
        return;
      }

      setIsSavingDisplayName(true);
      setIsDisplayNameSaved(false);
      setDisplayNameError(null);

      try {
        const didSave = await Promise.resolve(onUpdateUsername(trimmedDisplayName));
        if (didSave) {
          setDisplayName((currentDraft) =>
            currentDraft === submittedDisplayName ? trimmedDisplayName : currentDraft
          );
          setDisplayNameError(null);
          setIsDisplayNameSaved(true);
          return;
        }

        setDisplayNameError('이름 저장에 실패했습니다.');
        setIsDisplayNameSaved(false);
      } catch (error) {
        console.error('Error saving display name:', error);
        setDisplayNameError('이름 저장에 실패했습니다.');
        setIsDisplayNameSaved(false);
      } finally {
        setIsSavingDisplayName(false);
      }
    },
    [isSavingDisplayName, onUpdateUsername, username]
  );

  const changeDisplayName = useCallback((nextDisplayName: string) => {
    setDisplayName(nextDisplayName);
    setDisplayNameError(null);
    setIsDisplayNameSaved(false);
  }, []);

  const commitAvatar = useCallback(
    async (file: File) => {
      if (isSavingAvatar) {
        return false;
      }

      if (!file.type.startsWith('image/')) {
        setAvatarError('이미지 파일만 업로드할 수 있습니다.');
        return false;
      }

      setIsSavingAvatar(true);
      setIsAvatarSaved(false);
      setAvatarError(null);

      try {
        const didSave = await Promise.resolve(onUpdateAvatar(file));
        if (!didSave) {
          setAvatarError('프로필 사진 저장에 실패했습니다.');
          return false;
        }

        setIsAvatarSaved(true);
        return true;
      } catch (error) {
        console.error('Error saving avatar:', error);
        setAvatarError('프로필 사진 저장에 실패했습니다.');
        return false;
      } finally {
        setIsSavingAvatar(false);
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
      isDisplayNameSaved,
      isAvatarSaved,
      avatarError,
      displayNameError,
      onClose: closeSettings,
      onDisplayNameChange: changeDisplayName,
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
      changeDisplayName,
      displayName,
      displayNameError,
      isMobile,
      isSavingAvatar,
      isSavingDisplayName,
      isAvatarSaved,
      isDisplayNameSaved,
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
