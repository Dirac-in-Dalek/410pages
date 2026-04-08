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

const EDITOR_SIZE = 320;
const HANDLE_SIZE = 18;

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
      startFrame: AvatarCropFrame;
    }
  | {
      type: 'resize';
      handle: AvatarCropHandle;
      originX: number;
      originY: number;
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
    if (!file) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!interactionRef.current || !imageRect) {
        return;
      }

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

    const stopInteraction = () => {
      interactionRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopInteraction);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopInteraction);
    };
  }, [file, imageRect]);

  if (!file || !previewUrl) {
    return null;
  }

  const startMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cropFrame) {
      return;
    }

    interactionRef.current = {
      type: 'move',
      originX: event.clientX,
      originY: event.clientY,
      startFrame: cropFrame,
    };
  };

  const startResize = (handle: AvatarCropHandle) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!cropFrame) {
      return;
    }

    interactionRef.current = {
      type: 'resize',
      handle,
      originX: event.clientX,
      originY: event.clientY,
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
      const croppedFile = await cropAvatarFile(previewUrl, file, cropFrame, imageRect);
      await onSave(croppedFile);
    } catch (saveError) {
      console.error('Error creating cropped avatar:', saveError);
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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
      <div
        aria-label="프로필 사진 편집"
        aria-modal="true"
        role="dialog"
        className="w-full max-w-[520px] rounded-[28px] border border-[var(--border-main)] bg-[var(--bg-card)] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="type-display-bounded text-[var(--text-main)]">프로필 사진 편집</h3>
            <p className="type-body-muted mt-2 text-[var(--text-secondary)]">
              원형 밖은 실제 프로필에 보이지 않습니다. 프레임을 움직이거나 모서리를 잡아 크기를 조절하세요.
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
            className="relative overflow-hidden rounded-[28px] border border-[var(--border-main)] bg-[var(--bg-main)]"
            style={{ width: `${EDITOR_SIZE}px`, height: `${EDITOR_SIZE}px` }}
          >
            <img
              src={previewUrl}
              alt="편집 중인 프로필 사진"
              className="h-full w-full select-none object-contain"
              draggable={false}
              onLoad={handleImageLoad}
            />

            {cropFrame ? (
              <div
                className="absolute cursor-move rounded-full border-2 border-white"
                style={{
                  ...frameStyle,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.48)',
                }}
                onPointerDown={startMove}
              >
                {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as AvatarCropHandle[]).map((handle) => {
                  const isLeft = handle.includes('left');
                  const isTop = handle.includes('top');

                  return (
                    <button
                      key={handle}
                      type="button"
                      aria-label={`${handle} 핸들`}
                      className="absolute rounded-full border-2 border-white bg-[var(--accent)]"
                      style={{
                        width: `${HANDLE_SIZE}px`,
                        height: `${HANDLE_SIZE}px`,
                        left: isLeft ? `-${HANDLE_SIZE / 2}px` : undefined,
                        right: isLeft ? undefined : `-${HANDLE_SIZE / 2}px`,
                        top: isTop ? `-${HANDLE_SIZE / 2}px` : undefined,
                        bottom: isTop ? undefined : `-${HANDLE_SIZE / 2}px`,
                      }}
                      onPointerDown={startResize(handle)}
                    />
                  );
                })}
              </div>
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
            className="type-label-bounded rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[var(--accent-contrast)] transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};
