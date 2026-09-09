import { Citation } from '../types';

export const formatCitationCopyText = (
  citation: Citation,
  username: string,
  includeNotes: boolean = false
): string => {
  const isSelf = citation.isSelf ?? (citation.author === username || !citation.author || citation.author === 'Self');

  let text = `"${citation.text}"`;
  if (!isSelf && citation.author) {
    text += ` — ${citation.author}`;
    if (citation.book) text += `, 『${citation.book}』`;
    if (citation.page) text += `, p.${citation.page}`;
  }

  if (!includeNotes) return text;

  const noteLines = citation.notes
    .map(note => note.content.trim())
    .filter(Boolean);

  if (noteLines.length === 0) return text;

  return `${text}\n\nNotes:\n${noteLines.map(note => `- ${note}`).join('\n')}`;
};

export const formatCitationRecoveryText = (citation: Citation, username: string): string => {
  const isSelf = citation.isSelf ?? (citation.author === username || !citation.author || citation.author === 'Self');
  const lines = [`인용구: ${citation.text}`];

  if (isSelf) {
    lines.push(`저자: ${username}`);
  } else if (citation.author) {
    lines.push(`저자: ${citation.author}`);
  }

  if (citation.book) {
    lines.push(`책: ${citation.book}`);
  }
  if (citation.page) {
    lines.push(`페이지: ${citation.page}`);
  }

  return lines.join('\n');
};

export const writeTextToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
};
