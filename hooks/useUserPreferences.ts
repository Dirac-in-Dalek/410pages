import { useEffect, useMemo, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type FontPreference = 'pretendard' | 'serif';
export type TextScalePreference = 'sm' | 'md' | 'lg';

export type UserPreferences = {
  theme: ThemePreference;
  fontFamily: FontPreference;
  textScale: TextScalePreference;
};

export const PREFERENCES_STORAGE_KEY = 'user-preferences';
const LEGACY_THEME_STORAGE_KEY = 'theme-preference';
const LEGACY_DARK_MODE_KEY = 'dark-mode';
const DARK_THEME_COLOR = '#191919';
const LIGHT_THEME_COLOR = '#ffffff';

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  fontFamily: 'pretendard',
  textScale: 'md',
};

const TEXT_SCALE_MAP: Record<TextScalePreference, string> = {
  sm: '0.9375',
  md: '1',
  lg: '1.125',
};

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

const isFontPreference = (value: unknown): value is FontPreference =>
  value === 'pretendard' || value === 'serif';

const isTextScalePreference = (value: unknown): value is TextScalePreference =>
  value === 'sm' || value === 'md' || value === 'lg';

const normalizePreferences = (value: unknown): UserPreferences => {
  const candidate = typeof value === 'object' && value !== null ? value as Partial<UserPreferences> : {};

  return {
    theme: isThemePreference(candidate.theme) ? candidate.theme : DEFAULT_PREFERENCES.theme,
    fontFamily: isFontPreference(candidate.fontFamily) ? candidate.fontFamily : DEFAULT_PREFERENCES.fontFamily,
    textScale: isTextScalePreference(candidate.textScale) ? candidate.textScale : DEFAULT_PREFERENCES.textScale,
  };
};

const getSystemTheme = (): 'light' | 'dark' =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const resolveTheme = (theme: ThemePreference): 'light' | 'dark' =>
  theme === 'system' ? getSystemTheme() : theme;

export const readStoredPreferences = (): UserPreferences => {
  const storedPreferences = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);

  if (storedPreferences) {
    try {
      return normalizePreferences(JSON.parse(storedPreferences));
    } catch {
      window.localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    }
  }

  const legacyTheme = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (isThemePreference(legacyTheme)) {
    return { ...DEFAULT_PREFERENCES, theme: legacyTheme };
  }

  const legacyDarkMode = window.localStorage.getItem(LEGACY_DARK_MODE_KEY);
  if (legacyDarkMode !== null) {
    try {
      return {
        ...DEFAULT_PREFERENCES,
        theme: JSON.parse(legacyDarkMode) ? 'dark' : 'light',
      };
    } catch {
      window.localStorage.removeItem(LEGACY_DARK_MODE_KEY);
    }
  }

  return DEFAULT_PREFERENCES;
};

export const applyPreferencesToDocument = (preferences: UserPreferences) => {
  const root = document.documentElement;
  const effectiveTheme = resolveTheme(preferences.theme);
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  root.classList.toggle('dark', effectiveTheme === 'dark');
  root.dataset.font = preferences.fontFamily;
  root.style.setProperty('--text-scale', TEXT_SCALE_MAP[preferences.textScale]);

  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', effectiveTheme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }
};

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => readStoredPreferences());

  useEffect(() => {
    applyPreferencesToDocument(preferences);
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    window.localStorage.setItem(LEGACY_THEME_STORAGE_KEY, preferences.theme);
    window.localStorage.removeItem(LEGACY_DARK_MODE_KEY);
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
      setTheme: (theme: ThemePreference) =>
        setPreferences((current) => ({ ...current, theme })),
      setFontFamily: (fontFamily: FontPreference) =>
        setPreferences((current) => ({ ...current, fontFamily })),
      setTextScale: (textScale: TextScalePreference) =>
        setPreferences((current) => ({ ...current, textScale })),
      isDarkMode: resolveTheme(preferences.theme) === 'dark',
    }),
    [preferences]
  );
};
