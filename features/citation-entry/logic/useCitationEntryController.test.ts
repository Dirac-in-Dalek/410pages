import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BookComposerDraftStore } from './bookComposerDrafts';
import { createCitationInput, useCitationEntryController } from './useCitationEntryController';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('createCitationInput', () => {
  it('stores short text as a citation with its page', () => {
    expect(
      createCitationInput({ text: '필연적 선택', author: 'Author', book: 'Book', page: '147' })
    ).toEqual({
      kind: 'sentence',
      text: '필연적 선택',
      author: 'Author',
      book: 'Book',
      page: '147',
      tags: [],
    });
  });

  it('keeps page data for a sentence', () => {
    expect(
      createCitationInput({ text: 'This is a sentence', author: 'Author', book: 'Book', page: '147' })
    ).toEqual({
      kind: 'sentence',
      text: 'This is a sentence',
      author: 'Author',
      book: 'Book',
      page: '147',
      tags: [],
    });
  });

  it('keeps the selected book id so same-named books cannot be confused', () => {
    expect(
      createCitationInput({
        text: 'This belongs to the selected book',
        author: 'Author',
        book: 'Same title',
        bookId: 'book-selected',
        page: '',
      })
    ).toMatchObject({
      bookId: 'book-selected',
      author: 'Author',
      book: 'Same title',
    });
  });
});

describe('citation entry textarea height', () => {
  const renderTextarea = () => {
    const drafts = new BookComposerDraftStore();
    drafts.patch('book', {
      values: { text: 'The same chapter text', author: 'Author', book: 'Book', page: '' },
    });

    const Editor = () => {
      const { textareaRef, values } = useCitationEntryController({
        username: 'User',
        draftScope: 'book',
        draftStore: drafts,
        onAddCitation: vi.fn(),
      });
      return React.createElement('div', { 'data-reading-responsive': true },
        React.createElement('textarea', { ref: textareaRef, value: values.text, readOnly: true }));
    };

    const rendered = render(React.createElement(Editor));
    return {
      textarea: rendered.getByRole('textbox') as HTMLTextAreaElement,
      unmount: rendered.unmount,
    };
  };

  it('grows and shrinks when width changes without changing text, then disconnects', () => {
    let scrollHeight = 100;
    let notifyResize!: ResizeObserverCallback;
    const disconnect = vi.fn();
    vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get')
      .mockImplementation(() => scrollHeight);
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) {
        notifyResize = callback;
      }
      observe() {}
      disconnect() {
        disconnect();
      }
    });

    const { textarea: view, unmount } = renderTextarea();
    const text = view.value;
    view.focus();
    view.setSelectionRange(4, 11);
    view.scrollTop = 17;

    notifyResize([{ contentRect: { width: 300 } } as ResizeObserverEntry], {} as ResizeObserver);
    scrollHeight = 520;
    notifyResize([{ contentRect: { width: 200 } } as ResizeObserverEntry], {} as ResizeObserver);
    expect(view.style.height).toBe('400px');
    expect(view.value).toBe(text);
    expect(document.activeElement).toBe(view);
    expect([view.selectionStart, view.selectionEnd]).toEqual([4, 11]);
    expect(view.scrollTop).toBe(17);

    scrollHeight = 120;
    notifyResize([{ contentRect: { width: 400 } } as ResizeObserverEntry], {} as ResizeObserver);
    expect(view.style.height).toBe('120px');

    scrollHeight = 240;
    notifyResize([{ contentRect: { width: 400 } } as ResizeObserverEntry], {} as ResizeObserver);
    expect(view.style.height).toBe('120px');

    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('still applies the initial height when ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockReturnValue(180);

    expect(renderTextarea().textarea.style.height).toBe('180px');
  });

  it('remeasures after shared reading variables change without remounting the draft', async () => {
    vi.stubGlobal('ResizeObserver', undefined);
    let scrollHeight = 120;
    vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockImplementation(() => scrollHeight);
    const { textarea } = renderTextarea();
    const scope = textarea.closest<HTMLElement>('[data-reading-responsive]')!;
    textarea.focus();
    textarea.setSelectionRange(2, 8);
    textarea.scrollTop = 11;
    scrollHeight = 260;

    await act(async () => scope.style.setProperty('--reading-body-font-size', '22px'));

    await waitFor(() => expect(textarea.style.height).toBe('260px'));
    expect(textarea.value).toBe('The same chapter text');
    expect(document.activeElement).toBe(textarea);
    expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([2, 8]);
    expect(textarea.scrollTop).toBe(11);
  });
});
