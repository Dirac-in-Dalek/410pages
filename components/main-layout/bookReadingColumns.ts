type ReadingBounds = { left: number; right: number; center: number };

export function getBookReadingColumns(bounds: ReadingBounds, memoPreference = 360, bodyPreference = 592, memoChrome = 14) {
  const leftSpace = Math.max(0, bounds.center - bounds.left);
  const rightSpace = Math.max(0, bounds.right - bounds.center);
  const desiredSideText = Math.max(0, bodyPreference - 92) * 0.5;
  const memoDelta = memoPreference - 360;
  const balancedSpace = Math.min(leftSpace, rightSpace - Math.max(0, memoDelta));
  const gapProgress = Math.max(0, Math.min(1, (balancedSpace - 488) / 112));
  // Comment text has 6px trailing chrome; memo text has a 10px leading inset.
  // With the body's 48/44px insets, equal grid gaps produce equal text gaps.
  const commentGap = 24 + 16 * gapProgress;
  const memoGap = commentGap;
  const sideText = Math.max(0, Math.min(
    desiredSideText,
    (leftSpace - 60 - commentGap) / 2,
    (rightSpace - 44 - memoGap - memoChrome - memoDelta) / 2,
  ));
  const bodyText = sideText * 2;
  const comment = sideText + 12;
  const body = bodyText + 92;
  const memo = Math.max(memoChrome, sideText + memoDelta + memoChrome);
  const bodyLeft = comment + commentGap;
  const groupLeft = bounds.center - bodyText / 2 - 48 - bodyLeft;
  const total = bodyLeft + body + memoGap + memo;
  return { comment, commentGap, body, memoGap, memo, bodyLeft, groupLeft, total };
}

export function getReadingBodyWidth() {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const value = style.getPropertyValue('--citation-column-width').trim();
  return (parseFloat(value) || 37) * (value.endsWith('px') ? 1 : parseFloat(style.fontSize) || 16);
}
