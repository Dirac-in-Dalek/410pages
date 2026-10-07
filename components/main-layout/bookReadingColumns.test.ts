import { describe, expect, it } from 'vitest';
import { getBookReadingColumns } from './bookReadingColumns';

describe('book reading space', () => {
  it('centers the body text in a 1024px viewport and keeps the approved 1:2:1 text ratio', () => {
    const result = getBookReadingColumns({ left: 24, right: 1000, center: 512 });
    const bodyTextLeft = result.groupLeft + result.bodyLeft + 48;
    expect(bodyTextLeft + (result.body - 92) / 2).toBeCloseTo(512);
    expect((result.comment - 12) / (result.body - 92)).toBeCloseTo(1 / 2);
    expect((result.memo - 14) / (result.body - 92)).toBeCloseTo(1 / 2);
    expect(result.comment - 12).toBeCloseTo(202);
    expect(result.body - 92).toBeCloseTo(404);
    expect(result.memo - 14).toBeCloseTo(202);
    expect(result.groupLeft).toBeCloseTo(24);
    expect(result.groupLeft + result.total).toBeLessThanOrEqual(1000);
    expect(result.memoGap + 54).toBe(result.commentGap + 54);
  });
  it('keeps the selected 250:500:250 reading preference centered on 4K', () => {
    const result = getBookReadingColumns({ left: 24, right: 3816, center: 1920 });
    expect([result.comment - 12, result.body - 92, result.memo - 14]).toEqual([250, 500, 250]);
    expect(result.commentGap + 54).toBe(94);
    expect(result.memoGap + 54).toBe(94);
    expect(result.groupLeft + result.bodyLeft + 48 + 250).toBe(1920);
    expect(result.groupLeft).toBeGreaterThan(24);
    expect(result.groupLeft + result.total).toBeLessThanOrEqual(3816);
  });
  it('keeps the bounded preference when a 272px library is open on 4K', () => {
    const result = getBookReadingColumns({ left: 296, right: 3816, center: 1920 });
    expect([result.comment - 12, result.body - 92, result.memo - 14]).toEqual([250, 500, 250]);
    expect(result.groupLeft).toBeGreaterThan(296);
    expect(result.groupLeft + result.bodyLeft + 48 + 250).toBe(1920);
  });
  it('fits a resized memo beside an open library without overlap', () => {
    const bounds = { left: 296, right: 1896, center: 960 };
    const result = getBookReadingColumns(bounds, 520, 752);
    expect(result.groupLeft).toBeGreaterThanOrEqual(bounds.left);
    expect(result.groupLeft + result.total).toBeLessThanOrEqual(bounds.right);
    expect(result.groupLeft + result.bodyLeft + 48 + (result.body - 92) / 2).toBe(bounds.center);
    expect(result.memo - 14).toBeGreaterThan(result.comment - 12);
  });
});
