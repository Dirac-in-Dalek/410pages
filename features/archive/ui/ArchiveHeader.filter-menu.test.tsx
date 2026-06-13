import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ArchiveHeader } from './ArchiveHeader';

const baseProps = {
  title: 'Archive',
  showEditor: false,
  username: 'Reader',
  isBookView: false,
  onAddCitation: vi.fn(),
  sortField: 'date' as const,
  dateDirection: 'desc' as const,
  pageDirection: 'asc' as const,
  onDateSortClick: vi.fn(),
  onPageSortClick: vi.fn(),
};

describe('ArchiveHeader filter menu', () => {
  it('uses one Filter button to open date/page sort choices', async () => {
    const user = userEvent.setup();
    const onDateSortClick = vi.fn();
    const onPageSortClick = vi.fn();

    render(
      <ArchiveHeader
        {...baseProps}
        onDateSortClick={onDateSortClick}
        onPageSortClick={onPageSortClick}
      />
    );

    expect(screen.queryByRole('button', { name: 'Sort by date' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sort by page' })).toBeNull();

    const filterButton = screen.getByRole('button', { name: 'Filter: Date ↓' });
    expect(filterButton.getAttribute('aria-expanded')).toBe('false');

    await user.click(filterButton);

    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: 'Date ↓' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('menuitemradio', { name: 'Page' }).getAttribute('aria-checked')).toBe('false');

    await user.click(screen.getByRole('menuitemradio', { name: 'Page' }));

    expect(onPageSortClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('menu')).toBeTruthy();

    await user.click(screen.getByRole('menuitemradio', { name: 'Date ↓' }));

    expect(onDateSortClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('menu')).toBeTruthy();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).toBeNull();
  });
});
