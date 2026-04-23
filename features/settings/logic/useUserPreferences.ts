import { useEffect, useMemo, useState } from 'react';
import { normalizeFontPreference } from '../../../lib/fontRegistry';
import { resolveThemePreference } from '../../../lib/themeRegistry';
import type {
  FontPreference,
  TextScalePreference,
  ThemePreference,
  UserPreferences,
} from '../contract/userPreferences';
import { LEGACY_TEXT_SCALE_TO_BASE_FONT_PT } from '../policy/userPreferences';
import { applyPreferencesToDocument, getSystemThemeIsDark } from './preferencesDocument';
import { normalizeBaseFontPt } from './preferencesNormalization';
import { persistPreferences, readStoredPreferences } from './preferencesStorage';

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => readStoredPreferences());

  useEffect(() => {
    applyPreferencesToDocument(preferences);
    persistPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (preferences.theme !== 'auto') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyPreferencesToDocument(preferences);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [preferences]);

  return useMemo(
    () => ({
      preferences,
      setPreferences,
      setBaseFontPt: (baseFontPt: number) =>
        setPreferences((current) => ({ ...current, baseFontPt: normalizeBaseFontPt(baseFontPt) })),
      setTextScale: (textScale: TextScalePreference) =>
        setPreferences((current) => ({
          ...current,
          baseFontPt: normalizeBaseFontPt(LEGACY_TEXT_SCALE_TO_BASE_FONT_PT[textScale]),
        })),
      setTheme: (theme: ThemePreference) => setPreferences((current) => ({ ...current, theme })),
      setFontFamily: (fontFamily: FontPreference) =>
        setPreferences((current) => ({
          ...current,
          fontFamily: normalizeFontPreference(fontFamily),
        })),
      isDarkMode: resolveThemePreference(preferences.theme, getSystemThemeIsDark()).isDark,
    }),
    [preferences]
  );
};
