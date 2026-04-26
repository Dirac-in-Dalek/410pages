export type FontCategory = 'sans' | 'serif' | 'nanum' | 'display' | 'mono';

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
    label: '명조',
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
    category: 'nanum',
  },
  {
    id: 'nanum-myeongjo',
    label: '나눔명조',
    fontFamily: "'Nanum Myeongjo', 'Iowan Old Style', 'Times New Roman', serif",
    category: 'nanum',
  },
  {
    id: 'gowun-batang',
    label: '고운바탕',
    fontFamily: "'Gowun Batang', 'Iowan Old Style', 'Times New Roman', serif",
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
    fontFamily: "'Sunflower', 'Noto Serif KR', 'Iowan Old Style', serif",
    category: 'serif',
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

export const DEFAULT_FONT_ID: FontPreference = 'pretendard';

export const FONT_OPTION_BY_ID = new Map<FontPreference, (typeof FONT_OPTIONS)[number]>(
  FONT_OPTIONS.map((option) => [option.id, option])
);

export const FONT_IDS = FONT_OPTIONS.map((option) => option.id);

export const isFontPreference = (value: unknown): value is FontPreference =>
  typeof value === 'string' && FONT_OPTION_BY_ID.has(value as FontPreference);

export const normalizeFontPreference = (value: unknown): FontPreference =>
  isFontPreference(value) ? value : DEFAULT_FONT_ID;

export const getFontOption = (value: unknown) => FONT_OPTION_BY_ID.get(normalizeFontPreference(value));
