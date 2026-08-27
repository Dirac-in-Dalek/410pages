import { useCallback, useEffect, useState } from 'react';

const LEFT_MIN = 232;
const LEFT_MAX = 320;
const DEFAULT_LEFT = 272;

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

  const [isResizingLeft, setIsResizingLeft] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const newWidth = e.clientX;
    if (isResizingLeft && newWidth >= LEFT_MIN && newWidth <= LEFT_MAX) {
      setLeftWidth(newWidth);
    }
  }, [isResizingLeft]);

  const handleMouseUp = useCallback(() => {
    setIsResizingLeft(false);
  }, []);

  useEffect(() => {
    if (isResizingLeft) return;
    localStorage.setItem('leftSidebarWidth', leftWidth.toString());
  }, [isResizingLeft, leftWidth]);

  useEffect(() => {
    if (isResizingLeft) {
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
  }, [isResizingLeft, handleMouseMove, handleMouseUp]);

  return {
    leftWidth,
    isResizingLeft,
    startLeftResize: () => setIsResizingLeft(true),
  };
};
