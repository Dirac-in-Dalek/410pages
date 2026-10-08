import { describe, expect, it } from 'vitest';
import { changeTextFormat, normalizeTextFormats, rebaseTextFormats, toggleTextFormat, formatsWithLegacyHighlights, legacyHighlightsFromFormats } from './textFormats';
import { documentToText, textToDocument } from './richTextDocument';

describe('selection formatting', () => {
  it('toggles partial and mixed ranges without losing other styles', () => {
    const initial = [{ start: 0, end: 4, bold: true }];
    const highlighted = toggleTextFormat('abcdef', initial, 2, 6, 'highlight');
    expect(highlighted).toEqual([{ start: 0, end: 2, bold: true }, { start: 2, end: 4, bold: true, highlight: true }, { start: 4, end: 6, highlight: true }]);
    expect(toggleTextFormat('abcdef', highlighted, 2, 6, 'highlight')).toEqual(initial);
    expect(toggleTextFormat('abcdef', initial, 2, 6, 'bold')).toEqual([{ start: 0, end: 6, bold: true }]);
  });
  it('steps each relative size independently and preserves central inheritance', () => {
    const next = changeTextFormat('abcd', [{ start: 0, end: 2, fontSizeOffset: 2 }], 0, 4, format => ({ ...format, fontSizeOffset: (format.fontSizeOffset ?? 0) + 1 }));
    expect(next).toEqual([{ start: 0, end: 2, fontSizeOffset: 3 }, { start: 2, end: 4, fontSizeOffset: 1 }]);
    expect(changeTextFormat('abcd', next, 0, 4, format => ({ ...format, fontSizeOffset: 0 }))).toEqual([]);
  });
  it('filters corrupted or out-of-bounds ranges and merges adjacent styles', () => {
    expect(normalizeTextFormats([{ start: -1, end: 2, bold: true }, { start: 0, end: 2, bold: true }, { start: 2, end: 4, bold: true }, { start: 3, end: 7, italic: true }, { start: 0, end: 1, script: 'unsafe' }], 4)).toEqual([{ start: 0, end: 4, bold: true }]);
  });
  it('rebases surviving styles on insertion, deletion and replacement', () => {
    const formats = [{ start: 1, end: 4, underline: true }];
    expect(rebaseTextFormats('abcde', 'aXbcde', formats)).toEqual([{ start: 2, end: 5, underline: true }]);
    expect(rebaseTextFormats('abcde', 'abXcde', formats)).toEqual([{ start: 1, end: 5, underline: true }]);
    expect(rebaseTextFormats('abcde', 'ae', formats)).toEqual([]);
    expect(rebaseTextFormats('abcde', 'abXYde', formats)).toEqual([{ start: 1, end: 5, underline: true }]);
  });
  it('keeps emoji offsets in UTF-16 and preserves exact multiline memo text', () => {
    const text = '한😀글\n\n 둘째\n';
    const formats = [{ start: 1, end: 3, bold: true, highlight: true, fontSizeOffset: 2 }, { start: 7, end: 9, italic: true }];
    expect(documentToText(textToDocument(text, formats))).toEqual({ text, formats });
    expect(documentToText(textToDocument(''))).toEqual({ text: '', formats: [] });
  });
  it('accepts paragraph breaks and Shift+Enter breaks from the editor', () => {
    expect(documentToText({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '첫' }, { type: 'hardBreak' }, { type: 'text', text: '줄' }] }, { type: 'paragraph' }] })).toEqual({ text: '첫\n줄\n', formats: [] });
  });
  it('retains old highlights and reflects toolbar changes back to the legacy field', () => {
    const formats = formatsWithLegacyHighlights('abc', [{ start: 0, end: 3, bold: true }], [{ id: 'old', start: 1, end: 3 }]);
    expect(formats).toEqual([{ start: 0, end: 1, bold: true }, { start: 1, end: 3, bold: true, highlight: true }]);
    expect(legacyHighlightsFromFormats(toggleTextFormat('abc', formats, 1, 3, 'highlight'))).toEqual([]);
  });
});
