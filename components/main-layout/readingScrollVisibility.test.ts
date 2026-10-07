import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachReadingScrollVisibility } from './readingScrollVisibility';

describe('reading scrollbars', () => {
  afterEach(() => vi.useRealTimers());

  it('shows only after user-driven scrolling and hides 700ms after scrolling stops', () => {
    vi.useFakeTimers();
    const element = document.createElement('div');
    const cleanup = attachReadingScrollVisibility(element);

    element.dispatchEvent(new Event('scroll'));
    expect(element.hasAttribute('data-scrolling')).toBe(false);
    element.dispatchEvent(new WheelEvent('wheel'));
    element.dispatchEvent(new Event('scroll'));
    expect(element.dataset.scrolling).toBe('true');
    vi.advanceTimersByTime(699);
    expect(element.dataset.scrolling).toBe('true');
    vi.advanceTimersByTime(1);
    expect(element.hasAttribute('data-scrolling')).toBe(false);

    element.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(700);
    element.dispatchEvent(new Event('scroll'));
    expect(element.hasAttribute('data-scrolling')).toBe(false);

    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    element.dispatchEvent(new Event('scroll'));
    expect(element.hasAttribute('data-scrolling')).toBe(false);
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }));
    element.dispatchEvent(new Event('scroll'));
    expect(element.dataset.scrolling).toBe('true');
    cleanup();
    expect(element.hasAttribute('data-scrolling')).toBe(false);
  });
});
