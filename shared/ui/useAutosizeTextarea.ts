import { useLayoutEffect, type RefObject } from 'react';
import { resolveTextareaHeight, type TextareaVariant } from '../policy/textarea';

/** Reflow when content, width, user typography or the selected reading font changes. */
export function useAutosizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  { enabled = true, variant = 'edit', resizeOnWidthChange = true }: {
    enabled?: boolean;
    variant?: TextareaVariant;
    resizeOnWidthChange?: boolean;
  } = {}
) {
  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!enabled || !textarea) return;
    const resize = () => {
      const scrollTop = textarea.scrollTop;
      const style = getComputedStyle(textarea);
      const oneLineHeight = Math.ceil(
        (parseFloat(style.lineHeight) || 0) +
          (parseFloat(style.paddingTop) || 0) +
          (parseFloat(style.paddingBottom) || 0)
      );
      textarea.style.height = 'auto';
      textarea.style.height = `${resolveTextareaHeight(textarea.scrollHeight, value, variant, oneLineHeight)}px`;
      textarea.scrollTop = scrollTop;
    };
    resize();
    let width: number | undefined;
    const observer =
      !resizeOnWidthChange || typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(([entry]) => {
            const nextWidth = entry?.contentRect.width ?? textarea.getBoundingClientRect().width;
            if (nextWidth === width) return;
            width = nextWidth;
            resize();
          });
    observer?.observe(textarea);
    const preferences = new MutationObserver(resize);
    preferences.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'data-font'],
    });
    const readingScope = textarea.closest('[data-reading-responsive]');
    if (readingScope && readingScope !== document.documentElement) {
      preferences.observe(readingScope, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    document.fonts?.addEventListener('loadingdone', resize);
    return () => {
      observer?.disconnect();
      preferences.disconnect();
      document.fonts?.removeEventListener('loadingdone', resize);
    };
  }, [enabled, ref, value, variant, resizeOnWidthChange]);
}
