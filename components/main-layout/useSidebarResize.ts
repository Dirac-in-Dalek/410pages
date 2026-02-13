import { useCallback, useEffect, useState } from 'react';

const LEFT_MIN = 160;
const LEFT_MAX = 264;
const RIGHT_INIT_MIN = 180;
const RIGHT_RESIZE_MIN = 200;
const RIGHT_MAX = 320;
const DEFAULT_LEFT = 264;
const DEFAULT_RIGHT = 320;

const readStoredWidth = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  const parsed = raw ? parseInt(raw, 10) : fallback;
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
};

export const useSidebarResize = () => {
  const [leftWidth, setLeftWidth] = useState(() => {
    const width = readStoredWidth('leftSidebarWidth', DEFAULT_LEFT);
    return Math.min(Math.max(width, LEFT_MIN), LEFT_MAX);
  });

  const [rightWidth, setRightWidth] = useState(() => {
    const width = readStoredWidth('rightSidebarWidth', DEFAULT_RIGHT);
    return Math.min(Math.max(width, RIGHT_INIT_MIN), RIGHT_MAX);
  });

  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizingLeft) {
      const newWidth = e.clientX;
      if (newWidth >= LEFT_MIN && newWidth <= LEFT_MAX) {
        setLeftWidth(newWidth);
      }
    } else if (isResizingRight) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= RIGHT_RESIZE_MIN && newWidth <= RIGHT_MAX) {
        setRightWidth(newWidth);
      }
    }
  }, [isResizingLeft, isResizingRight]);

  const handleMouseUp = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
  }, []);

  useEffect(() => {
    if (isResizingLeft || isResizingRight) return;
    localStorage.setItem('leftSidebarWidth', leftWidth.toString());
    localStorage.setItem('rightSidebarWidth', rightWidth.toString());
  }, [isResizingLeft, isResizingRight, leftWidth, rightWidth]);

  useEffect(() => {
    if (isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight, handleMouseMove, handleMouseUp]);

  return {
    leftWidth,
    rightWidth,
    isResizingLeft,
    isResizingRight,
    startLeftResize: () => setIsResizingLeft(true),
    startRightResize: () => setIsResizingRight(true)
  };
};
