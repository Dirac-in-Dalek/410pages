export const TEXTAREA_MAX_HEIGHT = 400;
export const TEXTAREA_EMPTY_HEIGHT = 40;
export type TextareaVariant = 'entry' | 'edit' | 'inlineComment';

export function resolveTextareaHeight(
  scrollHeight: number,
  text: string,
  variant: TextareaVariant,
  oneLineHeight = 0
) {
  if (variant === 'inlineComment') return scrollHeight;
  const height =
    variant === 'entry' && !text.trim() ? TEXTAREA_EMPTY_HEIGHT : Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT);
  return variant === 'entry' ? Math.max(oneLineHeight, height) : height;
}
