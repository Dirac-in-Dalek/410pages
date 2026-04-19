import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
