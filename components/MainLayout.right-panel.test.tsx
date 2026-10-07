import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MainLayout } from './MainLayout';

const noop = vi.fn();
const asyncNoop = vi.fn(async () => undefined);
const baseProps = {
  projects: [],
  onProjectSelect: noop,
  selectedProjectId: null,
  onDropCitationToProject: noop,
  onCreateProject: asyncNoop,
  onRenameProject: asyncNoop,
  onDeleteProject: noop,
  onRenameAuthor: asyncNoop,
  onRenameBook: asyncNoop,
  books: [],
  citations: [],
  isHomeView: false,
  selectedBookId: 'book-1',
  onHomeSelect: noop,
  onBookSelect: noop,
  onReorderProjects: noop,
  treeData: [],
  onTreeItemClick: noop,
  authorFolderLoading: false,
  authorFolderLoadError: null,
  onRetryAuthorFolders: asyncNoop,
  onCreateAuthorFolder: asyncNoop,
  onRenameAuthorFolder: asyncNoop,
  onDeleteAuthorFolder: asyncNoop,
  onMoveAuthorToFolder: asyncNoop,
  onRemoveAuthorFromFolder: asyncNoop,
  onDeleteAuthor: asyncNoop,
  onPreviewAuthorDelete: asyncNoop,
  onOpenSettings: noop,
  leftPanel: <div />,
};

