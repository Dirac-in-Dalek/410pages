import { describe, expect, it } from 'vitest';
import type { SidebarItem } from '../../types';
import { getLibraryTreePaddingLeft, isLibraryTreeItemActive } from './libraryTree';

describe('isLibraryTreeItemActive', () => {
  it('uses ids so duplicate labels do not activate together', () => {
    const first: SidebarItem = {
      id: 'author-a', label: 'Same name', type: 'author',
      data: { authorId: 'author-a', author: 'Same name' },
    };
    const second: SidebarItem = {
      id: 'author-b', label: 'Same name', type: 'author',
      data: { authorId: 'author-b', author: 'Same name' },
    };
    const selected = { type: 'author' as const, authorId: 'author-a', value: 'Same name' };

    expect(isLibraryTreeItemActive(first, selected)).toBe(true);
    expect(isLibraryTreeItemActive(second, selected)).toBe(false);
  });
});

describe('getLibraryTreePaddingLeft', () => {
  it('keeps tree depth tied to the shared responsive sidebar variables', () => {
    expect(getLibraryTreePaddingLeft(3)).toBe(
      'calc(var(--reading-sidebar-padding, 12px) + 3 * var(--reading-sidebar-indent, 12px))'
    );
  });
});
