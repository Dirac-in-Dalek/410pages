import { useRef } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useAutosizeTextarea } from './useAutosizeTextarea';
import { TEXTAREA_MAX_HEIGHT } from '../policy/textarea';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('data-font');
});

function View({
  value,
  comment = false,
  enabled = true,
}: {
  value: string;
  comment?: boolean;
  enabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutosizeTextarea(ref, value, { variant: comment ? 'inlineComment' : 'entry', enabled });
  return <textarea ref={ref} aria-label="입력" value={value} readOnly />;
}

it('caps entry height, restores the empty height, and permits inline comments to grow', () => {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(550);
  const { rerender } = render(<View value="글" />);
  expect(screen.getByRole('textbox').style.height).toBe(`${TEXTAREA_MAX_HEIGHT}px`);
  rerender(<View value="" />);
  expect(screen.getByRole('textbox').style.height).toBe('40px');
  rerender(<View value="댓글" comment />);
  expect(screen.getByRole('textbox').style.height).toBe('550px');
});

it('reflows after a font policy change and preserves the input scroll position', async () => {
  let height = 90;
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(() => height);
  render(<View value="글" />);
  const input = screen.getByRole('textbox');
  input.scrollTop = 12;
  height = 140;
  await act(async () => {
    document.documentElement.dataset.font = 'serif';
  });
  expect(input.style.height).toBe('140px');
  expect(input.scrollTop).toBe(12);
});
