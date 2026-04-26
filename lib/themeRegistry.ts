export type ThemePreference =
  | 'auto'
  | 'day'
  | 'night'
  | 'warm-paper'
  | 'soft-slate'
  | 'terminal-green'
  | 'airbnb-light'
  | 'airbnb-dark'
  | 'bach-light'
  | 'bach-dark'
  | 'mahler-light'
  | 'mahler-dark'
  | 'shostakovich-light'
  | 'shostakovich-dark';

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
  {
    id: 'airbnb-light',
    label: 'Airbnb Light',
    description: 'Soft white with coral.',
    scheme: 'light',
    themeColor: '#fff7f6',
    preview: {
      background: '#fff7f6',
      accent: '#ff385c',
      border: '#f2d9d8',
    },
  },
  {
    id: 'airbnb-dark',
    label: 'Airbnb Dark',
    description: 'Charcoal with coral.',
    scheme: 'dark',
    themeColor: '#171012',
    preview: {
      background: '#171012',
      accent: '#ff5a78',
      border: '#3a252a',
    },
  },
  {
    id: 'bach-light',
    label: 'Bach Light',
    description: 'Vellum score and organ wood.',
    scheme: 'light',
    themeColor: '#f3ead8',
    preview: {
      background: '#f3ead8',
      accent: '#806231',
      border: '#d8c7aa',
    },
  },
  {
    id: 'bach-dark',
    label: 'Bach Dark',
    description: 'Organ loft in candlelight.',
    scheme: 'dark',
    themeColor: '#100d09',
    preview: {
      background: '#100d09',
      accent: '#d5af63',
      border: '#45351f',
    },
  },
  {
    id: 'mahler-light',
    label: 'Mahler Light',
    description: 'Vienna program and velvet.',
    scheme: 'light',
    themeColor: '#f1ece7',
    preview: {
      background: '#f1ece7',
      accent: '#8a2638',
      border: '#d9cbc9',
    },
  },
  {
    id: 'mahler-dark',
    label: 'Mahler Dark',
    description: 'Velvet hall with brass.',
    scheme: 'dark',
    themeColor: '#110c11',
    preview: {
      background: '#110c11',
      accent: '#d8a24f',
      border: '#45303b',
    },
  },
  {
    id: 'shostakovich-light',
    label: 'Shostakovich Light',
    description: 'Bureau paper and Soviet red.',
    scheme: 'light',
    themeColor: '#eeece6',
    preview: {
      background: '#eeece6',
      accent: '#a90f25',
      border: '#d7d0c5',
    },
  },
  {
    id: 'shostakovich-dark',
    label: 'Shostakovich Dark',
    description: 'Iron black and Soviet red.',
    scheme: 'dark',
    themeColor: '#090909',
    preview: {
      background: '#090909',
      accent: '#c8102e',
      border: '#332f2b',
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
