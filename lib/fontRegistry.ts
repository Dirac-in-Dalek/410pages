export type FontCategory = 'sans' | 'serif' | 'nanum';

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
    id: 'nanum-gothic-coding',
    label: '나눔고딕코딩',
    fontFamily: "'Nanum Gothic Coding', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
    category: 'nanum',
  },
  {
    id: 'nanum-brush-script',
    label: '나눔손글씨 붓',
    fontFamily: "'Nanum Brush Script', 'Nanum Pen Script', 'Apple Chancery', 'Segoe Script', cursive",
    category: 'nanum',
  },
  {
    id: 'nanum-pen-script',
    label: '나눔손글씨 펜',
    fontFamily: "'Nanum Pen Script', 'Nanum Brush Script', 'Apple Chancery', 'Segoe Script', cursive",
    category: 'nanum',
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
