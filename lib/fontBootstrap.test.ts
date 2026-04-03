import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FONT_ID, FONT_IDS } from './fontRegistry';

const INDEX_HTML_PATH = resolve(import.meta.dirname, '..', 'index.html');
const BOOTSTRAP_IMPORT_STATEMENT = "import { DEFAULT_FONT_ID, FONT_IDS } from '/lib/fontRegistry.ts';";

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

const getBootstrapScript = () => {
  const html = readFileSync(INDEX_HTML_PATH, 'utf8');
  const scriptMatch = html.match(
    /<script type="module">\s*([\s\S]*?)\s*<\/script>\s*<link rel="manifest"/
  );

  if (!scriptMatch) {
    throw new Error('Unable to locate the bootstrap module script in index.html');
  }

  return {
    html,
    script: scriptMatch[1],
  };
};

const runBootstrapScript = () => {
  const { script } = getBootstrapScript();
  const executableScript = script.replace(BOOTSTRAP_IMPORT_STATEMENT, '');
  const runBootstrap = new Function('DEFAULT_FONT_ID', 'FONT_IDS', executableScript);

  runBootstrap(DEFAULT_FONT_ID, FONT_IDS);
};

describe('index bootstrap', () => {
  beforeEach(() => {
    resetDom();
  });

  it('loads registry font ids through the html bootstrap module', () => {
    const { html, script } = getBootstrapScript();

    expect(html).not.toContain("const supportedFonts = new Set([");
    expect(script).toContain(BOOTSTRAP_IMPORT_STATEMENT);
  });

  it('accepts expanded nanum font ids during first paint', () => {
    window.localStorage.setItem(
      'user-preferences',
      JSON.stringify({ theme: 'system', fontFamily: 'nanum-brush-script', baseFontPt: 18 })
    );

    runBootstrapScript();

    expect(document.documentElement.dataset.font).toBe('nanum-brush-script');
    expect(document.documentElement.style.getPropertyValue('--font-base-pt')).toBe('18pt');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('falls back to the registry default font during first paint', () => {
    window.localStorage.setItem(
      'user-preferences',
      JSON.stringify({ theme: 'system', fontFamily: 'unknown-font', baseFontPt: 18 })
    );

    runBootstrapScript();

    expect(document.documentElement.dataset.font).toBe(DEFAULT_FONT_ID);
  });
});
