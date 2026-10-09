import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CitationEditor } from './CitationEditor';

const prefillData = { author: 'Author', book: 'Book', bookId: 'book-1' };

describe('book composer kind controls', () => {
  it('keeps a one-line draft at its empty height, including after a font change, and grows for additional lines', async () => {
    let lineHeight = 30;
    const previousFont = document.documentElement.style.getPropertyValue('--font-base-pt');
    const getStyle = window.getComputedStyle;
    const styleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
      const style = getStyle(element);
      return element instanceof HTMLTextAreaElement ? new Proxy(style, {
        get: (target, key) => key === 'lineHeight' ? `${lineHeight}px`
          : key === 'paddingTop' || key === 'paddingBottom' ? '6px' : Reflect.get(target, key),
      }) : style;
    });
    // Model native auto height: rows is two by default, including vertical padding.
    const heightSpy = vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLTextAreaElement) {
      return Math.max(this.rows, this.value.split('\n').length) * lineHeight + 12;
    });
    const onAddCitation = vi.fn();
    let view: ReturnType<typeof render> | undefined;
    try {
      view = render(<CitationEditor onAddCitation={onAddCitation} username="Reader" prefillData={prefillData}
        bookDepth={0} hideSourceFields />);
      const input = screen.getByRole('textbox', { name: '인용문 입력' }) as HTMLTextAreaElement;
      const emptyHeight = input.style.height;
      expect(emptyHeight).toBe('42px');
      fireEvent.change(input, { target: { value: 'ㄱ' } });
      expect(input.style.height).toBe(emptyHeight);
      fireEvent.change(input, { target: { value: '한 줄 문장' } });
      expect(input.style.height).toBe(emptyHeight);
      fireEvent.change(input, { target: { value: '첫 줄\n둘째 줄\n셋째 줄' } });
      expect(input.style.height).toBe('102px');
      fireEvent.change(input, { target: { value: '다시 한 줄' } });
      expect(input.style.height).toBe(emptyHeight);
      fireEvent.change(input, { target: { value: '' } });
      expect(input.style.height).toBe(emptyHeight);
      lineHeight = 42;
      await act(async () => { document.documentElement.style.setProperty('--font-base-pt', '24pt'); });
      expect(input.style.height).toBe('54px');
      fireEvent.change(input, { target: { value: '큰 글자 첫 입력' } });
      expect(input.style.height).toBe('54px');
      expect(onAddCitation).not.toHaveBeenCalled();
    } finally {
      view?.unmount();
      if (previousFont) document.documentElement.style.setProperty('--font-base-pt', previousFont);
      else document.documentElement.style.removeProperty('--font-base-pt');
      heightSpy.mockRestore();
      styleSpy.mockRestore();
    }
  });

  it('changes kind while keeping focus, text and page', async () => {
    const user = userEvent.setup();
    function BookComposer() {
      const [chapterMode, setChapterMode] = useState(false);
      const [focusRequest, setFocusRequest] = useState(0);
      return <CitationEditor onAddCitation={vi.fn()} username="Reader" prefillData={prefillData}
        bookDepth={0} maxChapterDepth={1} onHierarchyKey={vi.fn()} hideSourceFields sequentialPageEntry chapterMode={chapterMode} focusRequest={focusRequest}
        onChapterModeChange={value => { setChapterMode(value); setFocusRequest(n => n + 1); }} />;
    }
    render(<BookComposer />);
    const originalText = screen.getByRole('textbox', { name: '인용문 입력' });
    await user.type(originalText, '보존할 문장');
    await user.type(screen.getByRole('textbox', { name: '페이지' }), '67');
    await user.click(screen.getByRole('radio', { name: '인용문' }));
    await user.click(screen.getByRole('radio', { name: '챕터' }));
    const chapter = screen.getByRole('radio', { name: '챕터' }) as HTMLInputElement;
    expect(chapter.checked).toBe(true);
    expect(document.activeElement).toBe(chapter);
    const depthControls = screen.getByRole('group', { name: '챕터 단계 변경' });
    expect(depthControls.closest('.citation-composer')).toBeNull();
    expect(screen.getByRole('textbox', { name: '챕터 제목 입력' })).toBe(originalText);
    expect(screen.queryByRole('textbox', { name: '페이지' })).toBeNull();
    expect((screen.getByRole('textbox', { name: '챕터 제목 입력' }) as HTMLTextAreaElement).value).toBe('보존할 문장');
    await user.click(screen.getByRole('radio', { name: '인용문' }));
    const text = screen.getByRole('textbox', { name: '인용문 입력' });
    expect(text).toBe(originalText);
    expect(screen.queryByRole('group', { name: '챕터 단계 변경' })).toBeNull();
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
