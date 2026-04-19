import React, { useEffect, useRef, useState } from 'react';
import type { AvatarCropFrame, AvatarCropHandle, AvatarImageRect } from '../../lib/avatarCrop';
import {
  clampAvatarCropFrame,
  createInitialAvatarCropFrame,
  cropAvatarFile,
  getContainedImageRect,
  moveAvatarCropFrame,
  resizeAvatarCropFrame,
} from '../../lib/avatarCrop';
import { avatarDebugError, avatarDebugInfo, clearAvatarDebugLog } from '../../lib/avatarDebug';

const EDITOR_SIZE = 320;
const HANDLE_SIZE = 18;
const HANDLE_CONFIGS: Array<{
  handle: AvatarCropHandle;
  cursor: string;
  width: number;
  height: number;
  style: React.CSSProperties;
}> = [
  {
    handle: 'top-left',
    cursor: 'nwse-resize',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    style: { left: `-${HANDLE_SIZE / 2}px`, top: `-${HANDLE_SIZE / 2}px` },
  },
  {
    handle: 'top',
    cursor: 'ns-resize',
    width: 34,
    height: 14,
    style: { left: '50%', top: '-7px', transform: 'translateX(-50%)' },
  },
  {
    handle: 'top-right',
    cursor: 'nesw-resize',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    style: { right: `-${HANDLE_SIZE / 2}px`, top: `-${HANDLE_SIZE / 2}px` },
  },
  {
    handle: 'right',
    cursor: 'ew-resize',
    width: 14,
    height: 34,
    style: { right: '-7px', top: '50%', transform: 'translateY(-50%)' },
  },
  {
    handle: 'bottom-right',
    cursor: 'nwse-resize',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    style: { right: `-${HANDLE_SIZE / 2}px`, bottom: `-${HANDLE_SIZE / 2}px` },
  },
  {
    handle: 'bottom',
    cursor: 'ns-resize',
    width: 34,
    height: 14,
    style: { left: '50%', bottom: '-7px', transform: 'translateX(-50%)' },
  },
  {
    handle: 'bottom-left',
    cursor: 'nesw-resize',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    style: { left: `-${HANDLE_SIZE / 2}px`, bottom: `-${HANDLE_SIZE / 2}px` },
  },
  {
    handle: 'left',
    cursor: 'ew-resize',
    width: 14,
    height: 34,
    style: { left: '-7px', top: '50%', transform: 'translateY(-50%)' },
  },
];

type AvatarCropModalProps = {
  file: File | null;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (file: File) => Promise<void>;
};

