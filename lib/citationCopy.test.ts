import { describe, expect, it } from 'vitest';
import type { Citation } from '../types';
import { formatCitationCopyText, formatCitationRecoveryText } from './citationCopy';

const word: Citation = {
  id: 'word-1',
  kind: 'sentence',
  text: '필연적 선택',
  author: 'Albert Camus',
  book: 'The Myth of Sisyphus',
  page: '147',
  notes: [{ id: 'note-1', content: 'Hidden note', createdAt: 1 }],
  tags: [],
  createdAt: 1,
};

describe('citation copy formatting', () => {
  it('includes the source and notes for short citations', () => {
    expect(formatCitationCopyText(word, 'Reader', true)).toBe('"필연적 선택" — Albert Camus, 『The Myth of Sisyphus』, p.147\n\nNotes:\n- Hidden note');
    expect(formatCitationRecoveryText(word, 'Reader')).toContain('페이지: 147');
  });

  it('keeps the existing sentence format', () => {
    expect(formatCitationCopyText({ ...word, kind: 'sentence', text: 'A full sentence.' }, 'Reader')).toBe(
      '"A full sentence." — Albert Camus, 『The Myth of Sisyphus』, p.147'
    );
  });
});
