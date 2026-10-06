import React, { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CitationEditor } from './CitationEditor';

const prefillData = { author: 'Author', book: 'Book', bookId: 'book-1' };

describe('book composer kind controls', () => {
  it('changes kind while keeping focus, text and page', async () => {
    const user = userEvent.setup();
    function BookComposer() {
      const [chapterMode, setChapterMode] = useState(false);
      const [focusRequest, setFocusRequest] = useState(0);
      return <CitationEditor onAddCitation={vi.fn()} username="Reader" prefillData={prefillData}
        bookDepth={0} hideSourceFields sequentialPageEntry chapterMode={chapterMode} focusRequest={focusRequest}
        onChapterModeChange={value => { setChapterMode(value); setFocusRequest(n => n + 1); }} />;
    }
    render(<BookComposer />);
    await user.type(screen.getByRole('textbox', { name: '인용문 입력' }), '보존할 문장');
    await user.type(screen.getByRole('textbox', { name: '페이지' }), '67');
    await user.click(screen.getByRole('radio', { name: '인용문' }));
    await user.click(screen.getByRole('radio', { name: '챕터' }));
    const chapter = screen.getByRole('radio', { name: '챕터' }) as HTMLInputElement;
    expect(chapter.checked).toBe(true);
    expect(document.activeElement).toBe(chapter);
    expect(screen.queryByRole('textbox', { name: '페이지' })).toBeNull();
    expect((screen.getByRole('textbox', { name: '챕터 제목 입력' }) as HTMLTextAreaElement).value).toBe('보존할 문장');
    await user.click(screen.getByRole('radio', { name: '인용문' }));
    const text = screen.getByRole('textbox', { name: '인용문 입력' });
    expect((screen.getByRole('textbox', { name: '페이지' }) as HTMLInputElement).value).toBe('67');
    await user.click(text);
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: '페이지' }));
  });

  it('locks both kinds during a save and retains input after failure', async () => {
    const user = userEvent.setup();
    let finish!: (result: { ok: false }) => void;
    const onAddCitation = vi.fn(() => new Promise<{ ok: false }>(resolve => { finish = resolve; }));
    const onChapterModeChange = vi.fn();
    render(<CitationEditor onAddCitation={onAddCitation} username="Reader" prefillData={prefillData}
      bookDepth={0} hideSourceFields onChapterModeChange={onChapterModeChange} />);
    const text = screen.getByRole('textbox', { name: '인용문 입력' });
    await user.type(text, '실패해도 남길 문장');
    const save = screen.getByRole('button', { name: '문장 저장' }) as HTMLButtonElement;
    await user.click(save);
    for (const radio of screen.getAllByRole('radio')) expect((radio as HTMLInputElement).disabled).toBe(true);
    expect(save.disabled).toBe(true);
    await user.click(screen.getByRole('radio', { name: '챕터' }));
    expect(onChapterModeChange).not.toHaveBeenCalled();
    expect(onAddCitation).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ ok: false }); });
    expect((text as HTMLTextAreaElement).value).toBe('실패해도 남길 문장');
    expect(save.disabled).toBe(false);
    for (const radio of screen.getAllByRole('radio')) expect((radio as HTMLInputElement).disabled).toBe(false);
  });
});
