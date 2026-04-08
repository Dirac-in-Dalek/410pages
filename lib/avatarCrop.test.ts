import { describe, expect, it } from 'vitest';

import {
  clampAvatarCropFrame,
  createInitialAvatarCropFrame,
  resizeAvatarCropFrame,
  type AvatarImageRect,
} from './avatarCrop';

const imageRect: AvatarImageRect = {
  x: 0,
  y: 0,
  width: 320,
  height: 320,
  scale: 1,
};

describe('avatarCrop', () => {
  it('creates an initial square crop frame contained inside the image', () => {
    const frame = createInitialAvatarCropFrame(imageRect);

    expect(frame.size).toBeGreaterThan(0);
    expect(frame.x).toBeGreaterThanOrEqual(imageRect.x);
    expect(frame.y).toBeGreaterThanOrEqual(imageRect.y);
    expect(frame.x + frame.size).toBeLessThanOrEqual(imageRect.x + imageRect.width);
    expect(frame.y + frame.size).toBeLessThanOrEqual(imageRect.y + imageRect.height);
  });

  it('resizes a square crop frame from the left edge while keeping it inside the image', () => {
    const frame = clampAvatarCropFrame({ x: 80, y: 90, size: 120 }, imageRect);

    const resized = resizeAvatarCropFrame(frame, 'left', -20, 0, imageRect);

    expect(resized.x).toBe(60);
    expect(resized.y).toBe(80);
    expect(resized.size).toBe(140);
  });

  it('resizes a square crop frame from the top edge while keeping it centered horizontally', () => {
    const frame = clampAvatarCropFrame({ x: 80, y: 90, size: 120 }, imageRect);

    const resized = resizeAvatarCropFrame(frame, 'top', 0, -10, imageRect);

    expect(resized.x).toBe(75);
    expect(resized.y).toBe(80);
    expect(resized.size).toBe(130);
  });
});
