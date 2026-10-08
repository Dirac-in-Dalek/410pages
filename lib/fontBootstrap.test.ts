import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_FONT_ID,
  ensureReadingFontLoaded,
  FONT_IDS,
  READING_FONT_STYLESHEET_ID,
} from './fontRegistry';

const INDEX_HTML_PATH = resolve(import.meta.dirname, '..', 'index.html');
const INDEX_CSS_PATH = resolve(import.meta.dirname, '..', 'index.css');

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
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('color-scheme');
  document.documentElement.style.removeProperty('--font-base-pt');
  document.documentElement.style.removeProperty('--citation-column-width');
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

  it('starts at the new normal size and preserves the smaller size on reload', () => {
    runBootstrapScript();
    expect(document.documentElement.style.getPropertyValue('--font-base-pt')).toBe('12pt');
    window.localStorage.setItem('user-preferences', JSON.stringify({ theme: 'auto', fontFamily: 'pretendard', baseFontPt: 7 }));
    runBootstrapScript();
    expect(document.documentElement.style.getPropertyValue('--font-base-pt')).toBe('7pt');
  });

  it.each([[3, 7], [40, 20]])('limits a stored size of %s to %s before the app starts', (stored, expected) => {
    window.localStorage.setItem('user-preferences', JSON.stringify({ theme: 'auto', fontFamily: 'pretendard', baseFontPt: stored }));
    runBootstrapScript();
    expect(document.documentElement.style.getPropertyValue('--font-base-pt')).toBe(`${expected}pt`);
    expect(JSON.parse(window.localStorage.getItem('user-preferences') || '{}').baseFontPt).toBe(expected);
  });

  it('applies Pretendard to citation copy when Pretendard is selected', () => {
    const css = readFileSync(INDEX_CSS_PATH, 'utf8');
    const pretendardRule = css.match(/:root\[data-font='pretendard'\]\s*\{([\s\S]*?)\}/)?.[1];

    expect(pretendardRule).toContain('--font-ui-active: var(--font-ui)');
    expect(pretendardRule).toContain('--font-display-active: var(--font-ui)');
  });

  it('accepts mono font ids during classic first paint', () => {
    window.localStorage.setItem(
      'user-preferences',
      JSON.stringify({ theme: 'system', fontFamily: 'jetbrains-mono', baseFontPt: 18 })
    );

    runBootstrapScript();

    expect(document.documentElement.dataset.font).toBe('jetbrains-mono');
    expect(document.documentElement.style.getPropertyValue('--font-base-pt')).toBe('18pt');
    expect(document.documentElement.style.getPropertyValue('--citation-column-width')).toBe('44rem');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('applies stored citation width during classic first paint', () => {
    window.localStorage.setItem(
      'user-preferences',
      JSON.stringify({
        theme: 'auto',
        fontFamily: 'pretendard',
        baseFontPt: 16,
        citationWidthRem: 49,
      })
    );

    runBootstrapScript();

    expect(document.documentElement.style.getPropertyValue('--citation-column-width')).toBe('49rem');
  });

  it('clamps stored citation width during classic first paint', () => {
    window.localStorage.setItem(
      'user-preferences',
      JSON.stringify({
        theme: 'auto',
        fontFamily: 'pretendard',
        baseFontPt: 16,
        citationWidthRem: 80,
      })
    );

    runBootstrapScript();

    expect(document.documentElement.style.getPropertyValue('--citation-column-width')).toBe('50rem');
  });

  it.each(['night', 'terminal-green', 'shostakovich-dark', 'warm-paper', 'auto'])(
    'starts with Day while preserving a stored %s theme for authentication', (theme) => {
      window.localStorage.setItem(
        'user-preferences',
        JSON.stringify({ theme, fontFamily: 'pretendard', baseFontPt: 18 })
      );
      window.matchMedia = createMatchMediaStub(true);

      runBootstrapScript();

      expect(document.documentElement.dataset.theme).toBe('day');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe('light');
      expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#f8f7f5');
      expect(JSON.parse(window.localStorage.getItem('user-preferences') || '{}').theme).toBe(theme);
    }
  );

  it.each([['theme-preference', 'dark'], ['dark-mode', 'true']])(
    'uses Day before authentication without losing the legacy %s theme', (key, value) => {
      window.localStorage.setItem(key, value);
      window.matchMedia = createMatchMediaStub(true);

      runBootstrapScript();

      expect(document.documentElement.dataset.theme).toBe('day');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(JSON.parse(window.localStorage.getItem('user-preferences') || '{}').theme).toBe('night');
    }
  );

  it('falls back to the registry default font during classic first paint', () => {
    window.localStorage.setItem(
      'user-preferences',
      JSON.stringify({ theme: 'system', fontFamily: 'unknown-font', baseFontPt: 18 })
    );

    runBootstrapScript();

    expect(document.documentElement.dataset.font).toBe(DEFAULT_FONT_ID);
  });

  it('loads only the selected reading font and reuses one stylesheet link', () => {
    ensureReadingFontLoaded('nanum-myeongjo');
    const firstLink = document.getElementById(READING_FONT_STYLESHEET_ID) as HTMLLinkElement;
    expect(firstLink.getAttribute('href')).toContain('Nanum+Myeongjo');

    ensureReadingFontLoaded('jetbrains-mono');
    const nextLink = document.getElementById(READING_FONT_STYLESHEET_ID) as HTMLLinkElement;
    expect(nextLink).toBe(firstLink);
    expect(nextLink.getAttribute('href')).toContain('JetBrains+Mono');
    expect(document.querySelectorAll(`#${READING_FONT_STYLESHEET_ID}`)).toHaveLength(1);

    ensureReadingFontLoaded('pretendard');
    expect(document.getElementById(READING_FONT_STYLESHEET_ID)).toBeNull();
  });
});
