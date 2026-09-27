import { generateKeyBetween } from 'jittered-fractional-indexing';
import type { BookPosition } from '../types';

const SIGN_BIT = 0x8000000000000000n;
const ALL_BITS = 0xffffffffffffffffn;
const buffer = new ArrayBuffer(8);
const view = new DataView(buffer);

const isValidOrderKey = (key: string) => {
  if (!/^[0-9A-Za-z]+$/.test(key)) return false;
  const head = key[0];
  const integerLength = head >= 'a' && head <= 'z'
    ? head.charCodeAt(0) - 95
    : head >= 'A' && head <= 'Z' ? 92 - head.charCodeAt(0) : 0;
  return integerLength > 0
    && key.length >= integerLength
    && key !== `A${'0'.repeat(26)}`
    && (key.length === integerLength || !key.endsWith('0'));
};

export const legacyOrderKey = (value: number): string => {
  if (!Number.isFinite(value)) throw new RangeError('Book position must be finite');
  view.setFloat64(0, Object.is(value, -0) ? 0 : value);
  const bits = view.getBigUint64(0);
  const sortable = bits & SIGN_BIT ? bits ^ ALL_BITS : bits ^ SIGN_BIT;
  return `a0${sortable.toString(16).padStart(16, '0')}V`;
};

export const getBookPosition = (item: { createdAtSort: number; orderKey?: string }): BookPosition =>
  item.orderKey && isValidOrderKey(item.orderKey) ? item.orderKey : item.createdAtSort;

const normalizedKey = (position: BookPosition) =>
  typeof position === 'number' ? legacyOrderKey(position) : position;

export const compareBookPositions = (a: BookPosition, b: BookPosition): number => {
  const left = normalizedKey(a);
  const right = normalizedKey(b);
  return left < right ? -1 : left > right ? 1 : 0;
};

let randomWord = 0;
let randomBitsRemaining = 0;

const getRandomBit = () => {
  if (randomBitsRemaining === 0) {
    randomWord = globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
    randomBitsRemaining = 32;
  }
  const bit = (randomWord & 1) === 1;
  randomWord >>>= 1;
  randomBitsRemaining -= 1;
  return bit;
};

export const generateBookPosition = (left?: BookPosition, right?: BookPosition): string =>
  generateKeyBetween(
    left === undefined ? undefined : normalizedKey(left),
    right === undefined ? undefined : normalizedKey(right),
    { jitterBits: 64, getRandomBit },
  );

export const bookPositionPatch = (position: BookPosition): { orderKey: string } | { createdAtSort: number } =>
  typeof position === 'string' ? { orderKey: position } : { createdAtSort: position };
