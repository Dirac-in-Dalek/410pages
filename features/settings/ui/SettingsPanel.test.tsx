import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ThemePreference } from '../../../lib/themeRegistry';
import { SettingsPanel } from './SettingsPanel';

vi.mock('../../../lib/avatarCrop', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/avatarCrop')>('../../../lib/avatarCrop');

  return {
    ...actual,
    cropAvatarFile: vi.fn(async (_src, file: File) => file),
  };
});

const baseProps = {
  isOpen: true,
  isMobile: false,
  displayName: '생활습관',
  avatarUrl: null,
  preferences: {
    theme: 'auto' as ThemePreference,
    fontFamily: 'pretendard' as const,
    baseFontPt: 13,
    citationWidthRem: 44,
  },
  savedDisplayName: '생활습관',
  onClose: vi.fn(),
  onDisplayNameChange: vi.fn(),
  onDisplayNameCommit: vi.fn(),
  onThemeChange: vi.fn(),
  onFontFamilyChange: vi.fn(),
  onBaseFontPtChange: vi.fn(),
  onCitationWidthRemChange: vi.fn(),
  onAvatarChange: vi.fn().mockResolvedValue(true),
  onSignOut: vi.fn(),
  isSavingDisplayName: false,
  isSavingAvatar: false,
  isDisplayNameSaved: false,
  isAvatarSaved: false,
  avatarError: undefined,
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

const renderWithFontSizeState = (
  overrides: Partial<typeof baseProps> = {}
) => {
  const props = { ...baseProps, ...overrides };

  const Harness: React.FC = () => {
    const [baseFontPt, setBaseFontPt] = useState(props.preferences.baseFontPt);

    return (
      <SettingsPanel
        {...props}
        preferences={{ ...props.preferences, baseFontPt }}
        onBaseFontPtChange={setBaseFontPt}
      />
    );
  };

  render(<Harness />);
  return props;
};

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:avatar-preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('renders the expected sections', () => {
    render(<SettingsPanel {...baseProps} />);

    expect(screen.getByText('설정')).toBeTruthy();
    expect(screen.getByText('프로필')).toBeTruthy();
    expect(screen.getByText('읽기')).toBeTruthy();
    expect(screen.getByText('화면')).toBeTruthy();
    expect(screen.getByText('계정')).toBeTruthy();
  });

  it('closes when the close button is pressed', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);

    await user.click(screen.getByRole('button', { name: '닫기' }));

    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('moves focus into the dialog and restores it after closing', async () => {
    const user = userEvent.setup();

    const Harness: React.FC = () => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>설정 열기</button>
          <SettingsPanel {...baseProps} isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
      );
    };

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: '설정 열기' });
    await user.click(trigger);

    await waitFor(() => expect(screen.getByRole('button', { name: '닫기' })).toBe(document.activeElement));
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: '로그아웃' })).toBe(document.activeElement);
    await user.tab();
    expect(screen.getByRole('button', { name: '닫기' })).toBe(document.activeElement);
    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(trigger).toBe(document.activeElement);
  });

  it('closes when the backdrop is clicked without using a focusable button backdrop', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);

    const backdrop = screen.getByTestId('settings-backdrop');
    expect(backdrop.tagName).toBe('DIV');

    await user.click(backdrop);

    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('returns focus to the current settings opener when responsive layout replaces the original button', async () => {
    const user = userEvent.setup();
    const Harness: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button key={isMobile ? 'mobile' : 'desktop'} id="settings-trigger" type="button" onClick={() => setIsOpen(true)}>
            {isMobile ? '모바일 설정' : '데스크톱 설정'}
          </button>
          <SettingsPanel {...baseProps} isMobile={isMobile} isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
      );
    };
    const { rerender } = render(<Harness isMobile={false} />);
    await user.click(screen.getByRole('button', { name: '데스크톱 설정' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '닫기' })).toBe(document.activeElement));

    rerender(<Harness isMobile />);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: '설정' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '모바일 설정' }));
  });

  it('keeps the theme selector collapsed until opened and sends live theme changes', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);

    const themeLabel = screen.getByText('테마');
    const trigger = screen.getByRole('button', { name: '현재 테마: Auto' });

    expect(themeLabel.parentElement?.contains(trigger)).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('group', { name: '테마 선택' })).toBeNull();

    await user.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('라이트')).toBeTruthy();
    expect(screen.getByText('다크')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Day' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Night' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Warm Paper' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Soft Slate' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Terminal Green' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Airbnb Light' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Airbnb Dark' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bach Light' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bach Dark' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mahler Light' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mahler Dark' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Shostakovich Light' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Shostakovich Dark' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Night' }));

    expect(baseProps.onThemeChange).toHaveBeenCalledWith('night');
    expect(screen.queryByRole('group', { name: '테마 선택' })).toBeNull();
  });

  it('closes an open theme picker before closing the settings dialog', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);
    const trigger = screen.getByRole('button', { name: '현재 테마: Auto' });

    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('group', { name: '테마 선택' })).toBeNull();
    await waitFor(() => expect(trigger).toBe(document.activeElement));
    expect(baseProps.onClose).not.toHaveBeenCalled();
  });

  it('closes only the font list on Escape and closes the settings dialog on the next Escape', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);
    await waitFor(() => expect(screen.getByRole('button', { name: '닫기' })).toBe(document.activeElement));
    const trigger = screen.getByRole('button', { name: '현재 서체: 프리텐다드' });

    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('group', { name: '서체 선택' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(baseProps.onClose).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('reaches the last theme with the keyboard and restores focus after applying it', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);
    await waitFor(() => expect(screen.getByRole('button', { name: '닫기' })).toBe(document.activeElement));
    const trigger = screen.getByRole('button', { name: '현재 테마: Auto' });

    trigger.focus();
    await user.keyboard('{ArrowDown}{End}');
    expect(screen.getByRole('button', { name: 'Shostakovich Dark' })).toBe(document.activeElement);
    expect(baseProps.onThemeChange).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');

    expect(baseProps.onThemeChange).toHaveBeenCalledWith('shostakovich-dark');
    expect(screen.queryByRole('group', { name: '테마 선택' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('shows the existing numeric font size without preset controls', () => {
    render(<SettingsPanel {...baseProps} />);

    const slider = screen.getByRole('slider', { name: '글자 크기' }) as HTMLInputElement;
    expect(slider.value).toBe('13');
    expect(screen.getByText('13pt')).toBeTruthy();
    expect(screen.queryByRole('group', { name: '글자 크기 기준' })).toBeNull();
    expect(screen.queryByRole('button', { name: /작게|보통|크게/ })).toBeNull();
  });

  it('removes the manual citation width control', () => {
    render(<SettingsPanel {...baseProps} />);

    expect(screen.queryByText('인용구 너비')).toBeNull();
  });

  it('shows the selected font as a collapsed trigger until the font picker is opened', async () => {
    const user = userEvent.setup();
    render(
      <SettingsPanel
        {...baseProps}
        preferences={{ ...baseProps.preferences, fontFamily: 'nanum-gothic' }}
      />
    );

    const fontLabel = screen.getByText('서체');
    const trigger = screen.getByRole('button', { name: '현재 서체: 나눔고딕' });

    expect(fontLabel.parentElement?.parentElement?.contains(trigger)).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: '나눔명조' })).toBeNull();

    await user.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: '나눔명조' })).toBeTruthy();
  });

  it('applies shared ui typography primitives to the primary settings copy', () => {
    render(<SettingsPanel {...baseProps} />);

    expect(screen.getByText('설정').className).toContain('ui-title');
    expect(screen.getByText('읽기').className).toContain('ui-label');
    expect(screen.getByText('화면').className).toContain('ui-label');
    expect(screen.getByText('글자 크기').className).toContain('ui-label');
  });

  it('uses shared ui button and body primitives for constrained settings chrome', () => {
    render(<SettingsPanel {...baseProps} />);

    expect(screen.getByRole('button', { name: '사진 변경' }).className).toContain('ui-btn');
    expect(screen.getByRole('button', { name: '사진 변경' }).className).toContain('ui-btn--ghost');
    expect(screen.getByRole('button', { name: '현재 서체: 프리텐다드' }).className).toContain('ui-btn');
    expect(screen.getByRole('button', { name: '현재 테마: Auto' }).className).toContain('ui-btn');
    expect(screen.getByText('로그아웃').className).toContain('ui-btn');
  });

  it('updates the numeric font size with the native range', () => {
    renderWithFontSizeState();

    fireEvent.change(screen.getByRole('slider', { name: '글자 크기' }), { target: { value: '17' } });
    const slider = screen.getByRole('slider', { name: '글자 크기' }) as HTMLInputElement;
    expect(slider.value).toBe('17');
    expect(screen.getByText('17pt')).toBeTruthy();
    expect(slider.getAttribute('aria-valuetext')).toBe('17포인트');

    slider.focus();
    expect(document.activeElement).toBe(slider);
    expect(slider.type).toBe('range');
  });

  it('renders a keyboard-focusable avatar change button wired to the file input', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);

    const trigger = screen.getByRole('button', { name: '사진 변경' });
    const input = screen.getByLabelText('프로필 사진 업로드');

    const inputClick = vi.spyOn(input, 'click');
    await waitFor(() => expect(screen.getByRole('button', { name: '닫기' })).toBe(document.activeElement));
    trigger.focus();
    await user.keyboard('{Enter}');

    expect(trigger).toBe(document.activeElement);
    expect(inputClick).toHaveBeenCalled();
  });

  it('calls onAvatarChange when the avatar action is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const input = screen.getByLabelText('프로필 사진 업로드') as HTMLInputElement;

    await user.upload(input, file);

    expect(baseProps.onAvatarChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '프로필 사진 편집' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '저장' })).toBeTruthy();
    const settingsDialog = document.querySelector('aside[role="dialog"]') as HTMLElement;
    expect(settingsDialog.inert).toBe(true);
    expect(settingsDialog.getAttribute('aria-hidden')).toBe('true');

    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(settingsDialog.inert).toBe(false);
    expect(settingsDialog.hasAttribute('aria-hidden')).toBe(false);
  });

  it('rejects a non-image file before opening the crop editor', () => {
    render(<SettingsPanel {...baseProps} isAvatarSaved />);
    const input = screen.getByLabelText('프로필 사진 업로드') as HTMLInputElement;
    const file = new File(['not-image'], 'avatar.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('이미지 파일만 업로드할 수 있습니다.')).toBeTruthy();
    expect(screen.queryByText('사진 저장됨')).toBeNull();
    expect(screen.queryByRole('dialog', { name: '프로필 사진 편집' })).toBeNull();
  });

  it('rejects an image larger than 5MB before decoding it', () => {
    render(<SettingsPanel {...baseProps} />);
    const input = screen.getByLabelText('프로필 사진 업로드') as HTMLInputElement;
    const file = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      'large-avatar.png',
      { type: 'image/png' }
    );

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('프로필 사진은 5MB 이하만 업로드할 수 있습니다.')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: '프로필 사진 편집' })).toBeNull();
  });

  it('only calls onAvatarChange after the crop save action is pressed', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const input = screen.getByLabelText('프로필 사진 업로드') as HTMLInputElement;

    await user.upload(input, file);
    const previewImage = screen.getByAltText('편집 중인 프로필 사진');
    Object.defineProperty(previewImage, 'naturalWidth', { configurable: true, value: 1200 });
    Object.defineProperty(previewImage, 'naturalHeight', { configurable: true, value: 900 });
    fireEvent.load(previewImage);
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(baseProps.onAvatarChange).toHaveBeenCalledTimes(1);
    expect(baseProps.onAvatarChange).toHaveBeenCalledWith(expect.any(File));
  });

  it('renders the avatar change action in the profile header', () => {
    render(<SettingsPanel {...baseProps} />);

    expect(screen.getByText('사진 변경')).toBeTruthy();
    expect(screen.getByLabelText('프로필 사진 업로드')).toBeTruthy();
  });

  it('shows the display-name input only while editing and saves explicitly', async () => {
    const user = userEvent.setup();
    const props = renderWithDisplayNameState({
      onDisplayNameCommit: vi.fn().mockResolvedValue(undefined),
    });

    expect(screen.queryByRole('textbox', { name: '이름' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '수정' }));

    const input = screen.getByRole('textbox', { name: '이름' });
    await user.clear(input);
    await user.type(input, '  새 이름  ');

    expect(props.onDisplayNameCommit).not.toHaveBeenCalled();

    await user.tab();
    expect(props.onDisplayNameCommit).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(props.onDisplayNameCommit).toHaveBeenCalledWith('새 이름');
  });

  it('does not render the old profile name card or helper copy', () => {
    render(<SettingsPanel {...baseProps} />);

    expect(screen.queryByText('변경 내용을 적용하려면 Enter를 누르거나 입력란을 벗어나세요.')).toBeNull();
    expect(screen.queryByText('reading environment')).toBeNull();
  });

  it('commits the display name when Enter is pressed', async () => {
    const user = userEvent.setup();
    const props = renderWithDisplayNameState({
      onDisplayNameCommit: vi.fn().mockResolvedValue(undefined),
    });

    await user.click(screen.getByRole('button', { name: '수정' }));
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

    await user.click(screen.getByRole('button', { name: '수정' }));
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

    await user.click(screen.getByRole('button', { name: '수정' }));
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

    await user.click(screen.getByRole('button', { name: '수정' }));
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

  it('cancels a display-name edit without saving the draft', async () => {
    const user = userEvent.setup();
    const props = renderWithDisplayNameState({
      onDisplayNameCommit: vi.fn().mockResolvedValue(undefined),
    });

    await user.click(screen.getByRole('button', { name: '수정' }));
    const input = screen.getByRole('textbox', { name: '이름' });
    await user.clear(input);
    await user.type(input, '취소할 이름');
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(props.onDisplayNameCommit).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: '이름' })).toBeNull();
    expect(screen.getByText('생활습관')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: '수정' })).toBe(document.activeElement));
  });

  it('uses Escape to cancel name editing without closing settings', async () => {
    const user = userEvent.setup();
    const props = renderWithDisplayNameState({ onDisplayNameCommit: vi.fn() });

    await user.click(screen.getByRole('button', { name: '수정' }));
    await user.type(screen.getByRole('textbox', { name: '이름' }), ' 초안');
    await user.keyboard('{Escape}');

    expect(props.onDisplayNameCommit).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: '이름' })).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: '수정' })).toBe(document.activeElement));
  });

  it('shows display-name and avatar save states near the profile controls', () => {
    const { rerender } = render(<SettingsPanel {...baseProps} isSavingDisplayName />);

    expect(screen.getByText('이름 저장 중…')).toBeTruthy();

    rerender(<SettingsPanel {...baseProps} isDisplayNameSaved isAvatarSaved />);
    expect(screen.getByText('이름 저장됨')).toBeTruthy();
    expect(screen.getByText('사진 저장됨')).toBeTruthy();
  });

  it('keeps the mobile sheet and 44px touch targets with safe-area padding', () => {
    render(<SettingsPanel {...baseProps} isMobile />);

    const dialog = screen.getByRole('dialog', { name: '설정' });
    expect(dialog.className).toContain('top-16');
    expect(screen.getByRole('slider', { name: '글자 크기' }).className).toContain('h-11');
    expect(screen.getByText('13pt')).toBeTruthy();
    expect(dialog.querySelector('.overscroll-contain')?.className).toContain('safe-area-inset-bottom');
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

  it('uses the shared panel surface for the settings header instead of a light-only gradient', () => {
    render(<SettingsPanel {...baseProps} />);

    const header = screen.getByText('설정').closest('header');

    expect(header).toBeTruthy();
    expect(header?.className).toContain('bg-[var(--bg-card)]');
    expect(header?.className).not.toContain('bg-[linear-gradient');
    expect(header?.className).not.toContain('dark:bg-none');
  });

  it('preserves the native range bounds at the minimum font size', () => {
    renderWithFontSizeState({
      preferences: { ...baseProps.preferences, baseFontPt: 7 },
    });

    const slider = screen.getByRole('slider', { name: '글자 크기' }) as HTMLInputElement;
    expect(slider.min).toBe('7');
    expect(slider.max).toBe('20');
    expect(slider.step).toBe('1');
    expect(slider.value).toBe('7');
  });

  it('shows the maximum font size without changing the range contract', () => {
    renderWithFontSizeState({
      preferences: { ...baseProps.preferences, baseFontPt: 20 },
    });

    expect((screen.getByRole('slider', { name: '글자 크기' }) as HTMLInputElement).value).toBe('20');
  });
});
