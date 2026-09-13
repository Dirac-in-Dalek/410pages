import { RefObject, useCallback, useEffect, useMemo, useState } from 'react';

const LEFT_MIN = 160;
const LEFT_MAX = 320;
const LEFT_DEFAULT = 232;
const LEFT_COLLAPSED = 44;

const RIGHT_MIN = 320;
const RIGHT_MAX = 560;
const RIGHT_DEFAULT = 380;

const CENTER_MIN = 540;

type ResizeSide = 'left' | 'right' | null;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const readStoredNumber = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  const parsed = raw ? Number.parseInt(raw, 10) : fallback;
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const readStoredBoolean = (key: string, fallback: boolean) => {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
};

const calculateDynamicMaxLeft = (containerWidth: number, rightWidth: number) =>
  Math.min(LEFT_MAX, Math.max(LEFT_MIN, containerWidth - rightWidth - CENTER_MIN));

const calculateDynamicMaxRight = (containerWidth: number, leftPaneWidth: number) =>
  Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, containerWidth - leftPaneWidth - CENTER_MIN));

export const useReaderPaneLayout = (containerRef: RefObject<HTMLElement>) => {
  const [leftWidth, setLeftWidth] = useState(() => clamp(readStoredNumber('readerLeftPaneWidth', LEFT_DEFAULT), LEFT_MIN, LEFT_MAX));
  const [rightWidth, setRightWidth] = useState(() =>
    clamp(readStoredNumber('readerRightPaneWidth', RIGHT_DEFAULT), RIGHT_MIN, RIGHT_MAX)
  );
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(() =>
    readStoredBoolean('readerLeftPaneCollapsed', false)
  );
  const [activeResize, setActiveResize] = useState<ResizeSide>(null);

  const leftPaneWidth = useMemo(() => (isLeftCollapsed ? LEFT_COLLAPSED : leftWidth), [isLeftCollapsed, leftWidth]);

  const startLeftResize = useCallback(() => {
    setIsLeftCollapsed(false);
    setActiveResize('left');
  }, []);

  const startRightResize = useCallback(() => {
    setActiveResize('right');
  }, []);

  const toggleLeftCollapse = useCallback(() => {
    setIsLeftCollapsed((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!activeResize) return;

    const handleMouseMove = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;

      if (activeResize === 'left') {
        const dynamicMaxLeft = calculateDynamicMaxLeft(rect.width, rightWidth);
        setLeftWidth(clamp(event.clientX - rect.left, LEFT_MIN, dynamicMaxLeft));
        return;
      }

      const dynamicMaxRight = calculateDynamicMaxRight(rect.width, isLeftCollapsed ? LEFT_COLLAPSED : leftWidth);
      setRightWidth(clamp(rect.right - event.clientX, RIGHT_MIN, dynamicMaxRight));
    };

    const handleMouseUp = () => {
      setActiveResize(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [activeResize, containerRef, isLeftCollapsed, leftWidth, rightWidth]);

  useEffect(() => {
    if (activeResize) return;
    if (typeof window === 'undefined') return;

    window.localStorage.setItem('readerLeftPaneWidth', String(leftWidth));
    window.localStorage.setItem('readerRightPaneWidth', String(rightWidth));
    window.localStorage.setItem('readerLeftPaneCollapsed', String(isLeftCollapsed));
  }, [activeResize, isLeftCollapsed, leftWidth, rightWidth]);

  useEffect(() => {
    const normalizeWidths = () => {
      const container = containerRef.current;
      if (!container) return;
      const width = container.clientWidth;
      if (width <= 0) return;

      setLeftWidth((prev) => {
        const maxLeft = calculateDynamicMaxLeft(width, rightWidth);
        return clamp(prev, LEFT_MIN, maxLeft);
      });

      setRightWidth((prev) => {
        const maxRight = calculateDynamicMaxRight(width, isLeftCollapsed ? LEFT_COLLAPSED : leftWidth);
        return clamp(prev, RIGHT_MIN, maxRight);
      });
    };

    normalizeWidths();
    window.addEventListener('resize', normalizeWidths);
    return () => window.removeEventListener('resize', normalizeWidths);
  }, [containerRef, isLeftCollapsed, leftWidth, rightWidth]);

  return {
    leftPaneWidth,
    rightWidth,
    isLeftCollapsed,
    isResizingLeft: activeResize === 'left',
    isResizingRight: activeResize === 'right',
    startLeftResize,
    startRightResize,
    toggleLeftCollapse
  };
};
