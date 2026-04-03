import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPanel } from './SettingsPanel';

const baseProps = {
  isOpen: true,
  isMobile: false,
  displayName: '생활습관',
  avatarUrl: null,
  preferences: {
    theme: 'system' as const,
    fontFamily: 'pretendard' as const,
    baseFontPt: 16,
  },
  savedDisplayName: '생활습관',
  onClose: vi.fn(),
  onDisplayNameChange: vi.fn(),
  onDisplayNameCommit: vi.fn(),
  onThemeChange: vi.fn(),
  onFontFamilyChange: vi.fn(),
  onBaseFontPtChange: vi.fn(),
  onAvatarChange: vi.fn(),
  onSignOut: vi.fn(),
  isSavingDisplayName: false,
  displayNameError: undefined,
};

const renderWithDisplayNameState = (
  overrides: Partial<typeof baseProps> = {}
) => {
  const props = { ...baseProps, ...overrides };

  const Harness: React.FC = () => {
    const [displayName, setDisplayName] = useState(props.displayName);

    return (
      <SettingsPanel
        {...props}
        displayName={displayName}
        onDisplayNameChange={setDisplayName}
      />
    );
  };

  render(<Harness />);
  return props;
};

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the expected sections', () => {
    render(<SettingsPanel {...baseProps} />);

    expect(screen.getByText('설정')).toBeTruthy();
    expect(screen.getByText('프로필')).toBeTruthy();
    expect(screen.getByText('텍스트')).toBeTruthy();
    expect(screen.getByText('화면')).toBeTruthy();
  });

  it('closes when the close button is pressed', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);

    await user.click(screen.getByRole('button', { name: '닫기' }));

    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('closes when the backdrop is clicked without using a focusable button backdrop', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);

    const backdrop = screen.getByTestId('settings-backdrop');
    expect(backdrop.tagName).toBe('DIV');

    await user.click(backdrop);

    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('sends live theme changes', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);

    await user.click(screen.getByRole('button', { name: '다크' }));

    expect(baseProps.onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('renders a numeric font-size slider with the current value', () => {
    render(<SettingsPanel {...baseProps} />);

    const slider = screen.getByRole('slider', { name: '글자 크기' }) as HTMLInputElement;
    const fontList = screen.getByRole('listbox', { name: '서체' });

    expect(fontList).toBeTruthy();
    expect(slider).toBeTruthy();
    expect(slider.min).toBe('10');
    expect(slider.max).toBe('40');
    expect(slider.step).toBe('1');
    expect(slider.value).toBe('16');
    expect(screen.getByText('16pt')).toBeTruthy();
  });

  it('applies shared typography token classes to the primary settings copy', () => {
    render(<SettingsPanel {...baseProps} />);

    expect(screen.getByText('설정').className).toContain('type-display');
    expect(screen.getByText('프로필').className).toContain('type-section');
    expect(screen.getByText('텍스트').className).toContain('type-section');
    expect(screen.getByText('화면').className).toContain('type-section');
    expect(screen.getByText('reading environment').className).toContain('type-body-muted');
    expect(screen.getByText('글자 크기').className).toContain('type-label');
  });

  it('uses bounded typography roles for constrained settings chrome', () => {
    render(<SettingsPanel {...baseProps} />);

    expect(screen.getByText('설정').className).toContain('type-display-bounded');
    expect(screen.getByText('생활습관').className).toContain('type-title-bounded');
    expect(screen.getByText('변경').className).toContain('type-label-bounded');
    expect(screen.getByRole('textbox', { name: '이름' }).className).toContain('type-body-bounded');
    expect(screen.getByText('프리텐다드').className).toContain('type-label-bounded');
    expect(screen.getByText('라이트').className).toContain('type-label-bounded');
    expect(screen.getByText('로그아웃').className).toContain('type-label-bounded');
  });

  it('calls onBaseFontPtChange when the font slider changes', () => {
    render(<SettingsPanel {...baseProps} />);

    const slider = screen.getByRole('slider', { name: '글자 크기' });
    fireEvent.change(slider, { target: { value: '22' } });

    expect(baseProps.onBaseFontPtChange).toHaveBeenCalledWith(22);
  });

  it('calls onAvatarChange when the avatar action is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);

    await user.click(screen.getByRole('button', { name: '변경' }));

    expect(baseProps.onAvatarChange).toHaveBeenCalled();
  });

  it('keeps display-name edits local until the field blurs', async () => {
    const user = userEvent.setup();
    const props = renderWithDisplayNameState({
      onDisplayNameCommit: vi.fn().mockResolvedValue(undefined),
    });

    const input = screen.getByRole('textbox', { name: '이름' });
    await user.clear(input);
    await user.type(input, '  새 이름  ');

    expect(props.onDisplayNameCommit).not.toHaveBeenCalled();

    await user.tab();

    expect(props.onDisplayNameCommit).toHaveBeenCalledWith('새 이름');
  });

  it('commits the display name when Enter is pressed', async () => {
    const user = userEvent.setup();
    const props = renderWithDisplayNameState({
      onDisplayNameCommit: vi.fn().mockResolvedValue(undefined),
    });

    const input = screen.getByRole('textbox', { name: '이름' });
    await user.clear(input);
    await user.type(input, '다른 이름');
    await user.keyboard('{Enter}');

    expect(props.onDisplayNameCommit).toHaveBeenCalledWith('다른 이름');
  });

  it('does not commit a dirty display name when the close button dismisses the panel', async () => {
    const user = userEvent.setup();
    const props = renderWithDisplayNameState({
      onDisplayNameCommit: vi.fn().mockResolvedValue(undefined),
    });

    const input = screen.getByRole('textbox', { name: '이름' });
    await user.clear(input);
    await user.type(input, '닫기 전 초안');

    await user.click(screen.getByRole('button', { name: '닫기' }));

    expect(props.onDisplayNameCommit).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalled();
  });

  it('does not commit a dirty display name when the backdrop dismisses the panel', async () => {
    const user = userEvent.setup();
    const props = renderWithDisplayNameState({
      onDisplayNameCommit: vi.fn().mockResolvedValue(undefined),
    });

    const input = screen.getByRole('textbox', { name: '이름' });
    await user.clear(input);
    await user.type(input, '백드롭 전 초안');

    await user.click(screen.getByTestId('settings-backdrop'));

    expect(props.onDisplayNameCommit).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalled();
  });

  it('ignores Enter-driven blur while IME composition is active', async () => {
    const user = userEvent.setup();
    const props = renderWithDisplayNameState({
      onDisplayNameCommit: vi.fn().mockResolvedValue(undefined),
    });

    const input = screen.getByRole('textbox', { name: '이름' });
    await user.clear(input);
    await user.type(input, '한');

    const keyDownEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(keyDownEvent, 'isComposing', {
      configurable: true,
      value: true,
    });

    fireEvent(input, keyDownEvent);

    expect(props.onDisplayNameCommit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
  });

  it('renders a sign-out action inside settings', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);

    await user.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(baseProps.onSignOut).toHaveBeenCalled();
  });

  it('renders a display-name save error when provided', () => {
    render(<SettingsPanel {...baseProps} displayNameError="이름 저장에 실패했습니다." />);

    expect(screen.getByText('이름 저장에 실패했습니다.')).toBeTruthy();
  });
});
