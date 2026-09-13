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

it('keeps a failed depth and title edit for retry without consuming text in the middle', async () => {
  const user = userEvent.setup();
  const rename = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
  render(<ChapterBlockCard id="child" label="가나다" depth={0} previousDepth={0} onRename={rename} />);
  await user.dblClick(screen.getByRole('heading', { name: '가나다' }));
  const input = screen.getByRole('textbox', { name: '챕터 제목 수정' }) as HTMLInputElement;
  input.setSelectionRange(0, 0);
  await user.keyboard('{Tab}');
  expect(input.value).toBe('가나다');
  expect(screen.getByRole('status').textContent).toContain('하위 1단계');
  input.setSelectionRange(1, 1);
  await user.keyboard(' ');
  expect(input.value).toBe('가 나다');
  await user.click(screen.getByRole('button', { name: '챕터 제목 저장' }));
  expect(rename).toHaveBeenLastCalledWith('가 나다', 1);
  expect(screen.getByRole('textbox')).toBe(input);
  expect(screen.getByRole('status').textContent).toContain('하위 1단계');
  await user.click(screen.getByRole('button', { name: '챕터 제목 저장' }));
  expect(rename).toHaveBeenLastCalledWith('가 나다', 1);
  expect(screen.queryByRole('textbox')).toBeNull();
});

it('uses the title for dragging and keyboard movement without a separate handle', async () => {
  const user = userEvent.setup();
  const move = vi.fn();
  render(<ChapterBlockCard id="one" label="Movable chapter" onDragStart={vi.fn()} onMove={move} onRename={vi.fn()} />);
  expect(screen.queryByRole('button', { name: /챕터 이동/ })).toBeNull();
  const title = screen.getByRole('heading', { name: 'Movable chapter' });
  expect(title.getAttribute('draggable')).toBe('true');
  await user.tab();
  expect(document.activeElement).toBe(title);
  await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
  expect(move).toHaveBeenLastCalledWith(1);
  await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
  expect(move).toHaveBeenLastCalledWith(-1);
});
