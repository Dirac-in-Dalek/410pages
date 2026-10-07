export type ReadingWorkspaceMetricsInput = {
  viewportWidth: number;
  viewportHeight: number;
  userFontPt: number;
  sidebarWidthPreference: number;
  sidebarOpen: boolean;
  memoWidthPreference: number;
  memoChrome?: number;
  viewportPadding?: number;
};

export type ReadingWorkspaceMetrics = ReturnType<typeof getReadingWorkspaceMetrics>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const mix = (start: number, end: number, progress: number) => start + (end - start) * progress;
const px = (value: number) => `${Math.round(value * 1000) / 1000}px`;

export function getReadingWorkspaceMetrics({
  viewportWidth,
  viewportHeight,
  userFontPt,
  sidebarWidthPreference,
  sidebarOpen,
  memoWidthPreference,
  memoChrome = 14,
  viewportPadding = 24,
}: ReadingWorkspaceMetricsInput) {
  const widthProgress = clamp((viewportWidth - 1024) / (3840 - 1024), 0, 1);
  const heightProgress = clamp((viewportHeight - 768) / (2160 - 768), 0, 1);
  const densityProgress = widthProgress;
  const userBodySize = userFontPt * 4 / 3;
  const bodyFontSize = userBodySize * mix(1, 12 / 7, densityProgress);
  const uiFontSize = clamp(userBodySize * (6 / 7) * mix(1, 1.5, densityProgress), 14, 28);
  const annotationFontSize = clamp(userBodySize * 0.75 * mix(1, 1.5, densityProgress), 12, 26);
  const labelFontSize = clamp(userBodySize * 0.75 * mix(1, 1.4, densityProgress), 12, 24);
  const bodyPadLeft = mix(48, 72, densityProgress);
  const bodyPadRight = mix(44, 66, densityProgress);
  const commentPad = mix(6, 12, densityProgress);
  const memoPad = bodyPadLeft + commentPad - bodyPadRight;
  const scrollbarChrome = Math.max(0, memoChrome - 10);
  const effectiveMemoChrome = memoPad + scrollbarChrome;
  const columnGap = mix(24, 84, widthProgress);
  const sidebarScale = viewportWidth / 1360;
  const sidebarMinimumWidth = 232 * sidebarScale;
  const sidebarMaximumWidth = Math.max(sidebarMinimumWidth, viewportWidth * 0.3);
  const sidebarWidth = clamp(sidebarWidthPreference * sidebarScale, sidebarMinimumWidth, sidebarMaximumWidth);
  const sidebarPreferenceMinimum = sidebarMinimumWidth / sidebarScale;
  const sidebarPreferenceMaximum = sidebarMaximumWidth / sidebarScale;
  const readingLeft = sidebarOpen ? sidebarWidth : 0;
  const readingWidth = Math.max(0, viewportWidth - readingLeft);
  const readingCenter = readingLeft + readingWidth / 2;
  const outerMargin = 25 + Math.max(0, readingWidth - 1024) * 0.16;
  const visibleBudget = Math.max(0, readingWidth - outerMargin * 2 - commentPad * 2 - bodyPadLeft - bodyPadRight - effectiveMemoChrome - columnGap * 2);
  const bodyText = visibleBudget / 2;
  const sideText = bodyText / 2;
  const memoPreferenceScale = mix(1, 1.45, densityProgress);
  const body = bodyText + bodyPadLeft + bodyPadRight;
  const bodyLeft = readingCenter - bodyText / 2 - bodyPadLeft;
  const bodyRight = bodyLeft + body;
  const memoPreferenceDelta = (memoWidthPreference - 360) * memoPreferenceScale;
  const memoTextDesired = Math.max(0, sideText + memoPreferenceDelta);
  const rightLimit = viewportWidth - viewportPadding;
  const availableMemoText = Math.max(0, rightLimit - bodyRight - columnGap - effectiveMemoChrome);
  const memoText = Math.min(memoTextDesired, availableMemoText);
  const memoPreferenceMinimum = clamp(360 - sideText / memoPreferenceScale, 232, 960);
  const memoPreferenceMaximum = clamp(
    360 + (availableMemoText - sideText) / memoPreferenceScale,
    memoPreferenceMinimum,
    960,
  );
  const memo = memoText + effectiveMemoChrome;
  const commentRight = bodyLeft - columnGap;
  const desiredComment = sideText + commentPad * 2;
  const desiredCommentLeft = commentRight - desiredComment;
  const contentLeft = readingLeft + viewportPadding;
  const comment = Math.max(0, commentRight - Math.max(contentLeft, desiredCommentLeft));
  const commentText = Math.max(0, comment - commentPad * 2);
  const groupLeft = commentRight - comment;
  const bodyColumnLeft = comment + columnGap;
  const total = bodyColumnLeft + body + columnGap + memo;
  const minimumCommentSuggestion = mix(96, 144, widthProgress);
  const belowSuggestedCommentMinimum = commentText < minimumCommentSuggestion;
  const requiresSidebarFallback = sidebarOpen && belowSuggestedCommentMinimum;

  const cssVariables = {
    '--reading-comment-width': px(comment),
    '--reading-commentGap-width': px(columnGap),
    '--reading-body-width': px(body),
    '--reading-memoGap-width': px(columnGap),
    '--reading-memo-width': px(memo),
    '--reading-body-left': px(bodyColumnLeft),
    '--reading-group-left': px(groupLeft - contentLeft),
    '--reading-total-width': px(total),
    '--reading-body-font-size': px(bodyFontSize),
    '--reading-ui-font-size': px(uiFontSize),
    '--reading-annotation-font-size': px(annotationFontSize),
    '--reading-label-font-size': px(labelFontSize),
    '--reading-title-font-size': px(bodyFontSize * 12 / 7),
    '--reading-control-size': px(mix(32, 48, densityProgress)),
    '--reading-icon-size': px(mix(16, 24, densityProgress)),
    '--reading-small-icon-size': px(mix(14, 20, densityProgress)),
    '--reading-sidebar-icon-size': px(mix(14, 24, densityProgress)),
    '--reading-sidebar-font-size': px(uiFontSize * mix(0.875, 1, densityProgress)),
    '--reading-sidebar-meta-font-size': px(annotationFontSize * mix(6 / 7, 1, densityProgress)),
    '--reading-sidebar-label-font-size': px(labelFontSize * mix(6 / 7, 1, densityProgress)),
    '--reading-sidebar-control-size': px(mix(28, 48, densityProgress)),
    '--reading-sidebar-row-padding': px(mix(4, 6, densityProgress)),
    '--reading-header-height': px(mix(50.4, 72, densityProgress)),
    '--reading-header-padding': px(mix(16, 28, densityProgress)),
    '--reading-search-width': px(mix(544, 760, densityProgress)),
    '--reading-sidebar-row-height': px(mix(32, 56, densityProgress)),
    '--reading-sidebar-padding': px(mix(8, 20, densityProgress)),
    '--reading-sidebar-indent': px(mix(10, 18, densityProgress)),
    '--reading-indent-step': px(mix(32, 48, densityProgress)),
    '--reading-indent-cap': px(mix(96, 144, densityProgress)),
    '--reading-body-pad-left': px(bodyPadLeft),
    '--reading-body-pad-right': px(bodyPadRight),
    '--reading-comment-pad': px(commentPad),
    '--reading-memo-pad': px(memoPad),
    '--reading-column-gap': px(columnGap),
    '--reading-row-gap': px(mix(40, 72, densityProgress)),
    '--reading-editor-gap': px(mix(12, 20, densityProgress)),
    '--reading-page-width': px(mix(124, 168, densityProgress)),
    '--reading-hierarchy-rail': px(mix(104, 144, densityProgress)),
    '--reading-memo-min-height': px(mix(360, 520, heightProgress)),
    '--reading-wordmark-width': px(mix(112, 160, densityProgress)),
    '--reading-sidebar-width': px(sidebarWidth),
    '--reading-host-padding': px(viewportPadding),
  } as const;

  return {
    viewportWidth,
    viewportHeight,
    widthProgress,
    heightProgress,
    densityProgress,
    bodyFontSize,
    uiFontSize,
    annotationFontSize,
    labelFontSize,
    sidebarScale,
    sidebarWidth,
    sidebarWidthPreference,
    sidebarMinimumWidth,
    sidebarMaximumWidth,
    sidebarPreferenceMinimum,
    sidebarPreferenceMaximum,
    readingLeft,
    readingWidth,
    readingCenter,
    memoWidthPreference,
    memoPreferenceScale,
    memoPreferenceMinimum,
    memoPreferenceMaximum,
    comment,
    commentText,
    commentRight,
    body,
    bodyText,
    bodyLeft,
    bodyRight,
    memo,
    memoText,
    memoRight: bodyRight + columnGap + memo,
    columnGap,
    outerMargin,
    visibleBudget,
    groupLeft,
    total,
    contentLeft,
    minimumCommentSuggestion,
    belowSuggestedCommentMinimum,
    requiresSidebarFallback,
    cssVariables,
  };
}
