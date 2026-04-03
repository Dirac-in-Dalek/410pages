import { useEffect, useMemo, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type FontPreference = 'pretendard' | 'serif';
export type TextScalePreference = 'sm' | 'md' | 'lg';

export type UserPreferences = {
  theme: ThemePreference;
  fontFamily: FontPreference;
  baseFontPt: number;
};

export const PREFERENCES_STORAGE_KEY = 'user-preferences';
const LEGACY_THEME_STORAGE_KEY = 'theme-preference';
const LEGACY_DARK_MODE_KEY = 'dark-mode';
const DARK_THEME_COLOR = '#191919';
const LIGHT_THEME_COLOR = '#ffffff';
const DEFAULT_BASE_FONT_PT = 16;
const MIN_BASE_FONT_PT = 10;
const MAX_BASE_FONT_PT = 40;
const LEGACY_TEXT_SCALE_TO_BASE_FONT_PT: Record<TextScalePreference, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  fontFamily: 'pretendard',
  baseFontPt: DEFAULT_BASE_FONT_PT,
};

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

const isFontPreference = (value: unknown): value is FontPreference =>
  value === 'pretendard' || value === 'serif';

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
      ? value as Partial<UserPreferences> & { textScale?: unknown }
      : {};
  const baseFontPt =
    candidate.baseFontPt !== undefined
      ? normalizeBaseFontPt(candidate.baseFontPt)
      : getBaseFontPtFromLegacyTextScale(candidate.textScale);

  return {
    theme: isThemePreference(candidate.theme) ? candidate.theme : DEFAULT_PREFERENCES.theme,
    fontFamily: isFontPreference(candidate.fontFamily) ? candidate.fontFamily : DEFAULT_PREFERENCES.fontFamily,
    baseFontPt,
  };
};

const getSystemTheme = (): 'light' | 'dark' =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const resolveTheme = (theme: ThemePreference): 'light' | 'dark' =>
  theme === 'system' ? getSystemTheme() : theme;

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
  if (isThemePreference(legacyTheme)) {
    return { ...DEFAULT_PREFERENCES, theme: legacyTheme };
  }

  const legacyDarkMode = safeGetStorageItem(LEGACY_DARK_MODE_KEY);
  if (legacyDarkMode !== null) {
    try {
      return {
        ...DEFAULT_PREFERENCES,
        theme: JSON.parse(legacyDarkMode) ? 'dark' : 'light',
      };
    } catch {
      safeRemoveStorageItem(LEGACY_DARK_MODE_KEY);
    }
  }

  return DEFAULT_PREFERENCES;
};

export const applyPreferencesToDocument = (preferences: UserPreferences) => {
  const root = document.documentElement;
  const effectiveTheme = resolveTheme(preferences.theme);
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const baseFontScale = preferences.baseFontPt / DEFAULT_BASE_FONT_PT;

  root.classList.toggle('dark', effectiveTheme === 'dark');
  root.dataset.font = preferences.fontFamily;
  root.style.setProperty('--font-base-pt', `${preferences.baseFontPt}pt`);
  root.style.setProperty('--text-scale', `${baseFontScale}`);

  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', effectiveTheme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
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
    if (preferences.theme !== 'system') return;

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
        setPreferences((current) => ({ ...current, fontFamily })),
      isDarkMode: resolveTheme(preferences.theme) === 'dark',
    }),
    [preferences]
  );
};
