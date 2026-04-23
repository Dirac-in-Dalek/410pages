import { normalizeFontPreference } from '../../../lib/fontRegistry';
import { normalizeThemePreference } from '../../../lib/themeRegistry';
import type { UserPreferences } from '../contract/userPreferences';
import {
  DEFAULT_BASE_FONT_PT,
  LEGACY_TEXT_SCALE_TO_BASE_FONT_PT,
  MAX_BASE_FONT_PT,
  MIN_BASE_FONT_PT,
} from '../policy/userPreferences';

type StoredPreferencesCandidate = Partial<UserPreferences> & {
  textScale?: unknown;
};

export const normalizeBaseFontPt = (value: unknown): number => {
  const parsedValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_BASE_FONT_PT;
  }

  return Math.min(MAX_BASE_FONT_PT, Math.max(MIN_BASE_FONT_PT, Math.round(parsedValue)));
};

export const getBaseFontPtFromLegacyTextScale = (textScale: unknown): number => {
  if (textScale === 'sm' || textScale === 'md' || textScale === 'lg') {
    return LEGACY_TEXT_SCALE_TO_BASE_FONT_PT[textScale];
  }

  return DEFAULT_BASE_FONT_PT;
};

export const normalizePreferences = (value: unknown): UserPreferences => {
  const candidate =
    typeof value === 'object' && value !== null ? (value as StoredPreferencesCandidate) : {};
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
