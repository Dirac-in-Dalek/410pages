// @vitest-environment node
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { expect, it } from 'vitest';
import { BREAKPOINTS, DESKTOP_MEDIA_QUERY } from './responsive';
import { CITATION_WIDTH, READING_FONT } from './readingDefaults';

it('builds CSS media queries and first-paint defaults from the same policy used by React', async () => {
  const source = readFileSync('index.css', 'utf8');
  const result = await postcss([tailwind({ optimize: true })]).process(source, { from: 'index.css' });
  const media: string[] = [];
  const values = new Map<string, string>();
  result.root.walkAtRules('media', (rule) => {
    media.push(rule.params);
  });
  result.root.walkDecls((declaration) => {
    values.set(declaration.prop, declaration.value);
  });
  expect(DESKTOP_MEDIA_QUERY).toBe(`(min-width: ${BREAKPOINTS.lg}px)`);
  expect(media.some((query) => query.includes(`${BREAKPOINTS.lg}px`))).toBe(true);
  expect(media.some((query) => query.includes(`${BREAKPOINTS.sm}px`))).toBe(true);
  expect(media.some((query) => query.includes(`${BREAKPOINTS.xs}px`))).toBe(true);
  expect(result.css).not.toContain('theme(screens.');
  expect(values.get('--font-base-pt')).toBe(`${READING_FONT.defaultPt}pt`);
  expect(values.get('--citation-column-width')).toBe(`${CITATION_WIDTH.defaultRem}rem`);
});
