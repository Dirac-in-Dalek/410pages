import { describe, expect, it } from 'vitest';
import { getReadingWorkspaceMetrics } from './getReadingWorkspaceMetrics';

const metrics = (overrides = {}) => getReadingWorkspaceMetrics({
  viewportWidth: 1024,
  viewportHeight: 768,
  userFontPt: 14,
  sidebarWidthPreference: 272,
  sidebarOpen: false,
  memoWidthPreference: 360,
  memoChrome: 14,
  ...overrides,
});

describe('getReadingWorkspaceMetrics', () => {
  it('keeps the 1024 baseline centered with a default 1:2:1 text ratio', () => {
    const result = metrics();
    expect([result.commentText, result.bodyText, result.memoText]).toEqual([202, 404, 202]);
    expect(result.bodyLeft + 48 + result.bodyText / 2).toBe(512);
    expect(result.bodyFontSize).toBeCloseTo(14 * 4 / 3);
    expect(result.columnGap).toBe(24);
  });

  it('grows typography, spacing, reading width, and the library at wider desktop sizes', () => {
    const medium = metrics({ viewportWidth: 1920, viewportHeight: 1080 });
    const wide = metrics({ viewportWidth: 3840, viewportHeight: 2160 });
    expect(medium.bodyText).toBeGreaterThan(650);
    expect(medium.bodyText).toBeLessThan(720);
    expect(medium.bodyLeft + Number.parseFloat(medium.cssVariables['--reading-body-pad-left']) + medium.bodyText / 2).toBeCloseTo(960);
    expect(medium.commentText / medium.bodyText).toBeCloseTo(0.5);
    expect(medium.memoText / medium.bodyText).toBeCloseTo(0.5);
    expect(wide.bodyFontSize).toBeCloseTo(32);
    expect(wide.bodyText).toBeGreaterThan(1200);
    expect(wide.bodyText).toBeLessThan(1400);
    expect(wide.readingCenter).toBe(1920);
    expect(wide.bodyLeft + Number.parseFloat(wide.cssVariables['--reading-body-pad-left']) + wide.bodyText / 2).toBeCloseTo(1920);
    expect(wide.commentText / wide.bodyText).toBeCloseTo(0.5);
    expect(wide.memoText / wide.bodyText).toBeCloseTo(0.5);
    expect(wide.columnGap).toBe(84);
    expect(wide.sidebarWidth).toBeCloseTo(768);
    expect(wide.bodyText).toBeGreaterThan(medium.bodyText);
    for (const result of [medium, wide]) {
      const values = result.cssVariables;
      const textGapLeft = Number.parseFloat(values['--reading-body-pad-left']) + Number.parseFloat(values['--reading-comment-pad']);
      const textGapRight = Number.parseFloat(values['--reading-body-pad-right']) + Number.parseFloat(values['--reading-memo-pad']);
      expect(textGapLeft).toBeCloseTo(textGapRight);
    }
  });

  it('does not change body geometry when only the user font preference changes', () => {
    const normal = metrics({ viewportWidth: 1920, viewportHeight: 1080, userFontPt: 12 });
    const large = metrics({ viewportWidth: 1920, viewportHeight: 1080, userFontPt: 20 });
    expect(large.bodyText).toBe(normal.bodyText);
    expect(large.bodyLeft).toBe(normal.bodyLeft);
    expect(large.bodyFontSize).toBeGreaterThan(normal.bodyFontSize);
    expect(large.uiFontSize).toBeGreaterThan(normal.uiFontSize);
    expect(large.annotationFontSize).toBeGreaterThan(normal.annotationFontSize);
  });

  it('does not use viewport height as a typography or horizontal-spacing trigger', () => {
    const short = metrics({ viewportWidth: 1920, viewportHeight: 768 });
    const tall = metrics({ viewportWidth: 1920, viewportHeight: 1400 });
    expect(tall.bodyFontSize).toBe(short.bodyFontSize);
    expect(tall.uiFontSize).toBe(short.uiFontSize);
    expect(tall.columnGap).toBe(short.columnGap);
    expect(tall.sidebarWidth).toBe(short.sidebarWidth);
    expect(tall.cssVariables['--reading-memo-min-height']).not.toBe(short.cssVariables['--reading-memo-min-height']);
  });

  it('centers an open 1024 library layout in the remaining reading area', () => {
    const result = metrics({ sidebarOpen: true });
    expect(result.sidebarWidth).toBeCloseTo(204.8);
    expect(result.sidebarMinimumWidth).toBeCloseTo(174.68235);
    expect(result.sidebarMaximumWidth).toBeCloseTo(307.2);
    expect(result.readingLeft).toBeCloseTo(204.8);
    expect(result.readingWidth).toBeCloseTo(819.2);
    expect(result.readingCenter).toBeCloseTo(614.4);
    expect(result.bodyLeft + Number.parseFloat(result.cssVariables['--reading-body-pad-left']) + result.bodyText / 2).toBeCloseTo(614.4);
    expect(result.commentText / result.bodyText).toBeCloseTo(0.5);
    expect(result.memoText / result.bodyText).toBeCloseTo(0.5);
  });

  it('uses a compact sidebar at 1024 without reducing body typography or the wide-screen sidebar', () => {
    const compact = metrics();
    const wide = metrics({ viewportWidth: 3840 });
    expect(compact.cssVariables['--reading-sidebar-font-size']).toBe('14px');
    expect(compact.cssVariables['--reading-sidebar-meta-font-size']).toBe('12px');
    expect(compact.cssVariables['--reading-sidebar-row-height']).toBe('32px');
    expect(compact.bodyFontSize).toBeCloseTo(14 * 4 / 3);
    expect(wide.cssVariables['--reading-sidebar-font-size']).toBe('24px');
    expect(wide.sidebarMaximumWidth).toBe(1152);
  });

  it('scales a 4K library by viewport ratio and centers the reading group in the remainder', () => {
    const result = metrics({ viewportWidth: 3840, viewportHeight: 2160, sidebarOpen: true });
    expect(result.sidebarWidth).toBeCloseTo(768);
    expect(result.readingLeft).toBeCloseTo(768);
    expect(result.readingWidth).toBeCloseTo(3072);
    expect(result.readingCenter).toBeCloseTo(2304);
    expect(result.bodyLeft + Number.parseFloat(result.cssVariables['--reading-body-pad-left']) + result.bodyText / 2).toBeCloseTo(2304);
    expect(result.commentText / result.bodyText).toBeCloseTo(0.5);
    expect(result.memoText / result.bodyText).toBeCloseTo(0.5);
  });

  it('continues growing the library beyond 4K while preserving source preference bounds', () => {
    const normal = metrics({ viewportWidth: 5120, viewportHeight: 2160, sidebarOpen: true });
    const minimum = metrics({ viewportWidth: 3840, viewportHeight: 2160, sidebarOpen: true, sidebarWidthPreference: 232 });
    const legacyLarge = metrics({ viewportWidth: 3840, viewportHeight: 2160, sidebarOpen: true, sidebarWidthPreference: 960 });
    expect(normal.sidebarWidth).toBeCloseTo(1024);
    expect(minimum.sidebarWidth).toBeCloseTo(655.0588);
    expect(legacyLarge.sidebarWidth).toBeCloseTo(1152);
    expect(legacyLarge.sidebarWidthPreference).toBe(960);
    expect(legacyLarge.sidebarPreferenceMinimum).toBeCloseTo(232);
    expect(legacyLarge.sidebarPreferenceMaximum).toBeCloseTo(408);
  });

  it('preserves a memo width override without changing body width or center', () => {
    const normal = metrics({ viewportWidth: 1920, viewportHeight: 1080 });
    const resized = metrics({ viewportWidth: 1920, viewportHeight: 1080, memoWidthPreference: 440 });
    expect(resized.memoText).toBeGreaterThan(normal.memoText);
    expect(resized.bodyText).toBe(normal.bodyText);
    expect(resized.bodyLeft).toBe(normal.bodyLeft);
  });

  it('clamps memo resize preferences to the visible range without changing the stored preference', () => {
    const saturated = metrics({ memoWidthPreference: 960 });
    expect(saturated.memoWidthPreference).toBe(960);
    expect(saturated.memoText).toBe(204);
    expect(saturated.memo).toBe(218);
    expect(saturated.memoPreferenceMinimum).toBe(232);
    expect(saturated.memoPreferenceMaximum).toBe(362);

    const reduced = metrics({
      memoWidthPreference: saturated.memoPreferenceMaximum - 16 / saturated.memoPreferenceScale,
    });
    expect(reduced.memo).toBe(202);
  });

  it('keeps memo resize bounds independent of font preference and adapts them to viewport capacity', () => {
    const fonts = [7, 12, 20].map(userFontPt => metrics({ userFontPt, memoWidthPreference: 960 }));
    for (const result of fonts.slice(1)) {
      expect(result.memoPreferenceMinimum).toBe(fonts[0].memoPreferenceMinimum);
      expect(result.memoPreferenceMaximum).toBe(fonts[0].memoPreferenceMaximum);
    }

    const wide = metrics({ viewportWidth: 1920, viewportHeight: 1080, memoWidthPreference: 960 });
    const narrow = metrics({ memoWidthPreference: wide.memoPreferenceMaximum });
    expect(wide.memoPreferenceMaximum).toBeGreaterThan(narrow.memoPreferenceMaximum);
    expect(narrow.memoWidthPreference).toBe(wide.memoPreferenceMaximum);
    expect(narrow.memo).toBe(218);

    const constrained = metrics({ viewportWidth: 700, sidebarOpen: true, memoWidthPreference: 232 });
    expect(constrained.memoPreferenceMinimum).toBeGreaterThan(232);
    expect(constrained.memoPreferenceMaximum).toBeGreaterThanOrEqual(constrained.memoPreferenceMinimum);
    expect(metrics({ viewportWidth: 700, sidebarOpen: true, memoWidthPreference: constrained.memoPreferenceMinimum }).memoText).toBe(0);
  });

  it('keeps automatic library fallback geometry independent of font preference', () => {
    const results = [7, 12, 20].map(userFontPt => metrics({
      userFontPt,
      sidebarOpen: true,
      sidebarWidthPreference: 960,
    }));
    expect(results[0].sidebarWidth).toBeCloseTo(1024 * 0.3);
    expect(results[0].minimumCommentSuggestion).toBe(96);
    for (const result of results.slice(1)) {
      expect(result.commentText).toBe(results[0].commentText);
      expect(result.bodyText).toBe(results[0].bodyText);
      expect(result.memoText).toBe(results[0].memoText);
      expect(result.minimumCommentSuggestion).toBe(results[0].minimumCommentSuggestion);
      expect(result.requiresSidebarFallback).toBe(results[0].requiresSidebarFallback);
    }
  });

  it('reports when comments require the existing sidebar fallback', () => {
    const result = metrics({ viewportWidth: 700, sidebarOpen: true });
    expect(result.minimumCommentSuggestion).toBe(96);
    expect(result.belowSuggestedCommentMinimum).toBe(true);
    expect(result.commentText).toBeGreaterThan(0);
    expect(result.requiresSidebarFallback).toBe(true);
  });
});
