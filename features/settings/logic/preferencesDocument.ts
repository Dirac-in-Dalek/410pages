import { resolveThemePreference } from '../../../lib/themeRegistry';
import type { UserPreferences } from '../contract/userPreferences';

export const getSystemThemeIsDark = (): boolean =>
  window.matchMedia('(prefers-color-scheme: dark)').matches;

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
