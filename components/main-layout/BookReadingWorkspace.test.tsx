import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BookReadingWorkspace, type ReadingScrollPosition } from './BookReadingWorkspace';

describe('BookReadingWorkspace', () => {
  afterEach(() => vi.restoreAllMocks());

  it('restores the visible citation anchor after responsive row geometry changes', () => {
    let layoutShift = 0;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.hasAttribute('data-archive-scroll')) return { top: 0, bottom: 600, height: 600 } as DOMRect;
      if (this.hasAttribute('data-row-content')) {
        const scroller = this.closest('[data-archive-scroll]') as HTMLElement | null;
        const top = 80 + layoutShift - (scroller?.scrollTop ?? 0);
        return { top, bottom: top + 100, height: 100 } as DOMRect;
      }
      return { top: 0, bottom: 0, height: 0 } as DOMRect;
    });
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function () {
      return this.hasAttribute('data-row-content') ? [this.getBoundingClientRect()] as unknown as DOMRectList : [] as unknown as DOMRectList;
    });
    const positions = new Map<string, ReadingScrollPosition>();
    const children = <div data-archive-scroll><div data-book-row="quote-1" style={{ display: 'contents' }}><div data-row-content>인용문</div></div></div>;
    const common = { memo: <textarea />, memoOpen: true, memoPanelId: 'memo-panel', scrollPositions: positions };
    const view = render(<BookReadingWorkspace {...common} bookId="book-1">{children}</BookReadingWorkspace>);
    const primary = document.querySelector<HTMLElement>('[data-archive-scroll]')!;
    primary.scrollTop = 100;
    fireEvent.scroll(primary);
    expect(positions.get('book-1')?.anchor).toEqual({ id: 'quote-1', offset: -20 });

    view.rerender(<BookReadingWorkspace {...common} bookId="book-2">{children}</BookReadingWorkspace>);
    layoutShift = 40;
    view.rerender(<BookReadingWorkspace {...common} bookId="book-1">{children}</BookReadingWorkspace>);
    act(() => window.dispatchEvent(new Event('resize')));
    expect(primary.scrollTop).toBe(140);
    expect(positions.get('book-1')?.anchor).toEqual({ id: 'quote-1', offset: -20 });

    layoutShift = 60;
    act(() => window.dispatchEvent(new Event('resize')));
    expect(primary.scrollTop).toBe(160);
    expect(positions.get('book-1')?.anchor).toEqual({ id: 'quote-1', offset: -20 });
  });

  it('keeps an initial top position at zero while display-contents rows reflow', () => {
    let layoutShift = 0;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.hasAttribute('data-archive-scroll')) return { top: 0, bottom: 600, height: 600 } as DOMRect;
      if (this.hasAttribute('data-row-content')) {
        const scroller = this.closest('[data-archive-scroll]') as HTMLElement | null;
        const top = 80 + layoutShift - (scroller?.scrollTop ?? 0);
        return { top, bottom: top + 100, height: 100 } as DOMRect;
      }
      return { top: 0, bottom: 0, height: 0 } as DOMRect;
    });
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function () {
      return this.hasAttribute('data-row-content') ? [this.getBoundingClientRect()] as unknown as DOMRectList : [] as unknown as DOMRectList;
    });
    const positions = new Map<string, ReadingScrollPosition>();
    const children = <div data-archive-scroll><div data-book-row="quote-1" style={{ display: 'contents' }}><div data-row-content>인용문</div></div></div>;
    render(<BookReadingWorkspace memo={<textarea />} memoOpen memoPanelId="memo-panel" scrollPositions={positions} bookId="book-1">{children}</BookReadingWorkspace>);
    const primary = document.querySelector<HTMLElement>('[data-archive-scroll]')!;
    expect(primary.scrollTop).toBe(0);
    expect(positions.get('book-1')?.anchor).toBeUndefined();
    layoutShift = 60;
    act(() => window.dispatchEvent(new Event('resize')));
    expect(primary.scrollTop).toBe(0);
    expect(positions.get('book-1')?.anchor).toBeUndefined();
  });
});
