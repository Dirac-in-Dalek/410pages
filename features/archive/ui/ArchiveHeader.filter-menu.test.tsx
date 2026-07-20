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
  it('uses one Korean sort button to open date/page choices', async () => {
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

    const filterButton = screen.getByRole('button', { name: '정렬: 작성일 · 최신순' });
    expect(filterButton.getAttribute('aria-expanded')).toBe('false');

    await user.click(filterButton);

    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: '작성일 · 최신순' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('menuitemradio', { name: '페이지 · 오름차순' }).getAttribute('aria-checked')).toBe('false');

    await user.click(screen.getByRole('menuitemradio', { name: '페이지 · 오름차순' }));

    expect(onPageSortClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('menu')).toBeTruthy();

    await user.click(screen.getByRole('menuitemradio', { name: '작성일 · 최신순' }));

    expect(onDateSortClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('menu')).toBeTruthy();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).toBeNull();
  });
});
