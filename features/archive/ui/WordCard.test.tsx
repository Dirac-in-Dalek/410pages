import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Citation } from '../../../types';
import { writeTextToClipboard } from '../../../lib/citationCopy';
import { WordCard } from './WordCard';

vi.mock('../../../lib/citationCopy', () => ({
  writeTextToClipboard: vi.fn().mockResolvedValue(undefined),
}));

const word = (overrides: Partial<Citation> = {}): Citation => ({
  id: 'word-1',
  kind: 'word',
  text: '필연적 선택',
  author: 'Author',
  book: 'Book',
  notes: [],
  tags: [],
  createdAt: 100,
  ...overrides,
});

describe('WordCard', () => {
  it('only toggles selection through its checkbox', async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    render(
      <WordCard
        citation={word()}
        isSelected={false}
        onToggleSelect={onToggleSelect}
        onRetrySave={vi.fn()}
      />
    );

    await user.click(screen.getByText('필연적 선택'));
    expect(onToggleSelect).not.toHaveBeenCalled();

    const checkbox = screen.getByRole('checkbox', { name: 'Select word: 필연적 선택' });
    await user.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalledWith('word-1', true);
    expect(screen.getByText('필연적 선택').className).toContain('whitespace-nowrap');
  });

  it('keeps the same card footprint and disables selection while saving', () => {
    render(
      <WordCard
        citation={word({ saveStatus: 'saving' })}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onRetrySave={vi.fn()}
      />
    );

    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('저장 중')).toBeTruthy();
    expect(screen.getByRole('listitem').firstElementChild?.getAttribute('aria-busy')).toBe('true');
  });

  it('shows separate copy and retry recovery actions after a save failure', async () => {
    const user = userEvent.setup();
    const onRetrySave = vi.fn();
    render(
      <WordCard
        citation={word({ saveStatus: 'failed' })}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onRetrySave={onRetrySave}
      />
    );

    expect(screen.getByRole('alert').textContent).toContain('저장 실패');
    await user.click(screen.getByRole('button', { name: 'Copy failed word: 필연적 선택' }));
    expect(writeTextToClipboard).toHaveBeenCalledWith('필연적 선택');

    await user.click(screen.getByRole('button', { name: 'Retry saving word: 필연적 선택' }));
    expect(onRetrySave).toHaveBeenCalledWith('word-1');
  });

  it('reports a recovery copy failure without an unhandled rejection', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(writeTextToClipboard).mockRejectedValueOnce(new Error('clipboard unavailable'));
    render(
      <WordCard
        citation={word({ saveStatus: 'failed' })}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onRetrySave={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Copy failed word: 필연적 선택' }));

    expect(screen.getByText('복사 실패')).toBeTruthy();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
