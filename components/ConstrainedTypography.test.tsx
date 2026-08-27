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

    expect(screen.queryByText('1')).toBeNull();

    await user.click(screen.getByRole('button', { name: '새 폴더' }));

    expect(screen.getByPlaceholderText('폴더 이름').className).toContain('type-body-bounded');

    await user.click(screen.getByRole('button', { name: '폴더 관리' }));
    await user.click(screen.getByRole('button', { name: '폴더 삭제' }));

    expect(screen.getByRole('button', { name: '취소' }).className).toContain('ui-btn');
    expect(screen.getByRole('button', { name: '삭제' }).className).toContain('type-label-bounded');
  });

  it('bounds body text in mobile layout inputs', async () => {
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

    await user.click(screen.getByRole('button', { name: '탐색 열기' }));
    expect(screen.queryByText('1')).toBeNull();

    await user.click(screen.getByRole('button', { name: '새 폴더' }));
    expect(screen.getByPlaceholderText('폴더 이름').className).toContain('type-body-bounded');

    expect(screen.getByPlaceholderText('문장, 저자 또는 책 검색').className).toContain('type-body-bounded');
  });
});
