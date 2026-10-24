export const TEXTAREA_MAX_HEIGHT = 400;
export const TEXTAREA_EMPTY_HEIGHT = 40;
export type TextareaVariant = 'entry' | 'bookEntry' | 'edit' | 'inlineComment';

export function resolveTextareaHeight(
  scrollHeight: number,
  text: string,
  variant: TextareaVariant,
  oneLineHeight = 0
) {
  if (variant === 'inlineComment') return scrollHeight;
  const isEntry = variant === 'entry' || variant === 'bookEntry';
  const emptyHeight = variant === 'bookEntry' ? oneLineHeight : TEXTAREA_EMPTY_HEIGHT;
  const height =
    isEntry && !text.trim() ? emptyHeight : Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT);
  return isEntry ? Math.max(oneLineHeight, height) : height;
}
