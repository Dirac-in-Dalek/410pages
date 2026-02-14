import { useEffect, useMemo, useState } from 'react';

type ThemePreference = 'system' | 'light' | 'dark';
type EffectiveTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme-preference';
const LEGACY_THEME_STORAGE_KEY = 'dark-mode';

const getSystemTheme = (): EffectiveTheme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const resolveTheme = (preference: ThemePreference): EffectiveTheme =>
  preference === 'system' ? getSystemTheme() : preference;

const applyTheme = (theme: EffectiveTheme) => {
  const root = window.document.documentElement;
  const themeColorMeta = window.document.querySelector('meta[name="theme-color"]');

  root.classList.toggle('dark', theme === 'dark');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', theme === 'dark' ? '#191919' : '#ffffff');
  }
};

const readThemePreference = (): ThemePreference => {
  const storedPreference = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedPreference === 'system' || storedPreference === 'light' || storedPreference === 'dark') {
    return storedPreference;
  }

  const legacyPreference = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (legacyPreference !== null) {
    try {
      const parsedLegacy = JSON.parse(legacyPreference);
      const migratedPreference: ThemePreference = parsedLegacy ? 'dark' : 'light';
      localStorage.setItem(THEME_STORAGE_KEY, migratedPreference);
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
      return migratedPreference;
    } catch {
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    }
  }

  return 'system';
};

export const useDarkMode = () => {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => readThemePreference());
  const isDarkMode = useMemo(() => resolveTheme(themePreference) === 'dark', [themePreference]);

  useEffect(() => {
    const resolvedTheme = resolveTheme(themePreference);
    applyTheme(resolvedTheme);
    localStorage.setItem(THEME_STORAGE_KEY, themePreference);
  }, [themePreference]);

  useEffect(() => {
    if (themePreference !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = () => applyTheme(mediaQuery.matches ? 'dark' : 'light');

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleThemeChange);
    } else {
      mediaQuery.addListener(handleThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleThemeChange);
      } else {
        mediaQuery.removeListener(handleThemeChange);
      }
    };
  }, [themePreference]);

  const toggleDarkMode = () => {
    const currentTheme = resolveTheme(themePreference);
    setThemePreference(currentTheme === 'dark' ? 'light' : 'dark');
  };

  return { isDarkMode, toggleDarkMode };
};
