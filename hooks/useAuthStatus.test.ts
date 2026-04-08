import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStatus } from './useAuthStatus';

const mockUpdateProfile = vi.fn();
const mockUploadProfileAvatar = vi.fn();
const mockGetProfileAvatarPublicUrl = vi.fn();
const mockResolveStoredProfileAvatarPath = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockUpdateUser = vi.fn();
const mockProfileSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    resolveStoredProfileAvatarPath: (...args: unknown[]) => mockResolveStoredProfileAvatarPath(...args),
    updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
    uploadProfileAvatar: (...args: unknown[]) => mockUploadProfileAvatar(...args),
    getProfileAvatarPublicUrl: (...args: unknown[]) => mockGetProfileAvatarPublicUrl(...args),
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
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        clear: () => storage.clear(),
        getItem: (key: string) => storage.get(key) ?? null,
        key: (index: number) => Array.from(storage.keys())[index] ?? null,
        removeItem: (key: string) => {
          storage.delete(key);
        },
        setItem: (key: string, value: string) => {
          storage.set(key, String(value));
        },
        get length() {
          return storage.size;
        },
      },
    });

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
    mockResolveStoredProfileAvatarPath.mockImplementation((path: string | null) => path);
    mockGetProfileAvatarPublicUrl.mockImplementation((path: string) => `https://cdn.example.com/${path}`);
  });

  it('loads avatar_path with the profile on startup', async () => {
    mockProfileSingle.mockResolvedValue({
      data: {
        username: 'Yoo Hankyul',
        avatar_path: 'user-1/avatar',
      },
      error: null,
    });

    const { result } = renderHook(() => useAuthStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.username).toBe('Yoo Hankyul');
    expect(mockGetProfileAvatarPublicUrl).toHaveBeenCalledWith('user-1/avatar');
    expect(result.current.avatarUrl).toBe('https://cdn.example.com/user-1/avatar');
  });

  it('uploads an avatar and updates local state with the stored path', async () => {
    mockProfileSingle.mockResolvedValue({
      data: {
        username: 'Yoo Hankyul',
        avatar_path: null,
      },
      error: null,
    });
    mockUploadProfileAvatar.mockResolvedValue('user-1/avatar');
    mockUpdateProfile.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuthStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    await act(async () => {
      await result.current.handleUpdateAvatar(file);
    });

    expect(mockUploadProfileAvatar).toHaveBeenCalledWith('user-1', file);
    expect(mockUpdateProfile).toHaveBeenCalledWith('user-1', {
      avatar_path: 'user-1/avatar',
    });
    expect(mockGetProfileAvatarPublicUrl).toHaveBeenLastCalledWith('user-1/avatar', expect.any(Number));
    expect(result.current.avatarUrl).toContain('https://cdn.example.com/user-1/avatar');
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
        avatar_path: null,
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
