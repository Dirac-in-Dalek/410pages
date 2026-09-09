import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
