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
    render(<WordCard citation={word()} isSelected={false} onToggleSelect={onToggleSelect} onUpdate={vi.fn()} />);

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
    render(<WordCard citation={word({ saveStatus: 'saving' })} isSelected={false} onToggleSelect={onToggleSelect} onUpdate={vi.fn()} />);

    const checkbox = screen.getByRole('checkbox', { name: '단어 선택: 필연적 선택' });
    expect((checkbox as HTMLInputElement).disabled).toBe(false);
    expect(screen.queryByText('저장 중')).toBeNull();
    expect(screen.getByRole('listitem').firstElementChild?.hasAttribute('aria-busy')).toBe(false);

    await user.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalledWith('word-1', true);
  });

  it('marks a failed word without adding per-card recovery controls', () => {
    render(<WordCard citation={word({ saveStatus: 'failed' })} isSelected={false} onToggleSelect={vi.fn()} onUpdate={vi.fn()} />);

    expect(screen.getByLabelText('저장 실패')).toBeTruthy();
    expect(screen.getByRole('button', { name: /단어 편집/ })).not.toBeNull();
  });

  it('uses a flat sentence-like row and edits text on double click', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(true);
    render(<WordCard citation={word()} isSelected={false} onToggleSelect={vi.fn()} onUpdate={onUpdate} />);

    expect(screen.getByRole('listitem').className).toContain('border-b');
    expect(screen.getByRole('listitem').className).not.toContain('shadow');
    await user.dblClick(screen.getByText('필연적 선택'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '수정된 단어');
    await user.keyboard('{Enter}');
    expect(onUpdate).toHaveBeenCalledWith('word-1', { text: '수정된 단어' });
  });

  it('keeps edited word text when persistence fails', async () => {
    const user = userEvent.setup();
    render(<WordCard citation={word()} isSelected={false} onToggleSelect={vi.fn()} onUpdate={vi.fn().mockResolvedValue(false)} />);

    await user.dblClick(screen.getByText('필연적 선택'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '보존할 단어');
    await user.keyboard('{Enter}');
    expect((input as HTMLInputElement).value).toBe('보존할 단어');
  });
});
