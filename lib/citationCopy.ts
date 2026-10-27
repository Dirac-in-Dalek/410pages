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
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some browsers expose the API but deny writes. Try native copying too.
    }
  }

  const previousFocus = document.activeElement;
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.readOnly = true;
  textArea.style.cssText = 'position: fixed; top: 0; left: -9999px; font-size: 16px;';
  document.body.appendChild(textArea);
  try {
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    if (!document.execCommand('copy')) {
      throw new Error('Failed to write text to the clipboard.');
    }
  } finally {
    textArea.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
  }
};
