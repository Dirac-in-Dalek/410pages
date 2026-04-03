import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FontSelectionList } from './settings/TextSettingsSection';
import { FONT_OPTIONS } from '../lib/fontRegistry';

describe('FontSelectionList', () => {
  it('renders every configured font option from the registry, including Nanum variants', () => {
    render(
      <FontSelectionList
        selectedFontFamily="pretendard"
        onFontFamilyChange={vi.fn()}
      />
    );

    const options = screen.getAllByRole('option');

    expect(options).toHaveLength(FONT_OPTIONS.length);

    for (const option of FONT_OPTIONS) {
      expect(screen.getByRole('option', { name: option.label })).toBeTruthy();
    }

    expect(screen.getByRole('option', { name: '나눔고딕' })).toBeTruthy();
    expect(screen.getByRole('option', { name: '나눔명조' })).toBeTruthy();
    expect(screen.getByRole('option', { name: '나눔고딕코딩' })).toBeTruthy();
    expect(screen.getByRole('option', { name: '나눔손글씨 붓' })).toBeTruthy();
    expect(screen.getByRole('option', { name: '나눔손글씨 펜' })).toBeTruthy();
  });

  it('exposes the selected option via selection state and notifies with the clicked id', async () => {
    const user = userEvent.setup();
    const onFontFamilyChange = vi.fn();

    render(
      <FontSelectionList
        selectedFontFamily="nanum-myeongjo"
        onFontFamilyChange={onFontFamilyChange}
      />
    );

    expect(screen.getByRole('option', { name: '나눔명조' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('option', { name: '프리텐다드' }).getAttribute('aria-selected')).toBe('false');

    await user.click(screen.getByRole('option', { name: '나눔고딕코딩' }));

    expect(onFontFamilyChange).toHaveBeenCalledWith('nanum-gothic-coding');
  });
});
