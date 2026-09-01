import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MainLayout } from './MainLayout';

const noop = vi.fn();
const asyncNoop = vi.fn(async () => undefined);
const baseProps = {
  projects: [],
  onProjectSelect: noop,
  selectedProjectId: null,
  onDropCitationToProject: noop,
  onCreateProject: asyncNoop,
  onRenameProject: asyncNoop,
  onDeleteProject: noop,
  onRenameAuthor: asyncNoop,
  onRenameBook: asyncNoop,
  books: [],
  citations: [],
  isHomeView: false,
  selectedBookId: 'book-1',
  onHomeSelect: noop,
  onBookSelect: noop,
  onReorderProjects: noop,
  treeData: [],
  onTreeItemClick: noop,
  authorFolderLoading: false,
  authorFolderLoadError: null,
  onRetryAuthorFolders: asyncNoop,
  onCreateAuthorFolder: asyncNoop,
  onRenameAuthorFolder: asyncNoop,
  onDeleteAuthorFolder: asyncNoop,
  onMoveAuthorToFolder: asyncNoop,
  onRemoveAuthorFromFolder: asyncNoop,
  onDeleteAuthor: asyncNoop,
  onPreviewAuthorDelete: asyncNoop,
  onOpenSettings: noop,
  leftPanel: <div />,
};

describe('MainLayout right panel', () => {
  it('keeps a collapsed panel mounted while removing its width and focus visibility', () => {
    const panel = <div data-testid="right-panel-content">메모</div>;
    const { rerender } = render(
      <MainLayout {...baseProps} rightPanel={panel} rightPanelOpen={false}>본문</MainLayout>
    );
    const wrapper = screen.getByTestId('right-panel-content').parentElement!;
    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper.className).toContain('w-0');

    rerender(<MainLayout {...baseProps} rightPanel={panel} rightPanelOpen>본문</MainLayout>);
    expect(wrapper.getAttribute('aria-hidden')).toBe('false');
    expect(wrapper.className).toContain('w-[20rem]');
  });
});
