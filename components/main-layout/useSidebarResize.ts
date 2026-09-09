import { useEffect, useRef, useState } from 'react';

export const PANEL_MIN = 232;
export const PANEL_MAX = 960;
const clamp = (width: number) => Math.min(PANEL_MAX, Math.max(PANEL_MIN, width));

const usePanelResize = (key: string, fallback: number, right = false) => {
  const [width, setWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(key) || fallback);
      return Number.isFinite(saved) ? clamp(saved) : fallback;
    } catch { return fallback; }
  });
  const dragStart = useRef({ x: 0, width: fallback });
  const [resizing, setResizing] = useState(false);
  useEffect(() => {
    if (resizing) return;
    try { localStorage.setItem(key, String(width)); } catch { /* Resizing still works when browser storage is unavailable. */ }
  }, [key, resizing, width]);
  useEffect(() => {
    if (!resizing) return;
    const oldCursor = document.body.style.cursor;
    const oldSelect = document.body.style.userSelect;
    const move = (event: MouseEvent) => setWidth(clamp(dragStart.current.width + (event.clientX - dragStart.current.x) * (right ? -1 : 1)));
    const end = () => setResizing(false);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    window.addEventListener('blur', end);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      window.removeEventListener('blur', end);
      document.body.style.cursor = oldCursor;
      document.body.style.userSelect = oldSelect;
    };
  }, [resizing, right]);
  return { width, resizing, start: (event?: { clientX: number }) => { dragStart.current = { x: event?.clientX ?? 0, width }; setResizing(true); }, adjust: (delta: number) => setWidth(previous => clamp(previous + delta)) };
};

export const useSidebarResize = () => {
  const left = usePanelResize('leftSidebarWidth', 272);
  const right = usePanelResize('rightSidebarWidth', 320, true);
  return {
    leftWidth: left.width, isResizingLeft: left.resizing, startLeftResize: left.start, adjustLeftWidth: left.adjust,
    rightWidth: right.width, isResizingRight: right.resizing, startRightResize: right.start, adjustRightWidth: right.adjust,
  };
};
