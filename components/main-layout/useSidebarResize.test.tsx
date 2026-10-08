import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useSidebarResize } from './useSidebarResize';

describe('useSidebarResize', () => {
  afterEach(() => localStorage.clear());

  it('stores source widths while drag movement uses the displayed scale', () => {
    const view = renderHook(() => useSidebarResize('responsive:'));
    act(() => view.result.current.startLeftResize({ clientX: 0 }, 2));
    fireEvent.mouseMove(window, { clientX: 40 });
    fireEvent.mouseUp(window);
    expect(view.result.current.leftWidthPreference).toBe(292);
    expect(localStorage.getItem('responsive:leftSidebarWidth')).toBe('292');
    view.unmount();

    const restored = renderHook(() => useSidebarResize('responsive:'));
    expect(restored.result.current.leftWidthPreference).toBe(292);
    expect(restored.result.current.leftWidth).toBe(292);
  });

  it('converts library keyboard display deltas without accumulating responsive scale', () => {
    const { result } = renderHook(() => useSidebarResize('responsive:'));
    act(() => result.current.adjustLeftWidth(16, 2));
    expect(result.current.leftWidthPreference).toBe(280);
    act(() => result.current.adjustLeftWidth(-16, 2));
    expect(result.current.leftWidthPreference).toBe(272);
    expect(localStorage.getItem('responsive:leftSidebarWidth')).toBe('272');
  });

  it('preserves the legacy right panel drag direction and storage key', () => {
    const legacy = renderHook(() => useSidebarResize('responsive:'));
    act(() => legacy.result.current.startRightResize({ clientX: 0 }));
    fireEvent.mouseMove(window, { clientX: -40 });
    fireEvent.mouseUp(window);
    expect(legacy.result.current.rightWidth).toBe(360);
    expect(localStorage.getItem('responsive:rightSidebarWidth')).toBe('360');
    expect(localStorage.getItem('responsive:bookReadingMemoWidth')).toBeNull();
  });

  it('starts resizing from the visible limit without overwriting the stored preference before interaction', () => {
    localStorage.setItem('responsive:leftSidebarWidth', '900');
    const { result } = renderHook(() => useSidebarResize('responsive:'));
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
