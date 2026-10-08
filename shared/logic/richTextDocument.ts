import type { JSONContent } from '@tiptap/core';
import type { TextFormatRange } from '../../types';
import { normalizeTextFormats, textFormatSegments } from './textFormats';

export function textToDocument(text: string, formats: TextFormatRange[] = []): JSONContent {
  let offset = 0;
  const segments = textFormatSegments(text, formats);
  return { type: 'doc', content: text.split('\n').map(line => {
    const start = offset;
    offset += line.length + 1;
    return { type: 'paragraph', content: segments.filter(range => range.start < start + line.length && range.end > start).map(range => {
      const marks: NonNullable<JSONContent['marks']> = [];
      for (const flag of ['bold', 'italic', 'underline', 'highlight'] as const) if (range[flag]) marks.push({ type: flag });
      if (range.fontSizeOffset) marks.push({ type: 'relativeSize', attrs: { offset: range.fontSizeOffset } });
      return { type: 'text', text: text.slice(Math.max(start, range.start), Math.min(start + line.length, range.end)), ...(marks.length ? { marks } : {}) };
    }) };
  }) };
}

export function documentToText(doc: JSONContent): { text: string; formats: TextFormatRange[] } {
  let text = '';
  const formats: TextFormatRange[] = [];
  const blocks = doc.content ?? [];
  const append = (node: JSONContent) => {
    const start = text.length;
    if (node.type === 'hardBreak') text += '\n';
    else if (node.type === 'text') text += node.text ?? '';
    else { node.content?.forEach(append); return; }
    const range: TextFormatRange = { start, end: text.length };
    for (const mark of node.marks ?? []) {
      if (['bold', 'italic', 'underline', 'highlight'].includes(mark.type)) range[mark.type as 'bold'] = true;
      if (mark.type === 'relativeSize') range.fontSizeOffset = Number(mark.attrs?.offset) || 0;
    }
    formats.push(range);
  };
  blocks.forEach((block, index) => { if (index) text += '\n'; append(block); });
  return { text, formats: normalizeTextFormats(formats, text.length) };
}
