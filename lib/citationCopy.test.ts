import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Citation } from '../types';
import { formatCitationCopyText, formatCitationRecoveryText, writeTextToClipboard } from './citationCopy';

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

describe('writing citation text to the clipboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
    Reflect.deleteProperty(document, 'execCommand');
  });

  const setup = (secure = true) => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const execCommand = vi.fn().mockReturnValue(true);
    vi.stubGlobal('isSecureContext', secure);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    return { writeText, execCommand };
  };

  it('uses the clipboard API when it succeeds', async () => {
    const { writeText, execCommand } = setup();
    await writeTextToClipboard('selected citations');
    expect(writeText).toHaveBeenCalledWith('selected citations');
    expect(execCommand).not.toHaveBeenCalled();
  });

  it.each([true, false])('copies with the fallback and restores focus (secure: %s)', async secure => {
    const { writeText, execCommand } = setup(secure);
    writeText.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    execCommand.mockImplementation(() => {
      const textarea = document.querySelector('textarea');
      expect(textarea?.value).toBe('selected citations');
      expect(textarea?.selectionEnd).toBe('selected citations'.length);
      return true;
    });

    await writeTextToClipboard('selected citations');

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it.each(['returns false', 'throws'])('reports failure and removes the textarea when fallback %s', async mode => {
    const { writeText, execCommand } = setup();
    writeText.mockRejectedValue(new Error('Clipboard API unavailable'));
    execCommand.mockImplementation(() => {
      if (mode === 'throws') throw new Error('Copy failed');
      return false;
    });

    await expect(writeTextToClipboard('selected citations')).rejects.toThrow();
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });
});
