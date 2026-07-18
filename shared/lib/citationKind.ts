import type { CitationKind } from '../../types';

export const countCitationWords = (text: string) => {
  const normalized = text.trim().replace(/\s+/g, ' ');
  return normalized ? normalized.split(' ').length : 0;
};

export const classifyCitationKind = (text: string): CitationKind => {
  const wordCount = countCitationWords(text);
  return wordCount >= 1 && wordCount <= 2 ? 'word' : 'sentence';
};
