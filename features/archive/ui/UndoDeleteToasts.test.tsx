import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UndoDeleteToasts } from './UndoDeleteToasts';

describe('UndoDeleteToasts', () => {
  it('renders one grouped message and undoes by operation id', () => {
    const onUndo = vi.fn();

    render(
      <UndoDeleteToasts
        pendingDeletes={[{
          id: 'delete-group-1',
          text: 'First sentence.',
          count: 2,
          citationIds: ['citation-1', 'citation-2'],
        }]}
        onUndo={onUndo}
      />
    );

    expect(screen.getByText('2개 항목을 삭제했습니다.')).toBeTruthy();
    expect(screen.queryByText('First sentence.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '실행 취소' }));
    expect(onUndo).toHaveBeenCalledWith('delete-group-1');
  });
});
