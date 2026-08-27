import type { FontPreference, ThemePreference, UserPreferences } from './userPreferences';

export type SettingsPanelControllerDependencies = {
  isMobile: boolean;
  username: string;
  avatarUrl: string | null;
  preferences: UserPreferences;
  onThemeChange: (value: ThemePreference) => void;
  onFontFamilyChange: (value: FontPreference) => void;
  onBaseFontPtChange: (value: number) => void;
  onCitationWidthRemChange: (value: number) => void;
  onUpdateUsername: (value: string) => boolean | Promise<boolean>;
  onUpdateAvatar: (file: File) => boolean | Promise<boolean>;
  onSignOut?: () => void;
};

export type SettingsPanelBindings = {
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

export type SettingsPanelControllerResult = {
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  resetSettingsPanelState: () => void;
  settingsPanelProps: SettingsPanelBindings;
};
