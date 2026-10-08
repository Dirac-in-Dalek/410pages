import { resolveThemePreference } from '../../../lib/themeRegistry';
import { ensureReadingFontLoaded } from '../../../lib/fontRegistry';
import type { ThemePreference, UserPreferences } from '../contract/userPreferences';

export const getSystemThemeIsDark = (): boolean =>
  window.matchMedia('(prefers-color-scheme: dark)').matches;

export const applyThemeToDocument = (theme: ThemePreference) => {
  const root = document.documentElement;
  const { resolvedTheme, isDark, themeColor } = resolveThemePreference(
    theme,
    theme === 'auto' && getSystemThemeIsDark()
  );
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  root.classList.toggle('dark', isDark);
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = isDark ? 'dark' : 'light';

  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', themeColor);
  }
};

export const applyPreferencesToDocument = (preferences: UserPreferences) => {
  applyThemeToDocument(preferences.theme);
  const root = document.documentElement;
  root.dataset.font = preferences.fontFamily;
  ensureReadingFontLoaded(preferences.fontFamily);
  root.style.setProperty('--font-base-pt', `${preferences.baseFontPt}pt`);
  root.style.setProperty('--citation-column-width', `${preferences.citationWidthRem}rem`);
};
