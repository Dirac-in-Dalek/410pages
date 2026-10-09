import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { UserPreferences } from '../contract/userPreferences';
import { usePreferencePersistence } from './usePreferencePersistence';

const save = vi.hoisted(() => vi.fn());
vi.mock('./preferencesServer', () => ({ persistServerPreferences: save }));
const preferences: UserPreferences = {
  theme: 'day',
  fontFamily: 'pretendard',
  baseFontPt: 12,
  citationWidthRem: 44,
};
const flushDebounce = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(301);
  });

beforeEach(() => {
  vi.useFakeTimers();
  save.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('shows a failed save and retries the current settings successfully', async () => {
  save.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
  const { result } = renderHook(() => usePreferencePersistence('first', 'first', preferences));
  await flushDebounce();
  expect(result.current.saveError).toBeTruthy();
  act(() => result.current.retrySave());
  await flushDebounce();
  expect(save).toHaveBeenCalledTimes(2);
  expect(save).toHaveBeenLastCalledWith('first', preferences);
  expect(result.current.saveError).toBeNull();
});

it('continues with the latest queued settings after an earlier save fails', async () => {
  let reject!: (error: Error) => void;
  save
    .mockImplementationOnce(
      () =>
        new Promise<void>((_, fail) => {
          reject = fail;
        })
    )
    .mockResolvedValue(undefined);
  const { result, rerender } = renderHook(({ value }) => usePreferencePersistence('first', 'first', value), {
    initialProps: { value: preferences },
  });
  await flushDebounce();
  const latest = { ...preferences, baseFontPt: 20 };
  rerender({ value: latest });
  await flushDebounce();
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () => {
    reject(new Error('timeout'));
  });
  expect(save).toHaveBeenCalledTimes(2);
  expect(save).toHaveBeenLastCalledWith('first', latest);
  expect(result.current.saveError).toBeNull();
});

it('discards queued writes for an account that has signed out', async () => {
  let finish!: () => void;
  save
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    )
    .mockResolvedValue(undefined);
  const { rerender } = renderHook(({ user, value }) => usePreferencePersistence(user, user, value), {
    initialProps: { user: 'first', value: preferences },
  });
  await flushDebounce();
  rerender({ user: 'first', value: { ...preferences, baseFontPt: 16 } });
  await flushDebounce();
  const second = { ...preferences, baseFontPt: 22 };
  rerender({ user: 'second', value: second });
  await flushDebounce();
  await act(async () => {
    finish();
  });
  expect(save.mock.calls).toEqual([
    ['first', preferences],
    ['second', second],
  ]);
});
