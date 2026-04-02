import { render, screen } from '@testing-library/react';
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
    textScale: 'md' as const,
  },
  onClose: vi.fn(),
  onDisplayNameChange: vi.fn(),
  onThemeChange: vi.fn(),
  onFontFamilyChange: vi.fn(),
  onTextScaleChange: vi.fn(),
  onAvatarChange: vi.fn(),
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
});
