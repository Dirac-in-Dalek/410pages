import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FontSelectionList } from './settings/TextSettingsSection';
import { FONT_OPTIONS } from '../lib/fontRegistry';

describe('FontSelectionList', () => {
  it('starts collapsed and shows the current font label in the trigger', () => {
    render(
      <FontSelectionList
        selectedFontFamily="nanum-gothic"
        onFontFamilyChange={vi.fn()}
      />
    );

    const trigger = screen.getByRole('button', { name: '현재 서체: 나눔고딕' });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: '나눔명조' })).toBeNull();
  });

  it('expands on click, renders every configured font option, and closes after selection', async () => {
    const user = userEvent.setup();
    const onFontFamilyChange = vi.fn();

    render(
      <FontSelectionList
        selectedFontFamily="nanum-myeongjo"
        onFontFamilyChange={onFontFamilyChange}
      />
    );

    const trigger = screen.getByRole('button', { name: '현재 서체: 나눔명조' });
    await user.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    const options = screen.getAllByRole('button');
    expect(options).toHaveLength(FONT_OPTIONS.length + 1);

    for (const option of FONT_OPTIONS) {
      expect(screen.getByRole('button', { name: option.label })).toBeTruthy();
    }

    expect(screen.getByRole('button', { name: '나눔명조' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '프리텐다드' }).getAttribute('aria-pressed')).toBe('false');

    await user.click(screen.getByRole('button', { name: '나눔고딕코딩' }));

    expect(onFontFamilyChange).toHaveBeenCalledWith('nanum-gothic-coding');
    expect(screen.getByRole('button', { name: '현재 서체: 나눔명조' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: '프리텐다드' })).toBeNull();
  });

  it('supports keyboard activation through button semantics', async () => {
    const user = userEvent.setup();
    const onFontFamilyChange = vi.fn();

    render(
      <FontSelectionList
        selectedFontFamily="pretendard"
        onFontFamilyChange={onFontFamilyChange}
      />
    );

    await user.tab();
    expect(screen.getByRole('button', { name: '현재 서체: 프리텐다드' })).toBe(document.activeElement);

    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: '현재 서체: 프리텐다드' }).getAttribute('aria-expanded')).toBe('true');

    await user.tab();
    expect(screen.getByRole('button', { name: '프리텐다드' })).toBe(document.activeElement);

    await user.tab();
    expect(screen.getByRole('button', { name: '명조' })).toBe(document.activeElement);

    await user.keyboard(' ');
    expect(onFontFamilyChange).toHaveBeenCalledWith('serif');
  });
});
