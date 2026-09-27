import { describe, expect, it } from 'vitest';
import {
  bookPositionPatch,
  compareBookPositions,
  generateBookPosition,
  getBookPosition,
  legacyOrderKey,
} from './bookOrder';

describe('bookOrder', () => {
  it('normalizes every finite legacy number into the same lexical order', () => {
    const values = [-Number.MAX_VALUE, -10, -Number.MIN_VALUE, 0, Number.MIN_VALUE, 10, Number.MAX_VALUE];
    const keys = values.map(legacyOrderKey);
    expect([...keys].sort()).toEqual(keys);
    expect(legacyOrderKey(-0)).toBe(legacyOrderKey(0));
    expect(() => legacyOrderKey(Infinity)).toThrow('finite');
    expect(() => legacyOrderKey(NaN)).toThrow('finite');
  });

  it('creates a key between adjacent timestamp-sized floats', () => {
    const left = 1_800_000_000_000;
    const right = left + Number.EPSILON * left / 2;
    expect(right).toBeGreaterThan(left);
    expect((left + right) / 2).toBe(left);
    const position = generateBookPosition(left, right);
    expect(compareBookPositions(left, position)).toBeLessThan(0);
    expect(compareBookPositions(position, right)).toBeLessThan(0);
  });

  it('preserves order through one thousand repeated insertions in one gap', () => {
    const right = legacyOrderKey(2);
    const positions: string[] = [];
    let left: string | number = 1;
    for (let index = 0; index < 1_000; index += 1) {
      const position = generateBookPosition(left, right);
      positions.push(position);
      left = position;
    }
    expect([...positions].sort()).toEqual(positions);
    expect(compareBookPositions(positions.at(-1)!, right)).toBeLessThan(0);
  });

  it('falls back to legacy metadata for invalid stored keys and projects either storage shape', () => {
    expect(getBookPosition({ createdAtSort: 4, orderKey: 'invalid' })).toBe(4);
    expect(getBookPosition({ createdAtSort: 4, orderKey: '' })).toBe(4);
    const orderKey = legacyOrderKey(4);
    expect(getBookPosition({ createdAtSort: 9, orderKey })).toBe(orderKey);
    expect(bookPositionPatch(orderKey)).toEqual({ orderKey });
    expect(bookPositionPatch(4)).toEqual({ createdAtSort: 4 });
  });
});
