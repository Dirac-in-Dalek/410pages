import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  applyPreferencesToDocument,
  readStoredPreferences,
  useUserPreferences,
} from './useUserPreferences';

const createMatchMediaStub = (matches = false) =>
  vi.fn().mockImplementation(() => ({
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

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

const installThrowingStorageStub = () => {
  const error = new Error('Access denied');
  error.name = 'SecurityError';

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      clear: () => {
        throw error;
      },
      getItem: () => {
        throw error;
      },
      key: () => {
        throw error;
      },
      removeItem: () => {
        throw error;
      },
      setItem: () => {
        throw error;
      },
      get length() {
        throw error;
      },
    },
  });
};

const resetDom = () => {
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-font');
  document.documentElement.style.removeProperty('--text-scale');
  document.documentElement.style.removeProperty('--font-base-pt');
  installStorageStub();
  window.localStorage.clear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: createMatchMediaStub(),
  });
};

describe('useUserPreferences', () => {
  beforeEach(() => {
    resetDom();
  });

  it('returns defaults when storage is empty', () => {
    expect(readStoredPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('falls back to defaults when storage access throws', () => {
    installThrowingStorageStub();

    expect(readStoredPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('applies dark theme, font, and base font size to the root document', () => {
    applyPreferencesToDocument({
      ...DEFAULT_PREFERENCES,
      theme: 'dark',
      fontFamily: 'serif',
      baseFontPt: 22,
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.font).toBe('serif');
    expect(document.documentElement.style.getPropertyValue('--font-base-pt')).toBe('22pt');
  });

  it('migrates legacy text scale preferences to numeric base font sizes', () => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ theme: 'light', fontFamily: 'serif', textScale: 'lg' })
    );

    expect(readStoredPreferences()).toEqual({
      theme: 'light',
      fontFamily: 'serif',
      baseFontPt: 18,
    });
  });

  it('persists updates from the hook', () => {
    const { result } = renderHook(() => useUserPreferences());

    act(() => {
      result.current.setTheme('light');
      result.current.setFontFamily('serif');
      result.current.setBaseFontPt(23.7);
    });

    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}')).toMatchObject({
      theme: 'light',
      fontFamily: 'serif',
      baseFontPt: 24,
    });
  });

  it('clamps base font size to the minimum bound', () => {
    const { result } = renderHook(() => useUserPreferences());

    act(() => {
      result.current.setBaseFontPt(3.2);
    });

    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}')).toMatchObject({
      baseFontPt: 10,
    });
  });

  it('applies preference updates even when storage writes throw', () => {
    installThrowingStorageStub();

    const { result } = renderHook(() => useUserPreferences());

    act(() => {
      result.current.setTheme('dark');
      result.current.setFontFamily('serif');
      result.current.setBaseFontPt(40.2);
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.font).toBe('serif');
    expect(document.documentElement.style.getPropertyValue('--font-base-pt')).toBe('40pt');
  });
});
