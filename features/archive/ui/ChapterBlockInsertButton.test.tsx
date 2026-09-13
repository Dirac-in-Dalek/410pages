import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChapterBlockInsertButton } from './ChapterBlockInsertButton';

describe('ChapterBlockInsertButton', () => {
  it('creates under the previous chapter and preserves the level after a failed save', async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    render(<ChapterBlockInsertButton isEditing previousDepth={1} onOpen={vi.fn()} onSubmit={submit} />);
    const input = screen.getByRole('textbox', { name: '챕터 제목' }) as HTMLInputElement;
    await user.keyboard('{Tab}');
    await user.type(input, '하위 제목');
    await user.click(screen.getByRole('button', { name: '챕터 저장' }));
    expect(submit).toHaveBeenLastCalledWith('하위 제목', 2);
    expect(input.value).toBe('하위 제목');
    expect(screen.getByRole('status').textContent).toContain('하위 2단계');
    await user.click(screen.getByRole('button', { name: '챕터 저장' }));
    expect(submit).toHaveBeenLastCalledWith('하위 제목', 2);
  });
  it('keeps the chapter title when saving fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(false);
    const onCancel = vi.fn();

    render(
      <ChapterBlockInsertButton
        isEditing
        onOpen={vi.fn()}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText('챕터 제목'), '제2장');
    await user.click(screen.getByRole('button', { name: '챕터 저장' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('제2장'));
    expect((screen.getByLabelText('챕터 제목') as HTMLInputElement).value).toBe('제2장');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('keeps the typed title while a background chapter refresh disables saving', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <ChapterBlockInsertButton
        isEditing
        onOpen={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText('챕터 제목'), '제3장');
    rerender(
      <ChapterBlockInsertButton
        isEditing
        disabled
        onOpen={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    expect((screen.getByLabelText('챕터 제목') as HTMLInputElement).value).toBe('제3장');
    expect(screen.getByRole('button', { name: '챕터 저장' }).hasAttribute('disabled')).toBe(true);

    rerender(
      <ChapterBlockInsertButton
        isEditing
        onOpen={vi.fn()}
        onSubmit={onSubmit}
      />
    );
    expect((screen.getByLabelText('챕터 제목') as HTMLInputElement).value).toBe('제3장');
  });
});
