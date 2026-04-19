import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FONT_ID, FONT_IDS } from './fontRegistry';

const INDEX_HTML_PATH = resolve(import.meta.dirname, '..', 'index.html');

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

const resetDom = () => {
  document.head.innerHTML = '<meta name="theme-color" content="#ffffff" />';
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-font');
  document.documentElement.style.removeProperty('--font-base-pt');
  installStorageStub();
  window.localStorage.clear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: createMatchMediaStub(),
  });
};

const getClassicBootstrapScript = () => {
  const html = readFileSync(INDEX_HTML_PATH, 'utf8');
  const scriptMatch = html.match(/<script>\s*([\s\S]*?)\s*<\/script>\s*<link rel="manifest"/);

  if (!scriptMatch) {
    throw new Error('Unable to locate the classic inline bootstrap script in index.html');
  }

  return {
    html,
    script: scriptMatch[1],
  };
};

const extractQuotedValues = (value: string) =>
  Array.from(value.matchAll(/'([^']+)'/g), (match) => match[1]);

const getDeclaredSupportedFonts = (script: string) => {
  const match = script.match(/const supportedFonts = new Set\(\[([\s\S]*?)\]\);/);

  if (!match) {
    throw new Error('Unable to locate supportedFonts in the classic bootstrap script');
  }

  return extractQuotedValues(match[1]);
};

const getDeclaredDefaultFontId = (script: string) => {
  const match = script.match(/fontFamily:\s*'([^']+)'/);

  if (!match) {
    throw new Error('Unable to locate the default font id in the classic bootstrap script');
  }

  return match[1];
};

const runBootstrapScript = () => {
  const { script } = getClassicBootstrapScript();
  const runBootstrap = new Function(script);

  runBootstrap();
};

describe('index bootstrap', () => {
  beforeEach(() => {
    resetDom();
  });

  it('keeps the classic inline bootstrap in index.html', () => {
    const { html } = getClassicBootstrapScript();

    expect(html).not.toContain('<script type="module">');
  });

  it('keeps the bootstrap font contract aligned with the registry exports', () => {
    const { script } = getClassicBootstrapScript();

    expect(getDeclaredSupportedFonts(script)).toEqual(FONT_IDS);
    expect(getDeclaredDefaultFontId(script)).toBe(DEFAULT_FONT_ID);
  });

  it('accepts expanded nanum font ids during classic first paint', () => {
    window.localStorage.setItem(
      'user-preferences',
      JSON.stringify({ theme: 'system', fontFamily: 'nanum-brush-script', baseFontPt: 18 })
    );

    runBootstrapScript();

    expect(document.documentElement.dataset.font).toBe('nanum-brush-script');
    expect(document.documentElement.style.getPropertyValue('--font-base-pt')).toBe('18pt');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('supports the new theme ids during classic first paint', () => {
    window.localStorage.setItem(
      'user-preferences',
      JSON.stringify({ theme: 'warm-paper', fontFamily: 'pretendard', baseFontPt: 18 })
    );

    runBootstrapScript();

    expect(document.documentElement.dataset.theme).toBe('warm-paper');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#f7f2e8');
  });

  it('falls back to the registry default font during classic first paint', () => {
    window.localStorage.setItem(
      'user-preferences',
      JSON.stringify({ theme: 'system', fontFamily: 'unknown-font', baseFontPt: 18 })
    );

    runBootstrapScript();

    expect(document.documentElement.dataset.font).toBe(DEFAULT_FONT_ID);
  });
});
