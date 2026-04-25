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
    themeColor: '#f8f7f5',
    preview: {
      background: '#f8f7f5',
      accent: '#d10f25',
      border: '#e5ded5',
    },
  },
  {
    id: 'day',
    label: 'Day',
    description: 'Clean neutral light.',
    scheme: 'light',
    themeColor: '#f8f7f5',
    preview: {
      background: '#f8f7f5',
      accent: '#d10f25',
      border: '#e5ded5',
    },
  },
  {
    id: 'night',
    label: 'Night',
    description: 'Warm graphite dark.',
    scheme: 'dark',
    themeColor: '#181614',
    preview: {
      background: '#181614',
      accent: '#ff5a67',
      border: '#3a342f',
    },
  },
  {
    id: 'warm-paper',
    label: 'Warm Paper',
    description: 'Cream paper with oxblood.',
    scheme: 'light',
    themeColor: '#f7f1e8',
    preview: {
      background: '#f7f1e8',
      accent: '#9f2634',
      border: '#e5d8ca',
    },
  },
  {
    id: 'soft-slate',
    label: 'Soft Slate',
    description: 'Cool paper with ink red.',
    scheme: 'light',
    themeColor: '#f4f7f8',
    preview: {
      background: '#f4f7f8',
      accent: '#bf2435',
      border: '#dce6eb',
    },
  },
  {
    id: 'terminal-green',
    label: 'Terminal Green',
    description: 'Readable terminal glow.',
    scheme: 'dark',
    themeColor: '#07100a',
    preview: {
      background: '#07100a',
      accent: '#7ee264',
      border: '#24412a',
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
