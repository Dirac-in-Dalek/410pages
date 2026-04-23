import type { FontPreference as FontPreferenceValue } from '../../../lib/fontRegistry';
import type { ThemePreference as ThemePreferenceValue } from '../../../lib/themeRegistry';

export type FontPreference = FontPreferenceValue;
export type ThemePreference = ThemePreferenceValue;
export type TextScalePreference = 'sm' | 'md' | 'lg';

export type UserPreferences = {
  theme: ThemePreference;
  fontFamily: FontPreference;
  baseFontPt: number;
};