describe('MainLayout right panel', () => {
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it('keeps the book memo and reading anchor mounted inside the group when folded', () => {
    const closeComments = vi.fn();
    const panel = <textarea aria-label="예제 책 메모" defaultValue="유지할 초안" />;
    const props = { ...baseProps, bookReadingWorkspace: true, rightPanel: panel, homePanelOpen: false, hasInlinePassageNotes: true, onCloseInlinePassageNotes: closeComments };
    const view = render(<MainLayout {...props} rightPanelOpen><div data-testid="reading-anchor">본문</div></MainLayout>);
    const input = screen.getByRole('textbox', { name: '예제 책 메모' });
    const anchor = screen.getByTestId('reading-anchor');
    const memoScroll = input.closest<HTMLElement>('[data-reading-memo-scroll]')!;
    expect(memoScroll.firstElementChild).toBe(input);
    (input as HTMLTextAreaElement).focus();
    (input as HTMLTextAreaElement).setSelectionRange(3, 3);
    memoScroll.scrollTop = 33;
    fireEvent.scroll(memoScroll);
    expect(input.closest('[data-book-reading-workspace]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '홈 패널 펼치기' }));
    expect(closeComments).not.toHaveBeenCalled();
    view.rerender(<MainLayout {...props} rightPanelOpen={false}><div data-testid="reading-anchor">본문</div></MainLayout>);
    expect(screen.getByTestId('reading-anchor')).toBe(anchor);
    expect(document.querySelector('textarea')).toBe(input);
    expect((input as HTMLTextAreaElement).value).toBe('유지할 초안');
    expect((input as HTMLTextAreaElement).selectionStart).toBe(3);
    expect(memoScroll.scrollTop).toBe(33);
    expect(input.closest('.book-reading-memo')?.getAttribute('data-collapsed')).toBe('true');
    expect(input.closest('.book-reading-memo')?.hasAttribute('aria-hidden')).toBe(false);
    view.rerender(<MainLayout {...props} rightPanelOpen><div data-testid="reading-anchor">본문</div></MainLayout>);
    expect(document.querySelector('textarea')).toBe(input);
    expect((input as HTMLTextAreaElement).selectionStart).toBe(3);
    expect(memoScroll.scrollTop).toBe(33);
  });

  it('retries a clamped memo position after a long book returns and its content grows', async () => {
    const panel = <textarea aria-label="예제 책 메모" />;
    const props = { ...baseProps, bookReadingWorkspace: true, rightPanel: panel, homePanelOpen: false };
    const content = <div data-archive-scroll>본문</div>;
    const view = render(<MainLayout {...props} selectedBookId="book-1">{content}</MainLayout>);
    const primary = document.querySelector<HTMLElement>('[data-archive-scroll]')!;
    const memo = document.querySelector<HTMLElement>('[data-reading-memo-scroll]')!;
    let memoTop = 0;
    let memoMax = 3_000;
    Object.defineProperty(memo, 'scrollTop', {
      configurable: true,
      get: () => memoTop,
      set: value => { memoTop = Math.min(Number(value), memoMax); },
    });
    primary.scrollTop = 120;
    memo.scrollTop = 2_264;
    fireEvent.scroll(primary);
    fireEvent.scroll(memo);

    memoMax = 192;
    view.rerender(<MainLayout {...props} selectedBookId="book-2">{content}</MainLayout>);
    expect(primary.scrollTop).toBe(0);
    expect(memo.scrollTop).toBe(0);
    primary.scrollTop = 45;
    memo.scrollTop = 55;
    fireEvent.scroll(primary);
    fireEvent.scroll(memo);

    view.rerender(<MainLayout {...props} selectedBookId="book-1">{content}</MainLayout>);
    expect(primary.scrollTop).toBe(120);
    expect(memo.scrollTop).toBe(192);
    fireEvent.scroll(memo);
    memoMax = 3_000;
    await act(async () => {
      memo.querySelector('textarea')!.style.height = '2601px';
    });
    expect(memo.scrollTop).toBe(2_264);
  });

  it('collapses home before the book memo and does not reopen either when space returns', () => {
    let width = 700;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      return { left: this.hasAttribute('data-book-column') ? (width - 592) / 2 : 0, width: 0 } as DOMRect;
    });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () {
      return this.tagName === 'MAIN' ? width : 0;
    });
    const changeHome = vi.fn();
    const changeMemo = vi.fn();
    const common = { ...baseProps, hasInlinePassageNotes: true, onHomePanelOpenChange: changeHome, onRightPanelOpenChange: changeMemo, rightPanel: <div>책 메모</div> };
    const { rerender } = render(<MainLayout {...common} homePanelOpen rightPanelOpen><div data-book-column>본문</div></MainLayout>);
    expect(changeHome).toHaveBeenCalledWith(false);
    expect(changeMemo).not.toHaveBeenCalled();
    rerender(<MainLayout {...common} homePanelOpen={false} rightPanelOpen><div data-book-column>본문</div></MainLayout>);
    expect(changeMemo).toHaveBeenCalledWith(false);
    changeHome.mockClear();
    changeMemo.mockClear();
    width = 1400;
    rerender(<MainLayout {...common} homePanelOpen={false} rightPanelOpen={false}><div data-book-column>본문</div></MainLayout>);
    fireEvent(window, new Event('resize'));
    expect(changeHome).not.toHaveBeenCalled();
    expect(changeMemo).not.toHaveBeenCalled();
  });

  it('uses the actual left gutter even when the overall main area is wide', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1400);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 0 } as DOMRect);
    const closeHome = vi.fn();
    render(<MainLayout {...baseProps} homePanelOpen hasInlinePassageNotes onHomePanelOpenChange={closeHome}><div data-book-column>본문</div></MainLayout>);
    expect(closeHome).toHaveBeenCalledWith(false);
  });

  it('resizes both boundaries, clamps at the approved limits, and restores browser widths', () => {
    localStorage.clear();
    const view = render(<MainLayout {...baseProps} rightPanel={<div>메모</div>}><div data-book-column>본문</div></MainLayout>);
    fireEvent.mouseDown(screen.getByRole('separator', { name: '홈 패널 너비 조절' }), { clientX: 272 });
    fireEvent.mouseMove(window, { clientX: 700 });
    fireEvent.mouseUp(window);
    expect(screen.getByRole('separator', { name: '홈 패널 너비 조절' }).getAttribute('aria-valuenow')).toBe('700');
    fireEvent.mouseDown(screen.getByRole('separator', { name: '메모 패널 너비 조절' }), { clientX: window.innerWidth - 320 });
    fireEvent.mouseMove(window, { clientX: window.innerWidth - 500 });
    fireEvent.mouseUp(window);
    expect(localStorage.getItem('rightSidebarWidth')).toBe('500');
    view.unmount();
    render(<MainLayout {...baseProps} rightPanel={<div>메모</div>}><div data-book-column>본문</div></MainLayout>);
    expect(screen.getByRole('separator', { name: '홈 패널 너비 조절' }).getAttribute('aria-valuenow')).toBe('700');
    expect(screen.getByRole('separator', { name: '메모 패널 너비 조절' }).getAttribute('aria-valuenow')).toBe('500');
    fireEvent.mouseDown(screen.getByRole('separator', { name: '홈 패널 너비 조절' }), { clientX: 700 });
    fireEvent.mouseMove(window, { clientX: 2000 });
    expect(screen.getByRole('separator', { name: '홈 패널 너비 조절' }).getAttribute('aria-valuenow')).toBe('960');
    fireEvent.mouseMove(window, { clientX: 10 });
    fireEvent.mouseUp(window);
    expect(localStorage.getItem('leftSidebarWidth')).toBe('232');
    expect(document.body.style.cursor).not.toBe('col-resize');
  });

  it('isolates fixture resize widths from the real profile storage keys', () => {
    localStorage.setItem('leftSidebarWidth', '271');
    localStorage.setItem('rightSidebarWidth', '319');
    localStorage.setItem('bookReadingMemoWidth', '360');
    render(
      <MainLayout
        {...baseProps}
        bookReadingWorkspace
        homePanelOpen={false}
        resizeStorageKeyPrefix="reading-fixture:"
        rightPanel={<div>메모</div>}
      >
        <div data-archive-scroll>본문</div>
      </MainLayout>,
    );

    fireEvent.mouseDown(screen.getByRole('separator', { name: '메모 패널 너비 조절' }), { clientX: 700 });
    fireEvent.mouseMove(window, { clientX: 684 });
    fireEvent.mouseUp(window);

    expect(localStorage.getItem('reading-fixture:bookReadingMemoWidth')).toBe('376');
    expect(localStorage.getItem('leftSidebarWidth')).toBe('271');
    expect(localStorage.getItem('rightSidebarWidth')).toBe('319');
    expect(localStorage.getItem('bookReadingMemoWidth')).toBe('360');
  });

  it('uses the final available width while home is animating closed', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(700);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      return { left: this.hasAttribute('data-book-column') ? 54 : 0, width: 240 } as DOMRect;
    });
    const closeMemo = vi.fn();
    render(<MainLayout {...baseProps} homePanelOpen={false} hasInlinePassageNotes rightPanel={<div>메모</div>} rightPanelOpen onRightPanelOpenChange={closeMemo}><div data-book-column>본문</div></MainLayout>);
    expect(closeMemo).not.toHaveBeenCalled();
  });

  it('closes comments before manually reopening home, but keeps comments when collapsing home', () => {
    const closeComments = vi.fn();
    const changeHome = vi.fn();
    const { rerender } = render(<MainLayout {...baseProps} homePanelOpen={false} hasInlinePassageNotes onCloseInlinePassageNotes={closeComments} onHomePanelOpenChange={changeHome}><div data-book-column>본문</div></MainLayout>);
    fireEvent.click(screen.getByRole('button', { name: '홈 패널 펼치기' }));
    expect(closeComments).toHaveBeenCalledTimes(1);
    expect(changeHome).toHaveBeenCalledWith(true);
    closeComments.mockClear();
    rerender(<MainLayout {...baseProps} homePanelOpen hasInlinePassageNotes onCloseInlinePassageNotes={closeComments} onHomePanelOpenChange={changeHome}><div data-book-column>본문</div></MainLayout>);
    fireEvent.click(screen.getByRole('button', { name: '홈 패널 접기' }));
    expect(closeComments).not.toHaveBeenCalled();
    expect(changeHome).toHaveBeenLastCalledWith(false);
  });

  it('keeps the home panel collapsed across book changes until manually opened', () => {
    function Host({ bookId }: { bookId: string }) {
      const [open, setOpen] = React.useState(true);
      return <MainLayout {...baseProps} selectedBookId={bookId} homePanelOpen={open} onHomePanelOpenChange={setOpen}><div data-book-column>본문</div></MainLayout>;
    }
    const { rerender } = render(<Host bookId="book-1" />);
    fireEvent.click(screen.getByRole('button', { name: '홈 패널 접기' }));
    rerender(<Host bookId="book-2" />);
    expect(screen.getByRole('button', { name: '홈 패널 펼치기' }).getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: '홈 패널 펼치기' }));
    expect(screen.getByRole('button', { name: '홈 패널 접기' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('requests home collapse when comments lack reading space, but not during normal reading', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 0 } as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () {
      return this.tagName === 'MAIN' ? 700 : 0;
    });
    const onChange = vi.fn();
    const { rerender } = render(<MainLayout {...baseProps} homePanelOpen onHomePanelOpenChange={onChange}><div data-book-column>본문</div></MainLayout>);
    expect(onChange).not.toHaveBeenCalled();
    rerender(<MainLayout {...baseProps} homePanelOpen onHomePanelOpenChange={onChange} hasInlinePassageNotes><div data-book-column>본문</div></MainLayout>);
    expect(onChange).toHaveBeenCalledWith(false);
  });
  it('keeps a collapsed panel mounted while removing its width and focus visibility', () => {
    const panel = <div data-testid="right-panel-content">메모</div>;
    const { rerender } = render(
      <MainLayout {...baseProps} rightPanel={panel} rightPanelOpen={false}><div data-book-column>본문</div></MainLayout>
    );
    const referenceWidth = screen.getByRole('main').style.getPropertyValue('--book-reference-width');
    const wrapper = screen.getByTestId('right-panel-content').parentElement!;
    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper.style.width).toBe('0px');

    rerender(<MainLayout {...baseProps} rightPanel={panel} rightPanelOpen><div data-book-column>본문</div></MainLayout>);
    expect(screen.getByRole('main').style.getPropertyValue('--book-reference-width')).toBe(referenceWidth);
    expect(wrapper.getAttribute('aria-hidden')).toBe('false');
    expect(wrapper.style.width).toBe('320px');
  });
});
