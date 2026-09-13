import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BulkActionToolbar } from './BulkActionToolbar';

describe('BulkActionToolbar', () => {
  it('keeps a failed folder name and blocks duplicate submissions', async () => {
    const user = userEvent.setup();
    let resolveCreate!: (value: boolean) => void;
    const onCreateAndAddToProject = vi.fn(
      () => new Promise<boolean>((resolve) => { resolveCreate = resolve; })
    );

    render(
      <BulkActionToolbar
        selectedCount={1}
        totalCount={1}
        projects={[]}
        isCopying={false}
        onSelectAll={vi.fn()}
        onCopy={vi.fn()}
        onDeleteRequest={vi.fn()}
        onCancel={vi.fn()}
        onAddToProject={vi.fn()}
        onCreateAndAddToProject={onCreateAndAddToProject}
      />
    );

    await user.click(screen.getByRole('button', { name: '폴더에 추가' }));
    await user.click(screen.getByRole('menuitem', { name: '새 폴더' }));
    const input = screen.getByPlaceholderText('폴더 이름');
    await user.type(input, '읽을 책');
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCreateAndAddToProject).toHaveBeenCalledTimes(1);
    expect((input as HTMLInputElement).disabled).toBe(true);

    resolveCreate(false);
    await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(false));
    expect((input as HTMLInputElement).value).toBe('읽을 책');
  });
});
