export type FontCategory = 'sans' | 'serif' | 'display' | 'mono';

export type FontOption<Id extends string = string> = {
  id: Id;
  label: string;
  fontFamily: string;
  category: FontCategory;
};

export const FONT_OPTIONS = [
  {
    id: 'pretendard',
    label: '프리텐다드',
    fontFamily:
      "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
    category: 'sans',
  },
  {
    id: 'serif',
    label: 'Noto Serif KR',
    fontFamily: "'Noto Serif KR', 'Iowan Old Style', 'Times New Roman', serif",
    category: 'serif',
  },
  {
    id: 'noto-sans-kr',
    label: 'Noto Sans KR',
    fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
    category: 'sans',
  },
  {
    id: 'asta-sans',
    label: 'Asta Sans',
    fontFamily: "'Asta Sans', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
    category: 'sans',
  },
  {
    id: 'ibm-plex-sans-kr',
    label: 'IBM Plex Sans KR',
    fontFamily: "'IBM Plex Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
    category: 'sans',
  },
  {
    id: 'gothic-a1',
    label: 'Gothic A1',
    fontFamily: "'Gothic A1', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
    category: 'sans',
  },
  {
    id: 'gowun-dodum',
    label: '고운돋움',
    fontFamily: "'Gowun Dodum', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
    category: 'sans',
  },
  {
    id: 'nanum-gothic',
    label: '나눔고딕',
    fontFamily: "'Nanum Gothic', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif",
    category: 'sans',
  },
  {
    id: 'orbit',
    label: 'Orbit',
    fontFamily: "'Orbit', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
    category: 'sans',
  },
  {
    id: 'nanum-myeongjo',
    label: '나눔명조',
    fontFamily: "'Nanum Myeongjo', 'Iowan Old Style', 'Times New Roman', serif",
    category: 'serif',
  },
  {
    id: 'diphylleia',
    label: 'Diphylleia',
    fontFamily: "'Diphylleia', 'Noto Serif KR', 'Iowan Old Style', serif",
    category: 'serif',
  },
  {
    id: 'gowun-batang',
    label: '고운바탕',
    fontFamily: "'Gowun Batang', 'Iowan Old Style', 'Times New Roman', serif",
    category: 'serif',
  },
  {
    id: 'grandiflora-one',
    label: 'Grandiflora One',
    fontFamily: "'Grandiflora One', 'Noto Serif KR', 'Iowan Old Style', serif",
    category: 'serif',
  },
  {
    id: 'hahmlet',
    label: '함렛',
    fontFamily: "'Hahmlet', 'Noto Serif KR', 'Iowan Old Style', serif",
    category: 'serif',
  },
  {
    id: 'song-myung',
    label: '송명',
    fontFamily: "'Song Myung', 'Noto Serif KR', 'Iowan Old Style', serif",
    category: 'serif',
  },
  {
    id: 'sunflower',
    label: '해바라기',
    fontFamily: "'Sunflower', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
    category: 'sans',
  },
  {
    id: 'nanum-gothic-coding',
    label: '나눔고딕코딩',
    fontFamily: "'Nanum Gothic Coding', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
    category: 'mono',
  },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    fontFamily: "'JetBrains Mono', 'Nanum Gothic Coding', 'SFMono-Regular', Consolas, monospace",
    category: 'mono',
  },
  {
    id: 'fira-code',
    label: 'Fira Code',
    fontFamily: "'Fira Code', 'Nanum Gothic Coding', 'SFMono-Regular', Consolas, monospace",
    category: 'mono',
  },
  {
    id: 'source-code-pro',
    label: 'Source Code Pro',
    fontFamily: "'Source Code Pro', 'Nanum Gothic Coding', 'SFMono-Regular', Consolas, monospace",
    category: 'mono',
  },
  {
    id: 'roboto-mono',
    label: 'Roboto Mono',
    fontFamily: "'Roboto Mono', 'Nanum Gothic Coding', 'SFMono-Regular', Consolas, monospace",
    category: 'mono',
  },
  {
    id: 'do-hyeon',
    label: '도현',
    fontFamily: "'Do Hyeon', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
    category: 'display',
  },
  {
    id: 'jua',
    label: '주아',
    fontFamily: "'Jua', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
    category: 'display',
  },
  {
    id: 'black-han-sans',
    label: '검은고딕',
    fontFamily: "'Black Han Sans', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
    category: 'display',
  },
] as const satisfies readonly FontOption[];

