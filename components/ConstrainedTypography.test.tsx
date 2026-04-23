import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MobileLayout } from './MobileLayout';
import type { Project, SidebarItem } from '../types';
import { ProjectSidebar } from '../features/archive/ui/ProjectSidebar';

const projects: Project[] = [
  {
    id: 'project-1',
    name: 'Alpha',
    citationIds: ['citation-1'],
  },
];

const treeData: SidebarItem[] = [
  {
    id: 'root-user',
    label: 'Researcher',
    type: 'root',
    children: [],
    data: { author: 'Researcher' },
  },
];

describe('Constrained typography', () => {
  it('bounds body text in project sidebar inputs and pills', async () => {
    const user = userEvent.setup();
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
        username="Researcher"
        onSignOut={vi.fn()}
        onOpenPdfReader={vi.fn()}
        onOpenSettings={vi.fn()}
        width={280}
        isResizing={false}
        onStartResize={vi.fn()}
      />
    );

    expect(screen.getByText('1').className).toContain('type-body-muted-bounded');

    await user.click(screen.getByRole('button', { name: 'New Project' }));

    expect(screen.getByPlaceholderText('Project Name').className).toContain('type-body-bounded');

    await user.click(screen.getByRole('button', { name: 'Manage folders' }));
    await user.click(screen.getByRole('button', { name: 'Delete project' }));

    expect(screen.getByRole('button', { name: 'Cancel' }).className).toContain('ui-btn');
    expect(screen.getByRole('button', { name: 'Remove' }).className).toContain('type-label-bounded');
  });

  it('bounds body text in mobile layout inputs and count badges', async () => {
    const user = userEvent.setup();
    render(
      <MobileLayout
        title="Archive"
        projects={projects}
        selectedProjectId={null}
        onProjectSelect={vi.fn()}
        onCreateProject={vi.fn()}
        treeData={treeData}
        onTreeItemClick={vi.fn()}
        onSearch={vi.fn()}
        searchTerm=""
        selectedFilter={null}
        username="Researcher"
        onSignOut={vi.fn()}
        onOpenSettings={vi.fn()}
      >
        <div>content</div>
      </MobileLayout>
    );

    await user.click(screen.getByRole('button', { name: 'Open folders' }));
    expect(screen.getByText('1').className).toContain('type-body-muted-bounded');

    await user.click(screen.getByRole('button', { name: 'New Project' }));
    expect(screen.getByPlaceholderText('Project name').className).toContain('type-body-bounded');

    await user.click(screen.getByLabelText('Close panels'));
    await user.click(screen.getByRole('button', { name: 'Open library' }));
    expect(screen.getByPlaceholderText('Search citations, author, book').className).toContain('type-body-bounded');
  });
});
