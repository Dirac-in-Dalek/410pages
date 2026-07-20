import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth, getAuthErrorMessage } from './Auth';

const signInWithPassword = vi.fn();
const signUp = vi.fn();
const resetPasswordForEmail = vi.fn();
const updateUser = vi.fn();
const rpc = vi.fn();

vi.mock('./lib/authStorage', () => ({
  clearRememberedEmail: vi.fn(),
  readAutoLoginEnabled: vi.fn(() => false),
  readRememberedEmail: vi.fn(() => ''),
  setAutoLoginEnabled: vi.fn(),
  setRememberedEmail: vi.fn(),
}));

vi.mock('./lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: { signInWithPassword, signUp, resetPasswordForEmail, updateUser },
    rpc,
  })),
}));

describe('Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithPassword.mockResolvedValue({ error: null });
    resetPasswordForEmail.mockResolvedValue({ error: null });
    updateUser.mockResolvedValue({ error: null });
  });

  it('renders Korean account controls inside the static font-size scope', () => {
    const { container } = render(<Auth />);

    expect(screen.getByRole('heading', { name: 'La Biblioteca de Babel' })).toBeTruthy();
    expect(screen.getByText('이런 방식으로 당신은 스물세 글자의 변형체들을 볼 수 있을 것이다.')).toBeTruthy();
    expect(screen.getByLabelText('아이디 기억')).toBeTruthy();
    expect(screen.getByLabelText('자동 로그인')).toBeTruthy();
    expect(container.firstElementChild?.className).toContain('font-size-static');
  });

  it('groups login preferences and places password recovery after the login action', () => {
    render(<Auth />);

    const rememberEmail = screen.getByLabelText('아이디 기억');
    const autoLogin = screen.getByLabelText('자동 로그인');
    const login = screen.getByRole('button', { name: '로그인' });
    const forgotPassword = screen.getByRole('button', { name: '비밀번호 찾기' });
    const signup = screen.getByRole('button', { name: '가입하기' });
    const preferenceGroup = rememberEmail.closest('label')?.parentElement;

    expect(preferenceGroup).toBe(autoLogin.closest('label')?.parentElement);
    expect(preferenceGroup?.className).toContain('justify-center');
    expect(rememberEmail.closest('label')?.className).toContain('min-h-8');
    expect(rememberEmail.closest('label')?.className).toContain('before:-inset-y-1.5');
    expect(login.compareDocumentPosition(forgotPassword) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(forgotPassword.parentElement).toBe(signup.parentElement);
  });

  it('shows and hides the password without changing the value', async () => {
    const user = userEvent.setup();
    render(<Auth />);

    const password = screen.getByLabelText('비밀번호') as HTMLInputElement;
    await user.type(password, 'secret-value');
    await user.click(screen.getByRole('button', { name: '비밀번호 표시' }));

    expect(password.type).toBe('text');
    expect(password.value).toBe('secret-value');
    expect(screen.getByRole('button', { name: '비밀번호 숨기기' })).toBeTruthy();
  });

  it('requests a password reset with the current origin and shows completion guidance', async () => {
    const user = userEvent.setup();
    render(<Auth />);

    await user.click(screen.getByRole('button', { name: '비밀번호 찾기' }));
    await user.type(screen.getByLabelText('이메일'), 'reader@example.com');
    await user.click(screen.getByRole('button', { name: '재설정 메일 보내기' }));

    await waitFor(() => {
      expect(resetPasswordForEmail).toHaveBeenCalledWith('reader@example.com', {
        redirectTo: `${window.location.origin}/`,
      });
    });
    expect(screen.getByRole('heading', { name: '재설정 메일을 보냈습니다' })).toBeTruthy();
  });

  it('maps a network failure to actionable Korean copy', async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValueOnce({ error: new Error('Failed to fetch') });
    render(<Auth />);

    await user.type(screen.getByLabelText('이메일'), 'reader@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    expect((await screen.findByRole('alert')).textContent).toContain('서버에 연결할 수 없습니다');
    expect(getAuthErrorMessage(new Error('Invalid login credentials'))).toBe('이메일 또는 비밀번호가 올바르지 않습니다.');
  });

  it('validates and completes the recovery password flow', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Auth isPasswordRecovery onPasswordRecoveryComplete={onComplete} />);

    await user.type(screen.getByLabelText('새 비밀번호'), 'next-password');
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'next-password');
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: 'next-password' }));
    await user.click(screen.getByRole('button', { name: '410pages로 돌아가기' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