export type FontPreference = (typeof FONT_OPTIONS)[number]['id'];

const GOOGLE_FONT_QUERY_BY_ID: Partial<Record<FontPreference, string>> = {
  serif: 'Noto+Serif+KR:wght@400;500;600;700',
  'noto-sans-kr': 'Noto+Sans+KR:wght@400;500;600;700',
  'asta-sans': 'Asta+Sans:wght@300;400;500;600;700;800',
  'ibm-plex-sans-kr': 'IBM+Plex+Sans+KR:wght@400;500;600;700',
  'gothic-a1': 'Gothic+A1:wght@400;500;600;700;800',
  'gowun-dodum': 'Gowun+Dodum',
  'nanum-gothic': 'Nanum+Gothic:wght@400;700;800',
  orbit: 'Orbit',
  'nanum-myeongjo': 'Nanum+Myeongjo:wght@400;700;800',
  diphylleia: 'Diphylleia',
  'gowun-batang': 'Gowun+Batang:wght@400;700',
  'grandiflora-one': 'Grandiflora+One',
  hahmlet: 'Hahmlet:wght@400;500;600;700',
  'song-myung': 'Song+Myung',
  sunflower: 'Sunflower:wght@300;500;700',
  'nanum-gothic-coding': 'Nanum+Gothic+Coding:wght@400;700',
  'jetbrains-mono': 'JetBrains+Mono:wght@400;500;600;700',
  'fira-code': 'Fira+Code:wght@400;500;600;700',
  'source-code-pro': 'Source+Code+Pro:wght@400;500;600;700',
  'roboto-mono': 'Roboto+Mono:wght@400;500;600;700',
  'do-hyeon': 'Do+Hyeon',
  jua: 'Jua',
  'black-han-sans': 'Black+Han+Sans',
};

export const READING_FONT_STYLESHEET_ID = 'selected-reading-font';

export const getReadingFontStylesheetUrl = (value: unknown) => {
  const query = GOOGLE_FONT_QUERY_BY_ID[normalizeFontPreference(value)];
  return query ? `https://fonts.googleapis.com/css2?family=${query}&display=swap` : null;
};

export const ensureReadingFontLoaded = (value: unknown) => {
  if (typeof document === 'undefined') return;
  const href = getReadingFontStylesheetUrl(value);
  const current = document.getElementById(READING_FONT_STYLESHEET_ID);

  if (!href) {
    current?.remove();
    return;
  }

  const link = current instanceof HTMLLinkElement ? current : document.createElement('link');
  link.id = READING_FONT_STYLESHEET_ID;
  link.rel = 'stylesheet';
  if (link.getAttribute('href') !== href) link.href = href;
  if (!link.isConnected) document.head.appendChild(link);
};

export const DEFAULT_FONT_ID: FontPreference = 'nanum-myeongjo';

export const FONT_OPTION_BY_ID = new Map<FontPreference, (typeof FONT_OPTIONS)[number]>(
  FONT_OPTIONS.map((option) => [option.id, option])
);

export const FONT_IDS = FONT_OPTIONS.map((option) => option.id);

export const isFontPreference = (value: unknown): value is FontPreference =>
  typeof value === 'string' && FONT_OPTION_BY_ID.has(value as FontPreference);

export const normalizeFontPreference = (value: unknown): FontPreference =>
  isFontPreference(value) ? value : DEFAULT_FONT_ID;

export const getFontOption = (value: unknown) => FONT_OPTION_BY_ID.get(normalizeFontPreference(value));
