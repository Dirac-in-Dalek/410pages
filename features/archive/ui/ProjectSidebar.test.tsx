import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectSidebar } from './ProjectSidebar';

describe('ProjectSidebar rename', () => {
  it('submits a folder rename only once while the first request is pending', async () => {
    const user = userEvent.setup();
    let resolveRename!: (value: boolean) => void;
    const onRenameProject = vi.fn(
      () => new Promise<boolean>((resolve) => { resolveRename = resolve; })
    );

    render(
      <ProjectSidebar
        projects={[{ id: 'project-1', name: 'Old name', citationIds: [] }]}
        selectedProjectId={null}
        onProjectSelect={vi.fn()}
        onDropCitationToProject={vi.fn()}
        onCreateProject={vi.fn()}
        onRenameProject={onRenameProject}
        onDeleteProject={vi.fn()}
        onReorderProjects={vi.fn()}
        books={[]}
        citations={[]}
        treeData={[]}
        selectedBookId={null}
        selectedFilter={null}
        isHomeView
        onHomeSelect={vi.fn()}
        onBookSelect={vi.fn()}
        onTreeItemClick={vi.fn()}
        authorFolderLoading={false}
        authorFolderLoadError={null}
        onRetryAuthorFolders={vi.fn()}
        onCreateAuthorFolder={vi.fn()}
        onRenameAuthorFolder={vi.fn()}
        onDeleteAuthorFolder={vi.fn()}
        onMoveAuthorToFolder={vi.fn()}
        onRemoveAuthorFromFolder={vi.fn()}
        onDeleteAuthor={vi.fn()}
        onPreviewAuthorDelete={vi.fn()}
        width={280}
        isResizing={false}
        onStartResize={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: '폴더 관리' }));
    await user.click(screen.getByRole('button', { name: '폴더 이름 변경' }));
    const input = screen.getByPlaceholderText('폴더 이름');
    await user.clear(input);
    await user.type(input, 'New name');

    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRenameProject).toHaveBeenCalledTimes(1);
    resolveRename(true);
    await waitFor(() => expect(screen.queryByPlaceholderText('폴더 이름')).toBeNull());
  });

  it('keeps an author-folder name when creation fails', async () => {
    const user = userEvent.setup();
    const onCreateAuthorFolder = vi.fn().mockResolvedValue(false);
    render(
      <ProjectSidebar
        projects={[]}
        selectedProjectId={null}
        onProjectSelect={vi.fn()}
        onDropCitationToProject={vi.fn()}
        onCreateProject={vi.fn()}
        onRenameProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onReorderProjects={vi.fn()}
        books={[]}
        citations={[]}
        treeData={[]}
        selectedBookId={null}
        selectedFilter={null}
        isHomeView
        onHomeSelect={vi.fn()}
        onBookSelect={vi.fn()}
        onTreeItemClick={vi.fn()}
        authorFolderLoading={false}
        authorFolderLoadError={null}
        onRetryAuthorFolders={vi.fn()}
        onCreateAuthorFolder={onCreateAuthorFolder}
        onRenameAuthorFolder={vi.fn()}
        onDeleteAuthorFolder={vi.fn()}
        onMoveAuthorToFolder={vi.fn()}
        onRemoveAuthorFromFolder={vi.fn()}
        onDeleteAuthor={vi.fn()}
        onPreviewAuthorDelete={vi.fn()}
        width={280}
        isResizing={false}
        onStartResize={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: '저자 폴더 만들기' }));
    expect(screen.getByText('폴더 추가')).not.toBeNull();
    await user.type(screen.getByRole('textbox', { name: '저자 폴더 이름' }), '철학');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(onCreateAuthorFolder).toHaveBeenCalledWith('철학');
    expect((screen.getByRole('textbox', { name: '저자 폴더 이름' }) as HTMLInputElement).value).toBe('철학');
  });
});
