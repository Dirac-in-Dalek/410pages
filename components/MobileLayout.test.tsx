import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MobileLayout } from './MobileLayout';

const authorFolderProps = {
  authorFolderLoading: false,
  authorFolderLoadError: null,
  onRetryAuthorFolders: vi.fn(),
  onCreateAuthorFolder: vi.fn(),
  onRenameAuthorFolder: vi.fn(),
  onDeleteAuthorFolder: vi.fn(),
  onMoveAuthorToFolder: vi.fn(),
  onRemoveAuthorFromFolder: vi.fn(),
  onRenameAuthor: vi.fn(),
  onDeleteAuthor: vi.fn(),
  onPreviewAuthorDelete: vi.fn(),
};

describe('MobileLayout header actions', () => {
  it('opens one navigation sheet from the header', async () => {
    const user = userEvent.setup();

    render(
      <MobileLayout
        {...authorFolderProps}
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
    expect(screen.queryByRole('button', { name: '서재' })).toBeNull();

    await user.click(screen.getByRole('button', { name: '탐색 열기' }));
    expect(screen.getByRole('heading', { name: '410pages' })).not.toBeNull();
    expect(screen.getByRole('button', { name: '홈' }).className).toContain('justify-center');
    expect(screen.getByRole('button', { name: /저자와 책/ }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('폴더 추가')).not.toBeNull();
    expect(screen.getByRole('button', { name: '폴더' })).not.toBeNull();
  });

  it('does not expose the removed global new-book entry', async () => {
    const user = userEvent.setup();

    render(
      <MobileLayout
        {...authorFolderProps}
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

    await user.click(screen.getByRole('button', { name: '탐색 열기' }));
    expect(screen.queryByRole('button', { name: '새 책 읽기' })).toBeNull();
  });

  it('shows a folder-only retry without blocking the navigation sheet', async () => {
    const user = userEvent.setup();
    const onRetryAuthorFolders = vi.fn();
    render(
      <MobileLayout
        {...authorFolderProps}
        authorFolderLoadError="저자 폴더를 불러오지 못했습니다."
        onRetryAuthorFolders={onRetryAuthorFolders}
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

    await user.click(screen.getByRole('button', { name: '탐색 열기' }));
    expect(screen.getByRole('alert').textContent).toContain('저자 폴더');
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetryAuthorFolders).toHaveBeenCalledOnce();
  });

  it('keeps a folder name open when creation fails', async () => {
    const user = userEvent.setup();
    const onCreateProject = vi.fn().mockResolvedValue(false);

    render(
      <MobileLayout
        {...authorFolderProps}
        title="All Citations"
        projects={[]}
        selectedProjectId={null}
        onProjectSelect={vi.fn()}
        onCreateProject={onCreateProject}
        treeData={[]}
        onTreeItemClick={vi.fn()}
        onOpenSettings={vi.fn()}
      >
        <div>Archive content</div>
      </MobileLayout>
    );

    await user.click(screen.getByRole('button', { name: '탐색 열기' }));
    await user.click(screen.getByRole('button', { name: '새 폴더' }));
    await user.type(screen.getByPlaceholderText('폴더 이름'), '다시 저장할 폴더');
    await user.click(screen.getByTitle('만들기'));

    await waitFor(() => expect(onCreateProject).toHaveBeenCalledWith('다시 저장할 폴더'));
    expect((screen.getByPlaceholderText('폴더 이름') as HTMLInputElement).value).toBe('다시 저장할 폴더');
  });
});
