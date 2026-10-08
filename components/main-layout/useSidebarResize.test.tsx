import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useSidebarResize } from './useSidebarResize';

describe('useSidebarResize', () => {
  afterEach(() => localStorage.clear());

  it('stores source widths while drag movement uses the displayed scale', () => {
    const view = renderHook(() => useSidebarResize(true, 'responsive:'));
    act(() => view.result.current.startLeftResize({ clientX: 0 }, 2));
    fireEvent.mouseMove(window, { clientX: 40 });
    fireEvent.mouseUp(window);
    expect(view.result.current.leftWidthPreference).toBe(292);
    expect(localStorage.getItem('responsive:leftSidebarWidth')).toBe('292');
    view.unmount();

    const restored = renderHook(() => useSidebarResize(true, 'responsive:'));
    expect(restored.result.current.leftWidthPreference).toBe(292);
    expect(restored.result.current.leftWidth).toBe(292);
  });

  it('converts keyboard display deltas without accumulating responsive scale', () => {
    const { result } = renderHook(() => useSidebarResize(true, 'responsive:'));
    act(() => result.current.adjustRightWidth(16, 2));
    expect(result.current.rightWidthPreference).toBe(368);
    act(() => result.current.adjustRightWidth(-16, 2));
    expect(result.current.rightWidthPreference).toBe(360);
    expect(localStorage.getItem('responsive:bookReadingMemoWidth')).toBe('360');
  });

  it('follows the reading memo right edge while preserving the legacy right panel direction', () => {
    const reading = renderHook(() => useSidebarResize(true, 'responsive:'));
    act(() => reading.result.current.startRightResize({ clientX: 0 }, 2));
    fireEvent.mouseMove(window, { clientX: 40 });
    fireEvent.mouseUp(window);
    expect(reading.result.current.rightWidthPreference).toBe(380);
    reading.unmount();

    const legacy = renderHook(() => useSidebarResize(false, 'responsive:'));
    act(() => legacy.result.current.startRightResize({ clientX: 0 }));
    fireEvent.mouseMove(window, { clientX: -40 });
    fireEvent.mouseUp(window);
    expect(legacy.result.current.rightWidthPreference).toBe(360);
  });

  it('starts resizing from the visible limit without overwriting the stored preference before interaction', () => {
    localStorage.setItem('responsive:leftSidebarWidth', '900');
    const { result } = renderHook(() => useSidebarResize(true, 'responsive:'));
    const bounds = { min: 232, max: 300 };
    expect(result.current.leftWidthPreference).toBe(900);
    act(() => result.current.startLeftResize({ clientX: 0 }, 1, bounds));
    fireEvent.mouseMove(window, { clientX: -10 });
    fireEvent.mouseUp(window);
    expect(result.current.leftWidthPreference).toBe(290);
    act(() => result.current.adjustLeftWidth(100, 1, bounds));
    expect(result.current.leftWidthPreference).toBe(300);
  });
});
