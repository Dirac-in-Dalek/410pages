import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvatarCropModal } from '../../features/settings/ui/AvatarCropModal';

describe('AvatarCropModal', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:avatar-preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('locks body scroll while the crop modal is open', () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const { unmount } = render(
      <AvatarCropModal
        file={file}
        onCancel={vi.fn()}
        onSave={vi.fn(async () => undefined)}
      />
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('');
  });

  it('renders eight resize handles around the crop frame', () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    render(
      <AvatarCropModal
        file={file}
        onCancel={vi.fn()}
        onSave={vi.fn(async () => undefined)}
      />
    );

    const previewImage = screen.getByAltText('편집 중인 프로필 사진');
    Object.defineProperty(previewImage, 'naturalWidth', { configurable: true, value: 1200 });
    Object.defineProperty(previewImage, 'naturalHeight', { configurable: true, value: 1200 });
    fireEvent.load(previewImage);

    expect(screen.getAllByRole('button', { name: /핸들$/ })).toHaveLength(8);
  });

  it('renders longer edge handles so they are visually distinct from corner handles', () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    render(
      <AvatarCropModal
        file={file}
        onCancel={vi.fn()}
        onSave={vi.fn(async () => undefined)}
      />
    );

    const previewImage = screen.getByAltText('편집 중인 프로필 사진');
    Object.defineProperty(previewImage, 'naturalWidth', { configurable: true, value: 1200 });
    Object.defineProperty(previewImage, 'naturalHeight', { configurable: true, value: 1200 });
    fireEvent.load(previewImage);

    const topHandle = screen.getByRole('button', { name: 'top 핸들' });
    const topLeftHandle = screen.getByRole('button', { name: 'top-left 핸들' });

    expect(topHandle.getAttribute('style')).toContain('width: 34px');
    expect(topHandle.getAttribute('style')).toContain('height: 14px');
    expect(topLeftHandle.getAttribute('style')).toContain('width: 18px');
    expect(topLeftHandle.getAttribute('style')).toContain('height: 18px');
  });

  it('uses the shared solid button primitive for save', () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    render(
      <AvatarCropModal
        file={file}
        onCancel={vi.fn()}
        onSave={vi.fn(async () => undefined)}
      />
    );

    const saveButton = screen.getByRole('button', { name: '저장' });

    expect(saveButton.className).toContain('ui-btn');
    expect(saveButton.className).toContain('ui-btn--solid');
  });

  it('starts handle interactions safely even when pointer capture is unavailable', () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    render(
      <AvatarCropModal
        file={file}
        onCancel={vi.fn()}
        onSave={vi.fn(async () => undefined)}
      />
    );

    const previewImage = screen.getByAltText('편집 중인 프로필 사진');
    Object.defineProperty(previewImage, 'naturalWidth', { configurable: true, value: 1200 });
    Object.defineProperty(previewImage, 'naturalHeight', { configurable: true, value: 1200 });
    fireEvent.load(previewImage);

    const moveFrame = previewImage.parentElement?.querySelector('.cursor-move') as HTMLDivElement | null;
    const topHandle = screen.getByRole('button', { name: 'top 핸들' }) as HTMLButtonElement;

    expect(moveFrame).toBeTruthy();
    if (!moveFrame) {
      return;
    }

    Object.defineProperty(moveFrame, 'setPointerCapture', { configurable: true, value: undefined });
    Object.defineProperty(topHandle, 'setPointerCapture', { configurable: true, value: undefined });

    fireEvent.pointerDown(moveFrame, { pointerId: 1, clientX: 120, clientY: 120 });
    fireEvent.pointerDown(topHandle, { pointerId: 2, clientX: 120, clientY: 60 });

    expect(screen.getByRole('dialog', { name: '프로필 사진 편집' })).toBeTruthy();
  });
});
