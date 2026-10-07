import React from 'react';
import { getBookReadingColumns, getReadingBodyWidth } from './bookReadingColumns';
import { attachReadingScrollVisibility } from './readingScrollVisibility';

type Props = {
  bookId: string;
  children: React.ReactNode;
  memo: React.ReactNode;
  memoOpen: boolean;
  memoWidth: number;
  resizing: boolean;
  onStartResize: (event: { clientX: number }) => void;
  onAdjustWidth: (delta: number) => void;
  scrollPositions: Map<string, { primary: number; memo: number }>;
};

export function BookReadingWorkspace({ bookId, children, memo, memoOpen, memoWidth, resizing, onStartResize, onAdjustWidth, scrollPositions }: Props) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const groupRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const host = hostRef.current, group = groupRef.current;
    if (!host || !group) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = host.getBoundingClientRect();
        const contentLeft = rect.left + 24;
        const memoScroll = group.querySelector<HTMLElement>('[data-reading-memo-scroll]');
        const memoChrome = 10 + Math.max(0, (memoScroll?.offsetWidth ?? 0) - (memoScroll?.clientWidth ?? 0));
        const columns = getBookReadingColumns({ left: contentLeft, right: rect.right - 24, center: window.innerWidth / 2 }, memoWidth, getReadingBodyWidth(), memoChrome);
        for (const [key, value] of Object.entries(columns)) group.style.setProperty(`--reading-${key}-width`, `${value}px`);
        group.style.setProperty('--reading-group-left', `${columns.groupLeft - contentLeft}px`);
        group.style.setProperty('--reading-body-left', `${columns.bodyLeft}px`);
        const scroll = group.querySelector<HTMLElement>('[data-archive-scroll]');
        if (scroll) group.style.setProperty('--reading-scrollbar-width', `${Math.max(0, scroll.offsetWidth - scroll.clientWidth)}px`);
      });
    };
    const sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    sizes?.observe(host);
    const preferences = new MutationObserver(measure);
    preferences.observe(document.documentElement, { attributes: true });
    measure();
    return () => { cancelAnimationFrame(frame); sizes?.disconnect(); preferences.disconnect(); };
  }, [memoWidth]);

  React.useLayoutEffect(() => {
    const group = groupRef.current;
    const primary = group?.querySelector<HTMLElement>('[data-archive-scroll]');
    const memoScroll = group?.querySelector<HTMLElement>('[data-reading-memo-scroll]');
    if (!primary || !memoScroll) return;
    primary.setAttribute('data-reading-scrollbar', '');
    memoScroll.setAttribute('data-reading-scrollbar', '');
    const cleanups = [attachReadingScrollVisibility(primary), attachReadingScrollVisibility(memoScroll)];
    return () => {
      cleanups.forEach(cleanup => cleanup());
      primary.removeAttribute('data-reading-scrollbar');
      memoScroll.removeAttribute('data-reading-scrollbar');
    };
  }, []);

  React.useLayoutEffect(() => {
    const group = groupRef.current;
    const primary = group?.querySelector<HTMLElement>('[data-archive-scroll]');
    const memoScroll = group?.querySelector<HTMLElement>('[data-reading-memo-scroll]');
    if (!primary || !memoScroll) return;
    const desired = scrollPositions.get(bookId) ?? { primary: 0, memo: 0 };
    const last = { ...desired };
    const pending = { primary: true, memo: true };
    const persist = () => scrollPositions.set(bookId, { ...last });
    const restore = () => {
      for (const [key, element] of [['primary', primary], ['memo', memoScroll]] as const) {
        if (!pending[key]) continue;
        const memoPanel = key === 'memo' ? memoScroll.querySelector<HTMLElement>('[data-book-memo-panel]') : null;
        if (memoPanel && memoPanel.dataset.bookMemoId !== bookId) continue;
        element.scrollTop = desired[key];
        if (Math.abs(element.scrollTop - desired[key]) < 1) {
          pending[key] = false;
          last[key] = element.scrollTop;
          persist();
        }
      }
    };
    const rememberPrimary = () => {
      if (pending.primary) return;
      last.primary = primary.scrollTop;
      persist();
    };
    const rememberMemo = () => {
      if (pending.memo) return;
      last.memo = memoScroll.scrollTop;
      persist();
    };
    const cancelPrimaryRestore = () => { pending.primary = false; rememberPrimary(); };
    const cancelMemoRestore = () => { pending.memo = false; rememberMemo(); };
    primary.addEventListener('scroll', rememberPrimary);
    memoScroll.addEventListener('scroll', rememberMemo);
    for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
      primary.addEventListener(event, cancelPrimaryRestore);
      memoScroll.addEventListener(event, cancelMemoRestore);
    }
    const changes = new MutationObserver(restore);
    changes.observe(group, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'data-book-memo-id'] });
    const sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(restore);
    sizes?.observe(primary);
    sizes?.observe(memoScroll);
    const memoInput = memoScroll.querySelector('textarea');
    if (memoInput) sizes?.observe(memoInput);
    window.addEventListener('resize', restore);
    document.fonts?.addEventListener('loadingdone', restore);
    restore();
    return () => {
      primary.removeEventListener('scroll', rememberPrimary);
      memoScroll.removeEventListener('scroll', rememberMemo);
      for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
        primary.removeEventListener(event, cancelPrimaryRestore);
        memoScroll.removeEventListener(event, cancelMemoRestore);
      }
      changes.disconnect();
      sizes?.disconnect();
      window.removeEventListener('resize', restore);
      document.fonts?.removeEventListener('loadingdone', restore);
      persist();
    };
  }, [bookId, scrollPositions]);

  return <div ref={hostRef} className="book-reading-host">
    <div ref={groupRef} data-book-reading-workspace className="book-reading-workspace">
      <div className="book-reading-primary">{children}</div>
      <div className="book-reading-memo" data-collapsed={!memoOpen || undefined}>
        <div data-reading-memo-scroll data-passage-note-trigger className="book-reading-memo-scroll">
          {memo}
        </div>
        <div role="separator" aria-label="메모 패널 너비 조절" aria-orientation="vertical" aria-valuemin={232} aria-valuemax={960} aria-valuenow={memoWidth} tabIndex={memoOpen ? 0 : -1}
          data-passage-note-trigger data-resizing={resizing}
          onMouseDown={onStartResize}
          onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onAdjustWidth(event.key === 'ArrowLeft' ? 16 : -16); } }}
          className="book-reading-memo-resize" />
      </div>
    </div>
  </div>;
}
