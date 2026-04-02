import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MobileLayout } from './MobileLayout';
import { ProjectSidebar } from './main-layout/ProjectSidebar';
import type { Project, SidebarItem } from '../types';

const projects: Project[] = [
  {
    id: 'project-1',
    name: 'Current Project',
    citationIds: ['citation-1', 'citation-2'],
  },
];

const treeData: SidebarItem[] = [
  {
    id: 'root-user',
    label: 'Reader',
    type: 'root',
    children: [],
    data: { author: 'Reader' },
  },
];

describe('settings entry points', () => {
  it('opens settings from the desktop sidebar footer', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();

    render(
      <ProjectSidebar
        projects={projects}
        selectedProjectId={null}
        onProjectSelect={vi.fn()}
        onDropCitationToProject={vi.fn()}
        onCreateProject={vi.fn()}
        onRenameProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onReorderProjects={vi.fn()}
        username="Reader"
        onSignOut={vi.fn()}
        onOpenPdfReader={vi.fn()}
        onOpenSettings={onOpenSettings}
        width={280}
        isResizing={false}
        onStartResize={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /reader 개인 설정/i }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('opens settings from the mobile header and project drawer', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();

    render(
      <MobileLayout
        title="Archive"
        projects={projects}
        selectedProjectId={null}
        onProjectSelect={vi.fn()}
        onCreateProject={vi.fn()}
        treeData={treeData}
        onTreeItemClick={vi.fn()}
        username="Reader"
        onSignOut={vi.fn()}
        onOpenSettings={onOpenSettings}
      >
        <div>Content</div>
      </MobileLayout>
    );

    await user.click(screen.getByRole('button', { name: /open settings/i }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Folders' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));

    expect(onOpenSettings).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Close panels' })).toBeNull();
  });
});
