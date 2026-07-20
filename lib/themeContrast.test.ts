import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const relativeLuminance = (hex: string) => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));

  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
};

const contrastRatio = (first: string, second: string) => {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

describe('theme muted text contrast', () => {
  it('keeps secondary information at WCAG AA contrast in every theme surface', () => {
    const css = readFileSync('index.css', 'utf8');
    const blocks = [...css.matchAll(/  :root(?:\[data-theme='([^']+)'\])?(?:,\n  \.dark)? \{([\s\S]*?)\n  \}/g)];

    expect(blocks).toHaveLength(13);

    for (const [, matchedTheme, block] of blocks) {
      const theme = matchedTheme || 'day';
      const token = (name: string) => block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
      const muted = token('text-muted');
      const surfaces = [token('bg-main'), token('bg-card'), token('bg-input')];

      expect(muted, `${theme} text-muted`).toBeTruthy();
      for (const surface of surfaces) {
        expect(surface, `${theme} surface token`).toBeTruthy();
        expect(contrastRatio(muted!, surface!), `${theme}: ${muted} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
