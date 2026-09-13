import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useAppViewMode } from './useAppViewMode';

const deferredModule = vi.hoisted(() => {
  let resolve: (module: { PdfReaderPage: () => null }) => void;
  const promise = new Promise<{ PdfReaderPage: () => null }>(done => { resolve = done; });
  return { promise, resolve: (module: { PdfReaderPage: () => null }) => resolve(module) };
});
vi.mock('../../features/reader/logic/loadPdfReader', () => ({ loadPdfReader: () => deferredModule.promise }));

it('cancels a pending PDF open on browser navigation and leaves an open PDF on the next navigation', async () => {
  const { result } = renderHook(() => useAppViewMode({ isMobileApp: false }));
  let pending: unknown;
  act(() => { pending = result.current.openReader(); });
  expect(result.current.readerLoading).toBe(true);
  expect(result.current.viewMode).toBe('archive');
  act(() => window.dispatchEvent(new PopStateEvent('popstate')));
  await act(async () => { deferredModule.resolve({ PdfReaderPage: () => null }); await pending; });
  expect(result.current.viewMode).toBe('archive');
  expect(result.current.readerLoading).toBe(false);
  await act(async () => { await result.current.openReader(); });
  expect(result.current.viewMode).toBe('reader');
  act(() => window.dispatchEvent(new PopStateEvent('popstate')));
  expect(result.current.viewMode).toBe('archive');
});

it('does not enter the PDF reader on mobile', async () => {
  const { result } = renderHook(() => useAppViewMode({ isMobileApp: true }));
  await act(async () => { await result.current.openReader(); });
  expect(result.current.Reader).toBeNull();
  expect(result.current.viewMode).toBe('archive');
});
