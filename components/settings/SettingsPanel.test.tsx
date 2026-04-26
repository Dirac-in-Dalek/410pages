import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ThemePreference } from '../../lib/themeRegistry';
import { SettingsPanel } from '../../features/settings/ui/SettingsPanel';

vi.mock('../../lib/avatarCrop', async () => {
  const actual = await vi.importActual<typeof import('../../lib/avatarCrop')>('../../lib/avatarCrop');

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
  onAvatarChange: vi.fn().mockResolvedValue(undefined),
  onSignOut: vi.fn(),
  isSavingDisplayName: false,
  isSavingAvatar: false,
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

const renderWithCitationWidthState = (
  overrides: Partial<typeof baseProps> = {}
) => {
  const props = { ...baseProps, ...overrides };

  const Harness: React.FC = () => {
    const [citationWidthRem, setCitationWidthRem] = useState(props.preferences.citationWidthRem);

    return (
      <SettingsPanel
        {...props}
        preferences={{ ...props.preferences, citationWidthRem }}
        onCitationWidthRemChange={setCitationWidthRem}
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
    expect(screen.getByText('텍스트')).toBeTruthy();
    expect(screen.getByText('화면')).toBeTruthy();
    expect(screen.queryByText('프로필')).toBeNull();
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

  it('keeps the theme selector collapsed until opened and sends live theme changes', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);

    const themeLabel = screen.getByText('테마');
    const trigger = screen.getByRole('button', { name: '현재 테마: Auto' });

    expect(themeLabel.parentElement?.contains(trigger)).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('listbox', { name: '테마 선택' })).toBeNull();

    await user.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('라이트')).toBeTruthy();
    expect(screen.getByText('다크')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Day' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Night' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Warm Paper' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Soft Slate' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Terminal Green' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Airbnb Light' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Airbnb Dark' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Bach Light' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Bach Dark' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Mahler Light' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Mahler Dark' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Shostakovich Light' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Shostakovich Dark' })).toBeTruthy();

    await user.click(screen.getByRole('option', { name: 'Night' }));

    expect(baseProps.onThemeChange).toHaveBeenCalledWith('night');
    expect(screen.queryByRole('listbox', { name: '테마 선택' })).toBeNull();
  });

  it('shows the current font size as a status badge beside +/- controls', () => {
    render(<SettingsPanel {...baseProps} />);

    expect(screen.getByRole('status', { name: '현재 글자 크기' }).textContent).toBe('13pt');
    expect(screen.getByRole('button', { name: '글자 크기 줄이기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '글자 크기 늘리기' })).toBeTruthy();
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
    expect(screen.getByText('텍스트').className).toContain('ui-label');
    expect(screen.getByText('화면').className).toContain('ui-label');
    expect(screen.getByText('글자 크기').className).toContain('ui-label');
  });

  it('uses shared ui button and body primitives for constrained settings chrome', () => {
    render(<SettingsPanel {...baseProps} />);

    expect(screen.getByText('사진 변경').closest('label')?.className).toContain('ui-btn');
    expect(screen.getByText('사진 변경').closest('label')?.className).toContain('ui-btn--ghost');
    expect(screen.getByText('사진 변경').closest('label')?.className).toContain('cursor-pointer');
    expect(screen.getByRole('textbox', { name: '이름' }).className).toContain('ui-body');
    expect(screen.getByRole('button', { name: '현재 서체: 프리텐다드' }).className).toContain('ui-btn');
    expect(screen.getByRole('button', { name: '현재 테마: Auto' }).className).toContain('ui-btn');
    expect(screen.getByText('로그아웃').className).toContain('ui-btn');
  });

  it('changes font size with the shared +/- controls', async () => {
    const user = userEvent.setup();
    renderWithFontSizeState();

    expect(screen.getByRole('status', { name: '현재 글자 크기' }).textContent).toBe('13pt');

    await user.click(screen.getByRole('button', { name: '글자 크기 늘리기' }));
    expect(screen.getByRole('status', { name: '현재 글자 크기' }).textContent).toBe('14pt');

    await user.click(screen.getByRole('button', { name: '글자 크기 줄이기' }));
    expect(screen.getByRole('status', { name: '현재 글자 크기' }).textContent).toBe('13pt');
  });

  it('renders the avatar change trigger as a native file-input label', () => {
    render(<SettingsPanel {...baseProps} />);

    const trigger = screen.getByText('사진 변경').closest('label');
    const input = screen.getByLabelText('프로필 사진 업로드');

    expect(trigger).toBeTruthy();
    expect(trigger?.contains(input)).toBe(true);
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

  it('uses the shared panel surface for the settings header instead of a light-only gradient', () => {
    render(<SettingsPanel {...baseProps} />);

    const header = screen.getByText('설정').closest('header');

    expect(header).toBeTruthy();
    expect(header?.className).toContain('bg-[var(--bg-card)]');
    expect(header?.className).not.toContain('bg-[linear-gradient');
    expect(header?.className).not.toContain('dark:bg-none');
  });

  it('disables the decrease control at the minimum font size', async () => {
    renderWithFontSizeState({
      preferences: { ...baseProps.preferences, baseFontPt: 10 },
    });

    expect((screen.getByRole('button', { name: '글자 크기 줄이기' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status', { name: '현재 글자 크기' }).textContent).toBe('10pt');
  });

  it('disables the increase control at the maximum font size', async () => {
    renderWithFontSizeState({
      preferences: { ...baseProps.preferences, baseFontPt: 40 },
    });

    expect((screen.getByRole('button', { name: '글자 크기 늘리기' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status', { name: '현재 글자 크기' }).textContent).toBe('40pt');
  });

  it('adjusts citation width from the text settings section', async () => {
    const user = userEvent.setup();
    renderWithCitationWidthState();

    await user.click(screen.getByRole('button', { name: '인용구 너비 늘리기' }));

    expect(screen.getByRole('status', { name: '현재 인용구 너비' }).textContent).toBe('45rem');
  });

  it('disables citation width controls at the configured bounds', () => {
    const { rerender } = render(
      <SettingsPanel
        {...baseProps}
        preferences={{ ...baseProps.preferences, citationWidthRem: 35 }}
      />
    );

    expect((screen.getByRole('button', { name: '인용구 너비 줄이기' }) as HTMLButtonElement).disabled).toBe(true);

    rerender(
      <SettingsPanel
        {...baseProps}
        preferences={{ ...baseProps.preferences, citationWidthRem: 50 }}
      />
    );

    expect((screen.getByRole('button', { name: '인용구 너비 늘리기' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
