import { afterEach, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { cleanup, renderHook } from '@testing-library/react';
import {
  getBrowserStorage,
  readStorageItem,
  safeGetStorageItem,
  safeSetStorageItem,
  safeRemoveStorageItem,
} from './browserStorage';
import { useReaderPaneLayout } from '../../features/reader/logic/useReaderPaneLayout';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

it('distinguishes missing values from a failed read and keeps local/session storage separate', () => {
  expect(readStorageItem('draft')).toEqual({ ok: true, value: null });
  expect(safeSetStorageItem('draft', '')).toBe(true);
  expect(safeGetStorageItem('draft')).toBe('');
  const session = getBrowserStorage('sessionStorage');
  safeSetStorageItem('draft', 'session', session);
  expect(safeGetStorageItem('draft', session)).toBe('session');
  expect(safeGetStorageItem('draft')).toBe('');
  expect(safeRemoveStorageItem('draft', session)).toBe(true);
  expect(safeGetStorageItem('draft', session)).toBeNull();
});

it('handles a blocked storage getter and leaves the PDF panels usable', () => {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError');
  });
  expect(readStorageItem('draft')).toEqual({ ok: false, value: null });
  expect(safeGetStorageItem('draft')).toBeNull();
  expect(safeSetStorageItem('draft', 'new')).toBe(false);
  expect(safeRemoveStorageItem('draft')).toBe(false);
  const { result } = renderHook(() => useReaderPaneLayout(createRef<HTMLDivElement>()));
  expect(result.current.leftPaneWidth).toBe(232);
  expect(result.current.rightWidth).toBe(380);
});

it('reports quota failures without replacing the previous saved value', () => {
  safeSetStorageItem('draft', 'saved');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError');
  });
  expect(safeSetStorageItem('draft', 'unsaved')).toBe(false);
  expect(safeGetStorageItem('draft')).toBe('saved');
});

it('works without a browser window', () => {
  vi.stubGlobal('window', undefined);
  expect(safeGetStorageItem('draft')).toBeNull();
  expect(safeSetStorageItem('draft', 'new')).toBe(false);
  expect(safeRemoveStorageItem('draft')).toBe(false);
});
