import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SetStateAction } from 'react';
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
import { normalizeBaseFontPt, normalizeCitationWidthRem } from './preferencesNormalization';
import { persistServerPreferences, readServerPreferences } from './preferencesServer';
import { persistPreferences, readStoredPreferences } from './preferencesStorage';

export const useUserPreferences = (userId?: string | null) => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => readStoredPreferences());
  const [serverReadyUserId, setServerReadyUserId] = useState<string | null>(null);
  const localChangeVersionRef = useRef(0);

  const setLocalPreferences = useCallback((value: SetStateAction<UserPreferences>) => {
    localChangeVersionRef.current += 1;
    setPreferences(value);
  }, []);

  useEffect(() => {
    applyPreferencesToDocument(preferences);
    persistPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!userId) {
      setServerReadyUserId(null);
      return undefined;
    }

    let isCancelled = false;
    const loadStartedAtVersion = localChangeVersionRef.current;
    setServerReadyUserId(null);

    readServerPreferences(userId)
      .then((serverPreferences) => {
        if (isCancelled) {
          return;
        }

        if (serverPreferences && localChangeVersionRef.current === loadStartedAtVersion) {
          setPreferences(serverPreferences);
        }

        setServerReadyUserId(userId);
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error('Error loading user preferences:', error);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || serverReadyUserId !== userId) {
      return;
    }

    persistServerPreferences(userId, preferences).catch((error) => {
      console.error('Error saving user preferences:', error);
    });
  }, [preferences, serverReadyUserId, userId]);

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
      setPreferences: setLocalPreferences,
      setBaseFontPt: (baseFontPt: number) =>
        setLocalPreferences((current) => ({
          ...current,
          baseFontPt: normalizeBaseFontPt(baseFontPt),
        })),
      setCitationWidthRem: (citationWidthRem: number) =>
        setLocalPreferences((current) => ({
          ...current,
          citationWidthRem: normalizeCitationWidthRem(citationWidthRem),
        })),
      setTextScale: (textScale: TextScalePreference) =>
        setLocalPreferences((current) => ({
          ...current,
          baseFontPt: normalizeBaseFontPt(LEGACY_TEXT_SCALE_TO_BASE_FONT_PT[textScale]),
        })),
      setTheme: (theme: ThemePreference) => setLocalPreferences((current) => ({ ...current, theme })),
      setFontFamily: (fontFamily: FontPreference) =>
        setLocalPreferences((current) => ({
          ...current,
          fontFamily: normalizeFontPreference(fontFamily),
        })),
      isDarkMode: resolveThemePreference(preferences.theme, getSystemThemeIsDark()).isDark,
    }),
    [preferences, setLocalPreferences]
  );
};
