import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStatus } from './useAuthStatus';

const mockUpdateProfile = vi.fn();
const mockUploadProfileAvatar = vi.fn();
const mockGetProfileAvatarPublicUrl = vi.fn();
const mockResolveStoredProfileAvatarPath = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignOut = vi.fn();
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
      signOut: mockSignOut,
    },
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  }),
}));

describe('useAuthStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const localStorageState = new Map<string, string>();
    const sessionStorageState = new Map<string, string>();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        clear: () => localStorageState.clear(),
        getItem: (key: string) => localStorageState.get(key) ?? null,
        key: (index: number) => Array.from(localStorageState.keys())[index] ?? null,
        removeItem: (key: string) => {
          localStorageState.delete(key);
        },
        setItem: (key: string, value: string) => {
          localStorageState.set(key, String(value));
        },
        get length() {
          return localStorageState.size;
        },
      },
    });

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: {
        clear: () => sessionStorageState.clear(),
        getItem: (key: string) => sessionStorageState.get(key) ?? null,
        key: (index: number) => Array.from(sessionStorageState.keys())[index] ?? null,
        removeItem: (key: string) => {
          sessionStorageState.delete(key);
        },
        setItem: (key: string, value: string) => {
          sessionStorageState.set(key, String(value));
        },
        get length() {
          return sessionStorageState.size;
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

    mockSignOut.mockResolvedValue({ error: null });
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

  it('clears cached profile state and auth policy storage on sign out', async () => {
    window.localStorage.setItem('autoLoginEnabled', 'true');

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

    expect(window.localStorage.getItem('profileDisplayName:user-1')).toBe('Yoo Hankyul');

    await act(async () => {
      await result.current.handleSignOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(window.localStorage.getItem('autoLoginEnabled')).toBeNull();
    expect(window.localStorage.getItem('profileDisplayName:user-1')).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.username).toBe('Researcher');
    expect(result.current.avatarUrl).toBeNull();
  });
});
