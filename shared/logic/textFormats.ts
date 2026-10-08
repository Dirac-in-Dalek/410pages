import type { Highlight, TextFormat, TextFormatRange } from '../../types';

export const MIN_TEXT_SIZE_OFFSET = -4;
export const MAX_TEXT_SIZE_OFFSET = 8;
export const TEXT_FORMAT_FLAGS = ['bold', 'italic', 'underline', 'highlight'] as const;
export type TextFormatFlag = typeof TEXT_FORMAT_FLAGS[number];

const cleanFormat = (value: TextFormat): TextFormat => {
  const format: TextFormat = {};
  for (const flag of TEXT_FORMAT_FLAGS) if (value[flag] === true) format[flag] = true;
  if (Number.isInteger(value.fontSizeOffset) && value.fontSizeOffset) {
    format.fontSizeOffset = Math.max(MIN_TEXT_SIZE_OFFSET, Math.min(MAX_TEXT_SIZE_OFFSET, value.fontSizeOffset!));
  }
  return format;
};

const sameFormat = (a: TextFormat, b: TextFormat) =>
  TEXT_FORMAT_FLAGS.every(flag => Boolean(a[flag]) === Boolean(b[flag]))
  && (a.fontSizeOffset ?? 0) === (b.fontSizeOffset ?? 0);

const hasFormat = (format: TextFormat) => TEXT_FORMAT_FLAGS.some(flag => format[flag]) || Boolean(format.fontSizeOffset);

export function normalizeTextFormats(value: unknown, textLength: number): TextFormatRange[] {
  if (!Array.isArray(value)) return [];
  const input = value.flatMap((entry): TextFormatRange[] => {
    if (!entry || typeof entry !== 'object') return [];
    const candidate = entry as TextFormatRange;
    if (!Number.isInteger(candidate.start) || !Number.isInteger(candidate.end)
      || candidate.start < 0 || candidate.end <= candidate.start || candidate.end > textLength) return [];
    const format = cleanFormat(candidate);
    return hasFormat(format) ? [{ start: candidate.start, end: candidate.end, ...format }] : [];
  }).sort((a, b) => a.start - b.start || a.end - b.end);
  const output: TextFormatRange[] = [];
  for (const range of input) {
    const previous = output.at(-1);
    const start = Math.max(range.start, previous?.end ?? 0);
    if (start >= range.end) continue;
    if (previous?.end === start && sameFormat(previous, range)) previous.end = range.end;
    else output.push({ ...range, start });
  }
  return output;
}

export function textFormatSegments(text: string, formats: TextFormatRange[]) {
  const ranges = normalizeTextFormats(formats, text.length);
  const segments: TextFormatRange[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (cursor < range.start) segments.push({ start: cursor, end: range.start });
    segments.push(range);
    cursor = range.end;
  }
  if (cursor < text.length) segments.push({ start: cursor, end: text.length });
  return segments;
}

export function changeTextFormat(
  text: string, value: TextFormatRange[], start: number, end: number,
  change: (format: TextFormat) => TextFormat,
): TextFormatRange[] {
  if (start < 0 || end > text.length || start >= end) return normalizeTextFormats(value, text.length);
  const segments = textFormatSegments(text, value);
  const next: TextFormatRange[] = [];
  for (const segment of segments) {
    const { start: from, end: to, ...format } = segment;
    if (to <= start || from >= end) { next.push(segment); continue; }
    if (from < start) next.push({ start: from, end: start, ...format });
    next.push({ start: Math.max(from, start), end: Math.min(to, end), ...cleanFormat(change(format)) });
    if (to > end) next.push({ start: end, end: to, ...format });
  }
  return normalizeTextFormats(next, text.length);
}

export const selectionFormats = (text: string, formats: TextFormatRange[], start: number, end: number) =>
  textFormatSegments(text, formats).filter(range => range.start < end && range.end > start);

export function toggleTextFormat(text: string, formats: TextFormatRange[], start: number, end: number, flag: TextFormatFlag) {
  const selected = selectionFormats(text, formats, start, end);
  const enabled = selected.length > 0 && selected.every(format => format[flag]);
  return changeTextFormat(text, formats, start, end, format => ({ ...format, [flag]: !enabled }));
}

export function rebaseTextFormats(before: string, after: string, formats: TextFormatRange[]): TextFormatRange[] {
  const ranges = normalizeTextFormats(formats, before.length);
  if (before === after) return ranges;
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  while (suffix < before.length - prefix && suffix < after.length - prefix
    && before[before.length - suffix - 1] === after[after.length - suffix - 1]) suffix++;
  const removedEnd = before.length - suffix;
  const insertedEnd = after.length - suffix;
  const delta = after.length - before.length;
  const next = ranges.flatMap((range): TextFormatRange[] => {
    if (range.end <= prefix) return [range];
    if (range.start >= removedEnd) return [{ ...range, start: range.start + delta, end: range.end + delta }];
    if (range.start <= prefix && range.end >= removedEnd) {
      return [{ ...range, end: range.end + delta }];
    }
    const survivors: TextFormatRange[] = [];
    if (range.start < prefix) survivors.push({ ...range, end: prefix });
    if (range.end > removedEnd) survivors.push({ ...range, start: insertedEnd, end: range.end + delta });
    return survivors;
  });
  return normalizeTextFormats(next, after.length);
}

export function formatsWithLegacyHighlights(text: string, formats: TextFormatRange[] | undefined, highlights: Highlight[] | undefined) {
  let next = normalizeTextFormats(formats, text.length).map(({ highlight: _legacy, ...range }) => range);
  for (const highlight of highlights ?? []) {
    if (highlight.start >= 0 && highlight.end <= text.length && highlight.start < highlight.end) {
      next = changeTextFormat(text, next, highlight.start, highlight.end, format => ({ ...format, highlight: true }));
    }
  }
  return normalizeTextFormats(next, text.length);
}

export const legacyHighlightsFromFormats = (formats: TextFormatRange[]): Highlight[] => formats
  .filter(range => range.highlight)
  .map(({ start, end }) => ({ id: `format-${start}-${end}`, start, end, color: 'yellow' }));
