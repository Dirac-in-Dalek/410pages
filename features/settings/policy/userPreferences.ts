import { DEFAULT_FONT_ID } from '../../../lib/fontRegistry';
import { DEFAULT_THEME } from '../../../lib/themeRegistry';
import type { TextScalePreference, UserPreferences } from '../contract/userPreferences';

export const PREFERENCES_STORAGE_KEY = 'user-preferences';
export const LEGACY_THEME_STORAGE_KEY = 'theme-preference';
export const LEGACY_DARK_MODE_KEY = 'dark-mode';

export const DEFAULT_BASE_FONT_PT = 13;
export const MIN_BASE_FONT_PT = 10;
export const MAX_BASE_FONT_PT = 40;
export const DEFAULT_CITATION_WIDTH_REM = 44;
export const MIN_CITATION_WIDTH_REM = 35;
export const MAX_CITATION_WIDTH_REM = 50;

export const LEGACY_TEXT_SCALE_TO_BASE_FONT_PT: Record<TextScalePreference, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: DEFAULT_THEME,
  fontFamily: DEFAULT_FONT_ID,
  baseFontPt: DEFAULT_BASE_FONT_PT,
  citationWidthRem: DEFAULT_CITATION_WIDTH_REM,
};
