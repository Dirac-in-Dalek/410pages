import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useResponsiveMode } from './useResponsiveMode';

let viewportWidth = 1024;
let coarsePointer = false;

beforeEach(() => {
  viewportWidth = 1024;
  coarsePointer = false;
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    media: query,
    get matches() {
      if (query.includes('pointer: coarse')) return coarsePointer;
      const limit = Number(query.match(/([\d.]+)px/)?.[1]);
      return query.includes('min-width') ? viewportWidth >= limit : viewportWidth <= limit;
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([
  [375, false, true],
  [1023, false, true],
  [1023.5, false, true],
  [1024, false, false],
  [1025, false, false],
  [1023, true, true],
  [1024, true, false],
  [1280, true, false],
] as const)('uses the width boundary at %spx with coarse pointer %s', (width, coarse, mobile) => {
  viewportWidth = width;
  coarsePointer = coarse;
  const { result } = renderHook(() => useResponsiveMode());
  expect(result.current.isMobileApp).toBe(mobile);
});

it('switches both ways when the viewport crosses 1024px', () => {
  const { result } = renderHook(() => useResponsiveMode());
  expect(result.current.isMobileApp).toBe(false);
  act(() => {
    viewportWidth = 1023;
    window.dispatchEvent(new Event('resize'));
  });
  expect(result.current.isMobileApp).toBe(true);
  act(() => {
    viewportWidth = 1024;
    window.dispatchEvent(new Event('resize'));
  });
  expect(result.current.isMobileApp).toBe(false);
});
