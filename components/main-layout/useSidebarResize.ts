import { useEffect, useRef, useState } from 'react';

export const PANEL_MIN = 232;
export const PANEL_MAX = 960;
type WidthBounds = { min: number; max: number };
const DEFAULT_BOUNDS: WidthBounds = { min: PANEL_MIN, max: PANEL_MAX };
const clamp = (width: number, bounds = DEFAULT_BOUNDS) => Math.min(bounds.max, Math.max(bounds.min, width));

const usePanelResize = (key: string, fallback: number, right = false) => {
  const [sourceWidth, setSourceWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(key) || fallback);
      return Number.isFinite(saved) ? clamp(saved) : fallback;
    } catch { return fallback; }
  });
  const dragStart = useRef({ x: 0, width: fallback, scale: 1, bounds: DEFAULT_BOUNDS });
  const [resizing, setResizing] = useState(false);
  useEffect(() => {
    if (resizing) return;
    try { localStorage.setItem(key, String(sourceWidth)); } catch { /* Resizing still works when browser storage is unavailable. */ }
  }, [key, resizing, sourceWidth]);
  useEffect(() => {
    if (!resizing) return;
    const oldCursor = document.body.style.cursor;
    const oldSelect = document.body.style.userSelect;
    const move = (event: MouseEvent) => setSourceWidth(clamp(dragStart.current.width + (event.clientX - dragStart.current.x) * (right ? -1 : 1) / dragStart.current.scale, dragStart.current.bounds));
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
  return {
    sourceWidth,
    resizing,
    start: (event?: { clientX: number }, displayScale = 1, bounds = DEFAULT_BOUNDS) => {
      dragStart.current = { x: event?.clientX ?? 0, width: clamp(sourceWidth, bounds), scale: Math.max(displayScale, 0.01), bounds };
      setResizing(true);
    },
    adjust: (displayDelta: number, displayScale = 1, bounds = DEFAULT_BOUNDS) => setSourceWidth(previous => clamp(clamp(previous, bounds) + displayDelta / Math.max(displayScale, 0.01), bounds)),
  };
};

export const useSidebarResize = (storageKeyPrefix = '') => {
  const left = usePanelResize(`${storageKeyPrefix}leftSidebarWidth`, 272);
  const right = usePanelResize(`${storageKeyPrefix}rightSidebarWidth`, 320, true);
  return {
    leftWidth: left.sourceWidth, leftWidthPreference: left.sourceWidth, isResizingLeft: left.resizing, startLeftResize: left.start, adjustLeftWidth: left.adjust,
    rightWidth: right.sourceWidth, rightWidthPreference: right.sourceWidth, isResizingRight: right.resizing, startRightResize: right.start, adjustRightWidth: right.adjust,
  };
};
