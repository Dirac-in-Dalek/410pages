import { safeGetStorageItem, safeSetStorageItem, safeRemoveStorageItem } from '../../../shared/lib/browserStorage';
import { normalizeThemePreference } from '../../../lib/themeRegistry';
import type { UserPreferences } from '../contract/userPreferences';
import {
  DEFAULT_PREFERENCES,
  LEGACY_DARK_MODE_KEY,
  LEGACY_THEME_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
} from '../policy/userPreferences';
import { normalizePreferences } from './preferencesNormalization';

export const readStoredPreferences = (): UserPreferences => {
  const storedPreferences = safeGetStorageItem(PREFERENCES_STORAGE_KEY);

  if (storedPreferences) {
    try {
      return normalizePreferences(JSON.parse(storedPreferences));
    } catch {
      safeRemoveStorageItem(PREFERENCES_STORAGE_KEY);
    }
  }

  const legacyTheme = safeGetStorageItem(LEGACY_THEME_STORAGE_KEY);
  if (legacyTheme !== null) {
    return { ...DEFAULT_PREFERENCES, theme: normalizeThemePreference(legacyTheme) };
  }

  const legacyDarkMode = safeGetStorageItem(LEGACY_DARK_MODE_KEY);
  if (legacyDarkMode !== null) {
    try {
      return {
        ...DEFAULT_PREFERENCES,
        theme: JSON.parse(legacyDarkMode) ? 'night' : 'day',
      };
    } catch {
      safeRemoveStorageItem(LEGACY_DARK_MODE_KEY);
    }
  }

  return DEFAULT_PREFERENCES;
};

export const persistPreferences = (preferences: UserPreferences) => {
  safeSetStorageItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  safeSetStorageItem(LEGACY_THEME_STORAGE_KEY, preferences.theme);
  safeRemoveStorageItem(LEGACY_DARK_MODE_KEY);
};
