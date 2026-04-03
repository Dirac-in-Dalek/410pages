import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStatus } from './useAuthStatus';

const mockUpdateProfile = vi.fn();
const mockUploadProfileAvatar = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockUpdateUser = vi.fn();
const mockProfileSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
    uploadProfileAvatar: (...args: unknown[]) => mockUploadProfileAvatar(...args),
  },
}));

vi.mock('../lib/supabase', () => ({
  SUPABASE_AUTH_STORAGE_KEY: 'sb-test-auth-token',
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      updateUser: mockUpdateUser,
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  }),
}));

vi.mock('../lib/authStorage', () => ({
  clearAutoLoginEnabled: vi.fn(),
  clearSupabaseSessionArtifacts: vi.fn(),
  reconcileSupabaseSessionArtifacts: vi.fn(),
}));

describe('useAuthStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    mockEq.mockReturnValue({
      single: mockProfileSingle,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
    });

    mockGetSession.mockResolvedValue({
      data: {
        session: { user: { id: 'user-1' } },
      },
    });

    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });

    mockUpdateUser.mockResolvedValue({ error: null });
  });

  it('loads avatar_url with the profile on startup', async () => {
    mockProfileSingle.mockResolvedValue({
      data: {
        username: 'Yoo Hankyul',
        avatar_url: 'https://cdn.example.com/avatar.png',
      },
      error: null,
    });

    const { result } = renderHook(() => useAuthStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.username).toBe('Yoo Hankyul');
    expect(result.current.avatarUrl).toBe('https://cdn.example.com/avatar.png');
  });

  it('uploads an avatar and updates local state with the stored url', async () => {
    mockProfileSingle.mockResolvedValue({
      data: {
        username: 'Yoo Hankyul',
        avatar_url: null,
      },
      error: null,
    });
    mockUploadProfileAvatar.mockResolvedValue('https://cdn.example.com/avatar-next.png');
    mockUpdateProfile.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuthStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    await act(async () => {
      await result.current.handleUpdateAvatar(file);
    });

    expect(mockUploadProfileAvatar).toHaveBeenCalledWith('user-1', file, null);
    expect(mockUpdateProfile).toHaveBeenCalledWith('user-1', {
      avatar_url: 'https://cdn.example.com/avatar-next.png',
    });
    expect(result.current.avatarUrl).toBe('https://cdn.example.com/avatar-next.png');
  });

  it('falls back to the cached display name when profile fetch fails on startup', async () => {
    window.localStorage.setItem('profileDisplayName:user-1', 'Saved Name');

    mockProfileSingle.mockResolvedValue({
      data: null,
      error: new Error('profile fetch failed'),
    });

    const { result } = renderHook(() => useAuthStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.username).toBe('Saved Name');
  });

  it('caches the updated display name after a successful save', async () => {
    mockProfileSingle.mockResolvedValue({
      data: {
        username: 'Yoo Hankyul',
        avatar_url: null,
      },
      error: null,
    });
    mockUpdateProfile.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuthStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleUpdateUsername('Updated Name');
    });

    expect(window.localStorage.getItem('profileDisplayName:user-1')).toBe('Updated Name');
  });
});
