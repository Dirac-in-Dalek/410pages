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
  onUpdateUsername: (value: string) => boolean | void | Promise<boolean | void>;
  onUpdateAvatar: (file: File) => boolean | void | Promise<boolean | void>;
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
  avatarError?: string | null;
  displayNameError?: string | null;
  onClose: () => void;
  onDisplayNameChange: (value: string) => void;
  onDisplayNameCommit: (value: string) => void | Promise<void>;
  onAvatarChange: (file: File) => boolean | void | Promise<boolean | void>;
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
