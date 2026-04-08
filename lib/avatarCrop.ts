export type AvatarImageRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
};

export type AvatarCropFrame = {
  x: number;
  y: number;
  size: number;
};

export type AvatarCropHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const DEFAULT_MIN_FRAME_SIZE = 72;
const DEFAULT_OUTPUT_SIZE = 512;

export function getContainedImageRect(
  containerSize: number,
  imageWidth: number,
  imageHeight: number
): AvatarImageRect {
  const safeWidth = Math.max(imageWidth, 1);
  const safeHeight = Math.max(imageHeight, 1);
  const scale = Math.min(containerSize / safeWidth, containerSize / safeHeight);
  const width = safeWidth * scale;
  const height = safeHeight * scale;

  return {
    x: (containerSize - width) / 2,
    y: (containerSize - height) / 2,
    width,
    height,
    scale,
  };
}

export function createInitialAvatarCropFrame(
  imageRect: AvatarImageRect,
  minFrameSize = DEFAULT_MIN_FRAME_SIZE
): AvatarCropFrame {
  const size = Math.max(minFrameSize, Math.min(imageRect.width, imageRect.height) * 0.72);
  return clampAvatarCropFrame(
    {
      x: imageRect.x + (imageRect.width - size) / 2,
      y: imageRect.y + (imageRect.height - size) / 2,
      size,
    },
    imageRect,
    minFrameSize
  );
}

export function clampAvatarCropFrame(
  frame: AvatarCropFrame,
  imageRect: AvatarImageRect,
  minFrameSize = DEFAULT_MIN_FRAME_SIZE
): AvatarCropFrame {
  const maxSize = Math.max(minFrameSize, Math.min(imageRect.width, imageRect.height));
  const size = Math.min(Math.max(frame.size, minFrameSize), maxSize);
  const minX = imageRect.x;
  const minY = imageRect.y;
  const maxX = imageRect.x + imageRect.width - size;
  const maxY = imageRect.y + imageRect.height - size;

  return {
    x: clamp(frame.x, minX, maxX),
    y: clamp(frame.y, minY, maxY),
    size,
  };
}

export function moveAvatarCropFrame(
  frame: AvatarCropFrame,
  deltaX: number,
  deltaY: number,
  imageRect: AvatarImageRect,
  minFrameSize = DEFAULT_MIN_FRAME_SIZE
): AvatarCropFrame {
  return clampAvatarCropFrame(
    {
      ...frame,
      x: frame.x + deltaX,
      y: frame.y + deltaY,
    },
    imageRect,
    minFrameSize
  );
}

export function resizeAvatarCropFrame(
  frame: AvatarCropFrame,
  handle: AvatarCropHandle,
  deltaX: number,
  deltaY: number,
  imageRect: AvatarImageRect,
  minFrameSize = DEFAULT_MIN_FRAME_SIZE
): AvatarCropFrame {
  const left = frame.x;
  const top = frame.y;
  const right = frame.x + frame.size;
  const bottom = frame.y + frame.size;

  let nextLeft = left;
  let nextTop = top;
  let nextRight = right;
  let nextBottom = bottom;

  if (handle.includes('left')) {
    nextLeft = left + deltaX;
  } else {
    nextRight = right + deltaX;
  }

  if (handle.includes('top')) {
    nextTop = top + deltaY;
  } else {
    nextBottom = bottom + deltaY;
  }

  const nextWidth = nextRight - nextLeft;
  const nextHeight = nextBottom - nextTop;
  const nextSize = Math.max(minFrameSize, Math.max(nextWidth, nextHeight));

  if (handle === 'top-left') {
    return clampAvatarCropFrame({ x: right - nextSize, y: bottom - nextSize, size: nextSize }, imageRect, minFrameSize);
  }

  if (handle === 'top-right') {
    return clampAvatarCropFrame({ x: left, y: bottom - nextSize, size: nextSize }, imageRect, minFrameSize);
  }

  if (handle === 'bottom-left') {
    return clampAvatarCropFrame({ x: right - nextSize, y: top, size: nextSize }, imageRect, minFrameSize);
  }

  return clampAvatarCropFrame({ x: left, y: top, size: nextSize }, imageRect, minFrameSize);
}

export async function cropAvatarFile(
  imageSrc: string,
  file: File,
  cropFrame: AvatarCropFrame,
  imageRect: AvatarImageRect,
  outputSize = DEFAULT_OUTPUT_SIZE
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('이미지 편집 컨텍스트를 만들지 못했습니다.');
  }

  const sourceX = (cropFrame.x - imageRect.x) / imageRect.scale;
  const sourceY = (cropFrame.y - imageRect.y) / imageRect.scale;
  const sourceSize = cropFrame.size / imageRect.scale;

  context.clearRect(0, 0, outputSize, outputSize);
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await canvasToBlob(canvas, outputType);
  const extension = outputType === 'image/png' ? 'png' : 'jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'avatar';

  return new File([blob], `${baseName}-avatar.${extension}`, {
    type: outputType,
    lastModified: Date.now(),
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('크롭 이미지를 만들지 못했습니다.'));
        return;
      }

      resolve(blob);
    }, type);
  });
}
