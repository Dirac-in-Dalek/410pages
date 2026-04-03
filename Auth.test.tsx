import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from './Auth';

vi.mock('./lib/authStorage', () => ({
  clearRememberedEmail: vi.fn(),
  readAutoLoginEnabled: vi.fn(() => false),
  readRememberedEmail: vi.fn(() => ''),
  setAutoLoginEnabled: vi.fn(),
  setRememberedEmail: vi.fn(),
}));

vi.mock('./lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
    rpc: vi.fn(),
  })),
}));

describe('Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders remember-email and auto-login controls', () => {
    render(<Auth />);

    expect(screen.getByLabelText('아이디 기억')).toBeTruthy();
    expect(screen.getByLabelText('자동로그인')).toBeTruthy();
  });

  it('keeps login typography under the static font-size scope', () => {
    const { container } = render(<Auth />);

    expect(container.firstElementChild?.className).toContain('font-size-static');
  });
});
