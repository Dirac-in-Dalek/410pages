import { expect, it } from 'vitest';
import { checkSharedStyles } from './sharedStyles.js';

it.each(['(max-width: 1023px)', '(width < 1024px), (pointer: coarse)', '(min-width: var(--desktop))'])(
  'rejects a media query that bypasses the build-time policy: %s',
  (query) => {
    expect(checkSharedStyles(`@media ${query} { .card { display: block; } }`)).toHaveLength(1);
  }
);

it('permits shared breakpoints and capability-based queries', () => {
  expect(
    checkSharedStyles('@media (width < theme(screens.lg)), (pointer: coarse) { .card { display: block; } }')
  ).toEqual([]);
});
