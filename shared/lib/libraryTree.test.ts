import { describe, expect, it } from 'vitest';
import type { SidebarItem } from '../../types';
import { isLibraryTreeItemActive } from './libraryTree';

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
