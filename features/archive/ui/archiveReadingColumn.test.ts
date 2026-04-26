import { describe, expect, it } from 'vitest';

import { getArchiveReadingColumnClass } from './archiveReadingColumn';

describe('getArchiveReadingColumnClass', () => {
  it('keeps desktop reading columns consistent across filters', () => {
    expect(getArchiveReadingColumnClass({ isBookView: false })).toContain(
      'max-w-[var(--citation-column-width)]'
    );
    expect(getArchiveReadingColumnClass({ isBookView: true })).toContain(
      'max-w-[var(--citation-column-width)]'
    );
  });

  it('keeps the mobile app column full width with compact padding', () => {
    expect(getArchiveReadingColumnClass({ isBookView: false, isMobileApp: true })).toBe(
      'mx-auto w-full max-w-5xl px-3',
    );
  });
});
