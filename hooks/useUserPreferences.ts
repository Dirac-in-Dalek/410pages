import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_FONT_ID,
  normalizeFontPreference,
  type FontPreference,
} from '../lib/fontRegistry';
import {
  DEFAULT_THEME,
  normalizeThemePreference,
  resolveThemePreference,
  type ThemePreference,
} from '../lib/themeRegistry';

export type { FontPreference } from '../lib/fontRegistry';
export type { ThemePreference } from '../lib/themeRegistry';
export type TextScalePreference = 'sm' | 'md' | 'lg';

export type UserPreferences = {
  theme: ThemePreference;
  fontFamily: FontPreference;
  baseFontPt: number;
};

export const PREFERENCES_STORAGE_KEY = 'user-preferences';
const LEGACY_THEME_STORAGE_KEY = 'theme-preference';
const LEGACY_DARK_MODE_KEY = 'dark-mode';
const DEFAULT_BASE_FONT_PT = 16;
const MIN_BASE_FONT_PT = 10;
const MAX_BASE_FONT_PT = 40;
const LEGACY_TEXT_SCALE_TO_BASE_FONT_PT: Record<TextScalePreference, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: DEFAULT_THEME,
  fontFamily: DEFAULT_FONT_ID,
  baseFontPt: DEFAULT_BASE_FONT_PT,
};

const normalizeBaseFontPt = (value: unknown): number => {
  const parsedValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_BASE_FONT_PT;
  }

  return Math.min(MAX_BASE_FONT_PT, Math.max(MIN_BASE_FONT_PT, Math.round(parsedValue)));
};

const getBaseFontPtFromLegacyTextScale = (textScale: unknown): number => {
  if (textScale === 'sm' || textScale === 'md' || textScale === 'lg') {
    return LEGACY_TEXT_SCALE_TO_BASE_FONT_PT[textScale];
  }

  return DEFAULT_BASE_FONT_PT;
};

const normalizePreferences = (value: unknown): UserPreferences => {
  const candidate =
    typeof value === 'object' && value !== null
      ? (value as Partial<UserPreferences> & { textScale?: unknown })
      : {};
  const baseFontPt =
    candidate.baseFontPt !== undefined
      ? normalizeBaseFontPt(candidate.baseFontPt)
      : getBaseFontPtFromLegacyTextScale(candidate.textScale);

  return {
    theme: normalizeThemePreference(candidate.theme),
    fontFamily: normalizeFontPreference(candidate.fontFamily),
    baseFontPt,
  };
};

const getSystemThemeIsDark = (): boolean =>
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const safeGetStorageItem = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetStorageItem = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
};

const safeRemoveStorageItem = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
};

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

export const applyPreferencesToDocument = (preferences: UserPreferences) => {
  const root = document.documentElement;
  const prefersDark = getSystemThemeIsDark();
  const { resolvedTheme, isDark, themeColor } = resolveThemePreference(preferences.theme, prefersDark);
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  root.classList.toggle('dark', isDark);
  root.dataset.theme = resolvedTheme;
  root.dataset.font = preferences.fontFamily;
  root.style.setProperty('--font-base-pt', `${preferences.baseFontPt}pt`);
  root.style.colorScheme = isDark ? 'dark' : 'light';

  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', themeColor);
  }
};

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => readStoredPreferences());

  useEffect(() => {
    applyPreferencesToDocument(preferences);
    safeSetStorageItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    safeSetStorageItem(LEGACY_THEME_STORAGE_KEY, preferences.theme);
    safeRemoveStorageItem(LEGACY_DARK_MODE_KEY);
  }, [preferences]);

  useEffect(() => {
    if (preferences.theme !== 'auto') return;

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
      setTheme: (theme: ThemePreference) =>
        setPreferences((current) => ({ ...current, theme })),
      setFontFamily: (fontFamily: FontPreference) =>
        setPreferences((current) => ({ ...current, fontFamily: normalizeFontPreference(fontFamily) })),
      isDarkMode: resolveThemePreference(preferences.theme, getSystemThemeIsDark()).isDark,
    }),
    [preferences]
  );
};
