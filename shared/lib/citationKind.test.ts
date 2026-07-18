import { describe, expect, it } from 'vitest';
import { classifyCitationKind, countCitationWords } from './citationKind';

describe('citation kind policy', () => {
  it.each([
    ['', 0, 'sentence'],
    ['   ', 0, 'sentence'],
    ['고독', 1, 'word'],
    ['  근원적   고독  ', 2, 'word'],
    ['근원적\n고독', 2, 'word'],
    ['이것은 짧은 문장', 3, 'sentence'],
  ] as const)('classifies %j from its normalized word count', (text, count, kind) => {
    expect(countCitationWords(text)).toBe(count);
    expect(classifyCitationKind(text)).toBe(kind);
  });
});
