import React from 'react';
import { attachReadingScrollVisibility } from './readingScrollVisibility';

export type ReadingScrollPosition = {
  primary: number;
  memo: number;
  anchor?: { id: string; offset: number };
};

type Props = {
  bookId: string;
  children: React.ReactNode;
  memo: React.ReactNode;
  memoOpen: boolean;
  memoPanelId: string;
  scrollPositions: Map<string, ReadingScrollPosition>;
};

export function BookReadingWorkspace({ bookId, children, memo, memoOpen, memoPanelId, scrollPositions }: Props) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const groupRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const host = hostRef.current, group = groupRef.current;
    if (!host || !group) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scroll = group.querySelector<HTMLElement>('[data-archive-scroll]');
        if (scroll) group.style.setProperty('--reading-scrollbar-width', `${Math.max(0, scroll.offsetWidth - scroll.clientWidth)}px`);
      });
    };
    const sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    sizes?.observe(host);
    const primary = group.querySelector<HTMLElement>('[data-archive-scroll]');
    if (primary) sizes?.observe(primary);
    const preferences = new MutationObserver(measure);
    preferences.observe(document.documentElement, { attributes: true });
    measure();
    return () => { cancelAnimationFrame(frame); sizes?.disconnect(); preferences.disconnect(); };
  }, []);

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
    const stored = scrollPositions.get(bookId) ?? { primary: 0, memo: 0 };
    const desired: ReadingScrollPosition = stored.primary <= 1 ? { ...stored, anchor: undefined } : stored;
    const last: ReadingScrollPosition = { ...desired };
    const pending = { primary: true, memo: true };
    const anchorBox = (row: HTMLElement) => row.querySelector<HTMLElement>('[data-row-content]') ?? row;
    const captureAnchor = () => {
      if (primary.scrollTop <= 1) return undefined;
      const viewport = primary.getBoundingClientRect();
      const rows = (Array.from(primary.querySelectorAll('[data-book-row]')) as HTMLElement[])
        .filter(row => !row.hidden && anchorBox(row).getClientRects().length > 0);
      const row = rows.find(candidate => anchorBox(candidate).getBoundingClientRect().bottom > viewport.top + 1) ?? rows.at(-1);
      if (!row?.dataset.bookRow) return undefined;
      return { id: row.dataset.bookRow, offset: anchorBox(row).getBoundingClientRect().top - viewport.top };
    };
    const restorePrimary = () => {
      if (!desired.anchor) {
        primary.scrollTop = desired.primary;
        return Math.abs(primary.scrollTop - desired.primary) < 1;
      }
      const row = (Array.from(primary.querySelectorAll('[data-book-row]')) as HTMLElement[])
        .find(candidate => candidate.dataset.bookRow === desired.anchor?.id && anchorBox(candidate).getClientRects().length > 0);
      if (!row) return false;
      const viewport = primary.getBoundingClientRect();
      const delta = anchorBox(row).getBoundingClientRect().top - viewport.top - desired.anchor.offset;
      primary.scrollTop += delta;
      return Math.abs(delta) < 1;
    };
    const persist = () => scrollPositions.set(bookId, { ...last });
    const stabilizePrimaryAnchor = () => {
      if (!last.anchor) return;
      const row = (Array.from(primary.querySelectorAll('[data-book-row]')) as HTMLElement[])
        .find(candidate => candidate.dataset.bookRow === last.anchor?.id && anchorBox(candidate).getClientRects().length > 0);
      if (!row) return;
      const viewport = primary.getBoundingClientRect();
      const delta = anchorBox(row).getBoundingClientRect().top - viewport.top - last.anchor.offset;
      if (Math.abs(delta) < 1) return;
      primary.scrollTop += delta;
      last.primary = primary.scrollTop;
      persist();
    };
    const restore = () => {
      for (const [key, element] of [['primary', primary], ['memo', memoScroll]] as const) {
        if (!pending[key]) continue;
        const memoPanel = key === 'memo' ? memoScroll.querySelector<HTMLElement>('[data-book-memo-panel]') : null;
        if (memoPanel && memoPanel.dataset.bookMemoId !== bookId) continue;
        const restored = key === 'primary'
          ? restorePrimary()
          : (element.scrollTop = desired[key], Math.abs(element.scrollTop - desired[key]) < 1);
        if (restored) {
          pending[key] = false;
          last[key] = element.scrollTop;
          if (key === 'primary') last.anchor = captureAnchor();
          persist();
        }
      }
      if (!pending.primary) stabilizePrimaryAnchor();
    };
    const rememberPrimary = () => {
      if (pending.primary) return;
      last.primary = primary.scrollTop;
      last.anchor = captureAnchor();
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
    const responsiveScope = group.closest<HTMLElement>('[data-reading-responsive]');
    const responsiveChanges = new MutationObserver(restore);
    if (responsiveScope) responsiveChanges.observe(responsiveScope, { attributes: true, attributeFilter: ['style'] });
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
      responsiveChanges.disconnect();
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
        <div id={memoPanelId} data-reading-memo-slide aria-hidden={!memoOpen} inert={!memoOpen} className="book-reading-memo-slide">
          <div data-reading-memo-scroll data-passage-note-trigger className="book-reading-memo-scroll">
            {memo}
          </div>
        </div>
      </div>
    </div>
  </div>;
}
