import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Citation } from '../../../types';
import { WordCard } from './WordCard';

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
  it('only toggles selection through its checkbox and wraps long words', async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    render(<WordCard citation={word()} isSelected={false} onToggleSelect={onToggleSelect} />);

    await user.click(screen.getByText('필연적 선택'));
    expect(onToggleSelect).not.toHaveBeenCalled();

    await user.click(screen.getByRole('checkbox', { name: '단어 선택: 필연적 선택' }));
    expect(onToggleSelect).toHaveBeenCalledWith('word-1', true);
    expect(screen.getByText('필연적 선택').className).toContain('break-words');
    expect(screen.getByText('필연적 선택').className).not.toContain('whitespace-nowrap');
  });

  it('renders and behaves like a completed card while saving', async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    render(<WordCard citation={word({ saveStatus: 'saving' })} isSelected={false} onToggleSelect={onToggleSelect} />);

    const checkbox = screen.getByRole('checkbox', { name: '단어 선택: 필연적 선택' });
    expect((checkbox as HTMLInputElement).disabled).toBe(false);
    expect(screen.queryByText('저장 중')).toBeNull();
    expect(screen.getByRole('listitem').firstElementChild?.hasAttribute('aria-busy')).toBe(false);

    await user.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalledWith('word-1', true);
  });

  it('marks a failed word without adding per-card recovery controls', () => {
    render(<WordCard citation={word({ saveStatus: 'failed' })} isSelected={false} onToggleSelect={vi.fn()} />);

    expect(screen.getByLabelText('저장 실패')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
