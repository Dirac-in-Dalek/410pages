import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MobileLayout } from './MobileLayout';

describe('MobileLayout header actions', () => {
  it('opens folders and library from header actions without rendering the bottom nav labels', async () => {
    const user = userEvent.setup();

    render(
      <MobileLayout
        title="All Citations"
        projects={[]}
        selectedProjectId={null}
        onProjectSelect={vi.fn()}
        onCreateProject={vi.fn()}
        treeData={[]}
        onTreeItemClick={vi.fn()}
        onOpenSettings={vi.fn()}
      >
        <div>Archive content</div>
      </MobileLayout>
    );

    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Folders' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Library' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Open folders' }));
    expect(screen.getByRole('heading', { name: 'Folders' })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Open library' }));
    expect(screen.getByRole('heading', { name: 'Library' })).not.toBeNull();
  });

  it('starts a new book from the mobile library sheet', async () => {
    const user = userEvent.setup();
    const onCreateBook = vi.fn().mockResolvedValue({ id: 'book-1' });

    render(
      <MobileLayout
        title="All Citations"
        projects={[]}
        selectedProjectId={null}
        onProjectSelect={vi.fn()}
        onCreateProject={vi.fn()}
        onCreateBook={onCreateBook}
        treeData={[]}
        onTreeItemClick={vi.fn()}
        onOpenSettings={vi.fn()}
      >
        <div>Archive content</div>
      </MobileLayout>
    );

    await user.click(screen.getByRole('button', { name: 'Open library' }));
    await user.click(screen.getByRole('button', { name: '새 책 읽기' }));
    await user.type(screen.getByLabelText('저자'), 'Ursula K. Le Guin');
    await user.type(screen.getByLabelText('책 제목'), 'The Dispossessed');
    await user.click(screen.getByRole('button', { name: '시작' }));

    await waitFor(() => {
      expect(onCreateBook).toHaveBeenCalledWith({
        author: 'Ursula K. Le Guin',
        title: 'The Dispossessed',
      });
    });
  });
});
