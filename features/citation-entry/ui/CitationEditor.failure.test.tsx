import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CitationEditor } from './CitationEditor';

describe('CitationEditor failure', () => {
  it('keeps the typed citation when persistence reports failure', async () => {
    const user = userEvent.setup();
    const onAddCitation = vi.fn().mockResolvedValue({ ok: false, error: new Error('offline') });
    render(
      <CitationEditor
        onAddCitation={onAddCitation}
        username="Reader"
        prefillData={{ author: 'Author', book: 'Book', bookId: 'book-1' }}
        hideSourceFields
      />
    );

    const input = screen.getByPlaceholderText('문장, 인용문 또는 단어를 입력하세요');
    await user.type(input, '지워지면 안 되는 문장을 끝까지 보존해야 한다.');
    await user.click(screen.getByRole('button', { name: '문장 저장' }));

    expect((input as HTMLTextAreaElement).value).toBe('지워지면 안 되는 문장을 끝까지 보존해야 한다.');
  });
});
