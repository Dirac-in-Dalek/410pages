import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FONT_ID, FONT_IDS } from '../lib/fontRegistry';
import { useUserPreferences } from '../features/settings/logic/useUserPreferences';
import { applyPreferencesToDocument } from '../features/settings/logic/preferencesDocument';
import { readStoredPreferences } from '../features/settings/logic/preferencesStorage';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
} from '../features/settings/policy/userPreferences';

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
  document.head.innerHTML = '<meta name="theme-color" content="#ffffff" />';
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
      theme: 'night',
      fontFamily: 'serif',
      baseFontPt: 22,
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('night');
    expect(document.documentElement.dataset.font).toBe('serif');
    expect(document.documentElement.style.getPropertyValue('--font-base-pt')).toBe('22pt');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#171717');
  });

  it('resolves auto theme from the system color scheme', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: createMatchMediaStub(true),
    });

    applyPreferencesToDocument({
      ...DEFAULT_PREFERENCES,
      theme: 'auto',
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('night');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#171717');
  });

  it('migrates legacy text scale preferences to numeric base font sizes', () => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ theme: 'light', fontFamily: 'serif', textScale: 'lg' })
    );

    expect(readStoredPreferences()).toEqual({
      theme: 'day',
      fontFamily: 'serif',
      baseFontPt: 18,
    });
  });

  it.each(FONT_IDS)('accepts known registry font id %s', (fontFamily) => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ theme: 'auto', fontFamily, baseFontPt: 16 })
    );

    expect(readStoredPreferences()).toMatchObject({
      fontFamily,
      baseFontPt: 16,
    });
  });

  it('falls back to the default font when the stored id is unknown', () => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ theme: 'auto', fontFamily: 'unknown-font', baseFontPt: 16 })
    );

    expect(readStoredPreferences()).toMatchObject({
      fontFamily: DEFAULT_FONT_ID,
      baseFontPt: 16,
    });
  });

  it('persists updates from the hook', () => {
    const { result } = renderHook(() => useUserPreferences());

    act(() => {
      result.current.setTheme('day');
      result.current.setFontFamily('serif');
      result.current.setBaseFontPt(23.7);
    });

    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}')).toMatchObject({
      theme: 'day',
      fontFamily: 'serif',
      baseFontPt: 24,
    });
  });

  it.each([
    ['sm', 14],
    ['md', 16],
    ['lg', 18],
  ] as const)('preserves the legacy text scale alias for %s', (textScale, expectedBaseFontPt) => {
    const { result } = renderHook(() => useUserPreferences());

    act(() => {
      result.current.setTextScale(textScale);
    });

    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}')).toMatchObject({
      baseFontPt: expectedBaseFontPt,
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
      result.current.setTheme('night');
      result.current.setFontFamily('serif');
      result.current.setBaseFontPt(40.2);
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('night');
    expect(document.documentElement.dataset.font).toBe('serif');
    expect(document.documentElement.style.getPropertyValue('--font-base-pt')).toBe('40pt');
  });
});
