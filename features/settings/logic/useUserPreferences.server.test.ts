import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PREFERENCES_STORAGE_KEY } from '../policy/userPreferences';

const mockReadServerPreferences = vi.fn();
const mockPersistServerPreferences = vi.fn();

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

vi.mock('./preferencesServer', () => ({
  readServerPreferences: (...args: unknown[]) => mockReadServerPreferences(...args),
  persistServerPreferences: (...args: unknown[]) => mockPersistServerPreferences(...args),
}));

import { useUserPreferences } from './useUserPreferences';

const installStorageStub = () => {
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
};

const resetDom = () => {
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-font');
  document.documentElement.style.removeProperty('--font-base-pt');
  document.documentElement.style.removeProperty('--citation-column-width');
  installStorageStub();
  window.localStorage.clear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('useUserPreferences server sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDom();
    mockPersistServerPreferences.mockResolvedValue(undefined);
  });

  it('loads server preferences for a signed-in user and mirrors them locally', async () => {
    mockReadServerPreferences.mockResolvedValue({
      theme: 'night',
      fontFamily: 'serif',
      baseFontPt: 18,
      citationWidthRem: 47,
    });

    const { result } = renderHook(() => useUserPreferences('user-1'));

    await waitFor(() => {
      expect(result.current.preferences.theme).toBe('night');
    });

    expect(mockReadServerPreferences).toHaveBeenCalledWith('user-1');
    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}')).toMatchObject({
      theme: 'night',
      fontFamily: 'serif',
      baseFontPt: 18,
      citationWidthRem: 47,
    });
    expect(document.documentElement.style.getPropertyValue('--citation-column-width')).toBe('47rem');
  });

  it('saves the local fallback preferences when no server row exists yet', async () => {
    mockReadServerPreferences.mockResolvedValue(null);

    renderHook(() => useUserPreferences('user-1'));

    await waitFor(() => {
      expect(mockPersistServerPreferences).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          theme: 'auto',
          fontFamily: 'nanum-myeongjo',
          baseFontPt: 13,
          citationWidthRem: 44,
        })
      );
    });
  });

  it('keeps local preference edits made before the server load resolves', async () => {
    const serverPreferences = createDeferred<Awaited<ReturnType<typeof mockReadServerPreferences>>>();
    mockReadServerPreferences.mockReturnValue(serverPreferences.promise);

    const { result } = renderHook(() => useUserPreferences('user-1'));

    act(() => {
      result.current.setFontFamily('jetbrains-mono');
    });

    act(() => {
      serverPreferences.resolve({
        theme: 'night',
        fontFamily: 'serif',
        baseFontPt: 18,
        citationWidthRem: 47,
      });
    });

    await waitFor(() => {
      expect(mockPersistServerPreferences).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          fontFamily: 'jetbrains-mono',
        })
      );
    });

    expect(result.current.preferences.fontFamily).toBe('jetbrains-mono');
  });
});
