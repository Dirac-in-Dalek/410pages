import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FONT_OPTIONS } from '../../../lib/fontRegistry';
import { FontSelectionList } from './TextSettingsSection';

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

    expect(screen.getByText('산세리프')).toBeTruthy();
    expect(screen.getByText('세리프')).toBeTruthy();
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

    expect(screen.getByRole('button', { name: '프리텐다드' })).toBe(document.activeElement);

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Noto Sans KR' })).toBe(document.activeElement);
    expect(onFontFamilyChange).not.toHaveBeenCalled();

    await user.keyboard(' ');
    expect(onFontFamilyChange).toHaveBeenCalledWith('noto-sans-kr');
    expect(screen.getByRole('button', { name: '현재 서체: 프리텐다드' })).toBe(document.activeElement);
  });

  it('opens at the saved selection and supports Home, End and wrapping arrow keys without changing the value', async () => {
    const user = userEvent.setup();
    const onFontFamilyChange = vi.fn();
    render(<FontSelectionList selectedFontFamily="nanum-myeongjo" onFontFamilyChange={onFontFamilyChange} />);

    await user.click(screen.getByRole('button', { name: '현재 서체: 나눔명조' }));
    expect(screen.getByRole('button', { name: '나눔명조' })).toBe(document.activeElement);
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: '검은고딕' })).toBe(document.activeElement);
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: '프리텐다드' })).toBe(document.activeElement);
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: '검은고딕' })).toBe(document.activeElement);
    await user.keyboard('{Home}');
    expect(screen.getByRole('button', { name: '프리텐다드' })).toBe(document.activeElement);
    expect(onFontFamilyChange).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: '서체 선택' })).toBeNull();
    expect(screen.getByRole('button', { name: '현재 서체: 나눔명조' })).toBe(document.activeElement);
  });

  it('uses one option tab stop and closes when Tab moves to the next control', async () => {
    const user = userEvent.setup();
    render(<><FontSelectionList selectedFontFamily="nanum-myeongjo" onFontFamilyChange={vi.fn()} /><button type="button">다음 설정</button></>);

    const trigger = screen.getByRole('button', { name: '현재 서체: 나눔명조' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: '나눔명조' })).toBe(document.activeElement);
    await user.tab();
    expect(screen.getByRole('button', { name: '다음 설정' })).toBe(document.activeElement);
    expect(screen.queryByRole('group', { name: '서체 선택' })).toBeNull();
  });

  it('restores trigger focus when a non-focusable area dismisses the list', async () => {
    const user = userEvent.setup();
    const onFontFamilyChange = vi.fn();
    render(<><FontSelectionList selectedFontFamily="pretendard" onFontFamilyChange={onFontFamilyChange} /><p>읽기 안내</p></>);
    const trigger = screen.getByRole('button', { name: '현재 서체: 프리텐다드' });

    await user.click(trigger);
    await user.click(screen.getByText('읽기 안내'));

    expect(screen.queryByRole('group', { name: '서체 선택' })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(onFontFamilyChange).not.toHaveBeenCalled();
  });
});
