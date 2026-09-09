import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import { ChapterBlockCard } from './ChapterBlockCard';

it('edits on double click and keeps a failed title for retry', async () => {
  const user = userEvent.setup();
  const rename = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
  render(<ChapterBlockCard id="one" label="기존 제목" onRename={rename} />);
  await user.dblClick(screen.getByRole('heading', { name: '기존 제목' }));
  const input = screen.getByRole('textbox', { name: '챕터 제목 수정' });
  await user.clear(input);
  await user.type(input, '새 제목');
  await user.click(screen.getByRole('button', { name: '챕터 제목 저장' }));
  expect(screen.getByRole('alert')).toBeTruthy();
  expect((input as HTMLInputElement).value).toBe('새 제목');
  await user.click(screen.getByRole('button', { name: '챕터 제목 저장' }));
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(rename).toHaveBeenLastCalledWith('새 제목');
});
