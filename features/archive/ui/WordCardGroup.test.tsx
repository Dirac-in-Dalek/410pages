import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Citation } from '../../../types';
import { WordCardGroup } from './WordCardGroup';

const word = (id: string, saveStatus?: Citation['saveStatus']): Citation => ({
  id,
  kind: 'word',
  text: id,
  author: 'Author',
  book: 'Book',
  notes: [],
  tags: [],
  createdAt: 100,
  saveStatus,
});

describe('WordCardGroup', () => {
  it('summarizes failures once and retries only failed words', async () => {
    const user = userEvent.setup();
    const onRetrySave = vi.fn().mockResolvedValue(undefined);
    render(
      <WordCardGroup
        citations={[word('failed-1', 'failed'), word('saving-1', 'saving'), word('saved-1')]}
        username="Reader"
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
        onRetrySave={onRetrySave}
        onUpdate={vi.fn()}
      />
    );

    expect(screen.getByRole('alert').textContent).toContain('1개 저장 실패');
    expect(screen.getByRole('button', { name: '저장에 실패한 단어 1개 복사' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '저장에 실패한 단어 1개 다시 시도' }));
    expect(onRetrySave).toHaveBeenCalledTimes(1);
    expect(onRetrySave).toHaveBeenCalledWith('failed-1');
  });
});
