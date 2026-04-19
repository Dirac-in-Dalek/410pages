export type ThemePreference = 'auto' | 'day' | 'night' | 'warm-paper' | 'soft-slate' | 'terminal-green';

export type ThemeScheme = 'light' | 'dark' | 'auto';

export type ThemeOption = {
  id: ThemePreference;
  label: string;
  description: string;
  scheme: ThemeScheme;
  themeColor: string;
  preview: {
    background: string;
    accent: string;
    border: string;
  };
};

export type ResolvedTheme = Exclude<ThemePreference, 'auto'>;

export const THEME_OPTIONS = [
  {
    id: 'auto',
    label: 'Auto',
    description: 'Follows the system appearance.',
    scheme: 'auto',
    themeColor: '#fcfcfb',
    preview: {
      background: '#f4f3ef',
      accent: '#37352f',
      border: '#e3e0da',
    },
  },
  {
    id: 'day',
    label: 'Day',
    description: 'Clean neutral light.',
    scheme: 'light',
    themeColor: '#fcfcfb',
    preview: {
      background: '#fcfcfb',
      accent: '#37352f',
      border: '#e3e0da',
    },
  },
  {
    id: 'night',
    label: 'Night',
    description: 'Classic dark surface.',
    scheme: 'dark',
    themeColor: '#171717',
    preview: {
      background: '#171717',
      accent: '#e8e8e6',
      border: '#333333',
    },
  },
  {
    id: 'warm-paper',
    label: 'Warm Paper',
    description: 'Creamy paper tones.',
    scheme: 'light',
    themeColor: '#f7f2e8',
    preview: {
      background: '#f7f2e8',
      accent: '#4a3b2e',
      border: '#ded2c2',
    },
  },
  {
    id: 'soft-slate',
    label: 'Soft Slate',
    description: 'Cool editorial gray.',
    scheme: 'light',
    themeColor: '#edf1f4',
    preview: {
      background: '#edf1f4',
      accent: '#24303b',
      border: '#d7e0e8',
    },
  },
  {
    id: 'terminal-green',
    label: 'Terminal Green',
    description: 'Black screen with green ink.',
    scheme: 'dark',
    themeColor: '#040804',
    preview: {
      background: '#040804',
      accent: '#71ff4c',
      border: '#1f5f22',
    },
  },
] as const satisfies readonly ThemeOption[];

export const THEME_OPTION_BY_ID = new Map<ThemePreference, (typeof THEME_OPTIONS)[number]>(
  THEME_OPTIONS.map((option) => [option.id, option])
);

export const DEFAULT_THEME: ThemePreference = 'auto';

const LEGACY_THEME_MAP: Record<'system' | 'light' | 'dark', ThemePreference> = {
  system: 'auto',
  light: 'day',
  dark: 'night',
};

export const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === 'string' && THEME_OPTION_BY_ID.has(value as ThemePreference);

export const normalizeThemePreference = (value: unknown): ThemePreference => {
  if (isThemePreference(value)) {
    return value;
  }

  if (value === 'system' || value === 'light' || value === 'dark') {
    return LEGACY_THEME_MAP[value];
  }

  return DEFAULT_THEME;
};

export const resolveThemePreference = (theme: ThemePreference, prefersDark: boolean) => {
  const resolvedTheme: ResolvedTheme = theme === 'auto' ? (prefersDark ? 'night' : 'day') : theme;
  const option = THEME_OPTION_BY_ID.get(resolvedTheme);

  return {
    resolvedTheme,
    isDark: option?.scheme === 'dark',
    themeColor: option?.themeColor ?? THEME_OPTION_BY_ID.get('day')!.themeColor,
  };
};

export const getThemeOption = (value: unknown) => THEME_OPTION_BY_ID.get(normalizeThemePreference(value));