type InteractionState =
  | {
      type: 'move';
      originX: number;
      originY: number;
      pointerId: number;
      startFrame: AvatarCropFrame;
    }
  | {
      type: 'resize';
      handle: AvatarCropHandle;
      originX: number;
      originY: number;
      pointerId: number;
      startFrame: AvatarCropFrame;
    };

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  file,
  isSaving = false,
  onCancel,
  onSave,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageRect, setImageRect] = useState<AvatarImageRect | null>(null);
  const [cropFrame, setCropFrame] = useState<AvatarCropFrame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const interactionRef = useRef<InteractionState | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setImageRect(null);
      setCropFrame(null);
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    setImageRect(null);
    setCropFrame(null);
    setError(null);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!previewUrl) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [previewUrl]);

  if (!file || !previewUrl) {
    return null;
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactionRef.current || !imageRect || interactionRef.current.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - interactionRef.current.originX;
    const deltaY = event.clientY - interactionRef.current.originY;

    setCropFrame((currentFrame) => {
      const baseFrame = currentFrame || interactionRef.current?.startFrame;
      if (!baseFrame) {
        return currentFrame;
      }

      if (interactionRef.current?.type === 'move') {
        return moveAvatarCropFrame(interactionRef.current.startFrame, deltaX, deltaY, imageRect);
      }

      return resizeAvatarCropFrame(
        interactionRef.current.startFrame,
        interactionRef.current.handle,
        deltaX,
        deltaY,
        imageRect
      );
    });
  };

  const stopInteraction = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (
      event &&
      interactionRef.current &&
      interactionRef.current.pointerId !== event.pointerId
    ) {
      return;
    }

    interactionRef.current = null;
  };

  const startMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cropFrame) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      type: 'move',
      originX: event.clientX,
      originY: event.clientY,
      pointerId: event.pointerId,
      startFrame: cropFrame,
    };
  };

  const startResize = (handle: AvatarCropHandle) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!cropFrame) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      type: 'resize',
      handle,
      originX: event.clientX,
      originY: event.clientY,
      pointerId: event.pointerId,
      startFrame: cropFrame,
    };
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const nextImageRect = getContainedImageRect(
      EDITOR_SIZE,
      event.currentTarget.naturalWidth,
      event.currentTarget.naturalHeight
    );
    setImageRect(nextImageRect);
    setCropFrame((currentFrame) => currentFrame || createInitialAvatarCropFrame(nextImageRect));
  };

  const handleSave = async () => {
    if (!cropFrame || !imageRect || !previewUrl || isSaving) {
      return;
    }

    try {
      setError(null);
      clearAvatarDebugLog();
      avatarDebugInfo('crop save started', {
        originalName: file.name,
        originalSize: file.size,
        originalType: file.type,
        cropFrame,
        imageRect,
      });
      const croppedFile = await cropAvatarFile(previewUrl, file, cropFrame, imageRect);
      avatarDebugInfo('crop file created', {
        croppedName: croppedFile.name,
        croppedSize: croppedFile.size,
        croppedType: croppedFile.type,
      });
      await onSave(croppedFile);
      avatarDebugInfo('crop save completed');
    } catch (saveError) {
      avatarDebugError('crop save failed', saveError);
      setError('프로필 사진 편집에 실패했습니다.');
    }
  };

  const frameStyle = cropFrame
    ? {
        left: `${cropFrame.x}px`,
        top: `${cropFrame.y}px`,
        width: `${cropFrame.size}px`,
        height: `${cropFrame.size}px`,
      }
    : undefined;
  const circleGuideStyle = cropFrame
    ? {
        width: `${cropFrame.size}px`,
        height: `${cropFrame.size}px`,
      }
    : undefined;
  const overlayStyle = cropFrame
    ? {
        background: `radial-gradient(circle ${cropFrame.size / 2}px at ${cropFrame.x + cropFrame.size / 2}px ${
          cropFrame.y + cropFrame.size / 2
        }px, transparent ${Math.max(cropFrame.size / 2 - 1, 0)}px, rgba(0, 0, 0, 0.48) ${cropFrame.size / 2 + 1}px)`,
      }
    : undefined;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 touch-none overscroll-contain"
      onWheelCapture={(event) => event.preventDefault()}
    >
      <div
        aria-label="프로필 사진 편집"
        aria-modal="true"
        role="dialog"
        className="w-full max-w-[520px] rounded-[28px] border border-[var(--border-main)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-panel)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="type-display-bounded text-[var(--text-main)]">프로필 사진 편집</h3>
            <p className="type-body-muted mt-2 text-[var(--text-secondary)]">
              원형 밖은 실제 프로필에 보이지 않습니다. 프레임을 움직이거나 모서리와 변을 잡아 크기를 조절하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-full p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]"
          >
            <span aria-hidden="true" className="block text-lg leading-none">
              ×
            </span>
            <span className="sr-only">편집 닫기</span>
          </button>
        </div>

        <div className="mt-5 flex justify-center">
          <div
            className="relative overflow-hidden rounded-[28px] border border-[var(--border-main)] bg-[var(--bg-main)] touch-none select-none overscroll-contain"
            style={{ width: `${EDITOR_SIZE}px`, height: `${EDITOR_SIZE}px` }}
            onPointerMove={handlePointerMove}
            onPointerUp={stopInteraction}
            onPointerCancel={stopInteraction}
          >
            <img
              src={previewUrl}
              alt="편집 중인 프로필 사진"
              className="h-full w-full select-none object-contain"
              draggable={false}
              onLoad={handleImageLoad}
            />

            {cropFrame ? (
              <>
                <div className="pointer-events-none absolute inset-0" style={overlayStyle} />
                <div
                  className="absolute cursor-move border-2 border-white"
                  style={frameStyle}
                  onPointerDown={startMove}
                >
                  <div
                    className="pointer-events-none absolute inset-0 rounded-full border-2 border-white"
                    style={circleGuideStyle}
                  />
                  {HANDLE_CONFIGS.map(({ handle, cursor, width, height, style }) => (
                    <button
                      key={handle}
                      type="button"
                      aria-label={`${handle} 핸들`}
                      className="absolute rounded-md border-2 border-white bg-[var(--accent)] shadow-sm"
                      style={{
                        width: `${width}px`,
                        height: `${height}px`,
                        cursor,
                        ...style,
                      }}
                      onPointerDown={startResize(handle)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {error ? <p className="type-body-muted mt-4 text-red-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="type-label-bounded rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-2.5 text-[var(--text-main)] transition-colors hover:bg-[var(--sidebar-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !cropFrame || !imageRect}
            className="type-label-bounded rounded-xl bg-[var(--accent)] px-4 py-2.5 text-white shadow-sm transition-colors hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};
