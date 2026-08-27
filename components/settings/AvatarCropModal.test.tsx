import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvatarCropModal } from '../../features/settings/ui/AvatarCropModal';

const { cropAvatarFileMock } = vi.hoisted(() => ({ cropAvatarFileMock: vi.fn() }));

vi.mock('../../lib/avatarCrop', async () => {
  const actual = await vi.importActual<typeof import('../../lib/avatarCrop')>('../../lib/avatarCrop');
  return { ...actual, cropAvatarFile: (...args: unknown[]) => cropAvatarFileMock(...args) };
});

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
    cropAvatarFileMock.mockReset().mockResolvedValue(
      new File(['cropped'], 'avatar-cropped.png', { type: 'image/png' })
    );
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
        onSave={vi.fn(async () => true)}
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
        onSave={vi.fn(async () => true)}
      />
    );

    const previewImage = screen.getByAltText('편집 중인 프로필 사진');
    Object.defineProperty(previewImage, 'naturalWidth', { configurable: true, value: 1200 });
    Object.defineProperty(previewImage, 'naturalHeight', { configurable: true, value: 1200 });
    fireEvent.load(previewImage);

    expect(document.querySelectorAll('button[aria-label$="핸들"]')).toHaveLength(8);
  });

  it('renders longer edge handles so they are visually distinct from corner handles', () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    render(
      <AvatarCropModal
        file={file}
        onCancel={vi.fn()}
        onSave={vi.fn(async () => true)}
      />
    );

    const previewImage = screen.getByAltText('편집 중인 프로필 사진');
    Object.defineProperty(previewImage, 'naturalWidth', { configurable: true, value: 1200 });
    Object.defineProperty(previewImage, 'naturalHeight', { configurable: true, value: 1200 });
    fireEvent.load(previewImage);

    const topHandle = document.querySelector('button[aria-label="top 핸들"]') as HTMLButtonElement;
    const topLeftHandle = document.querySelector('button[aria-label="top-left 핸들"]') as HTMLButtonElement;

    expect(topHandle.getAttribute('style')).toContain('width: 34px');
    expect(topHandle.getAttribute('style')).toContain('height: 20px');
    expect(topLeftHandle.getAttribute('style')).toContain('width: 18px');
    expect(topLeftHandle.getAttribute('style')).toContain('height: 18px');
  });

  it('uses the shared solid button primitive for save', () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    render(
      <AvatarCropModal
        file={file}
        onCancel={vi.fn()}
        onSave={vi.fn(async () => true)}
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
        onSave={vi.fn(async () => true)}
      />
    );

    const previewImage = screen.getByAltText('편집 중인 프로필 사진');
    Object.defineProperty(previewImage, 'naturalWidth', { configurable: true, value: 1200 });
    Object.defineProperty(previewImage, 'naturalHeight', { configurable: true, value: 1200 });
    fireEvent.load(previewImage);

    const moveFrame = previewImage.parentElement?.querySelector('.cursor-move') as HTMLDivElement | null;
    const topHandle = document.querySelector('button[aria-label="top 핸들"]') as HTMLButtonElement;

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

  it('moves and resizes the crop frame with keyboard controls', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    render(<AvatarCropModal file={file} onCancel={vi.fn()} onSave={vi.fn(async () => true)} />);
    const previewImage = screen.getByAltText('편집 중인 프로필 사진');
    Object.defineProperty(previewImage, 'naturalWidth', { configurable: true, value: 1200 });
    Object.defineProperty(previewImage, 'naturalHeight', { configurable: true, value: 1200 });
    fireEvent.load(previewImage);

    const cropRegion = screen.getByRole('region', { name: '자르기 영역' });
    const initialLeft = cropRegion.style.left;
    const initialWidth = cropRegion.style.width;
    cropRegion.focus();
    fireEvent.keyDown(cropRegion, { key: 'ArrowRight' });
    expect(cropRegion.style.left).not.toBe(initialLeft);
    fireEvent.keyDown(cropRegion, { key: 'ArrowRight', shiftKey: true });
    expect(cropRegion.style.width).not.toBe(initialWidth);
  });

  it('contains focus, closes with Escape, and restores the trigger', async () => {
    const user = userEvent.setup();
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    const Harness: React.FC = () => {
      const [activeFile, setActiveFile] = React.useState<File | null>(null);
      return (
        <>
          <button type="button" onClick={() => setActiveFile(file)}>사진 편집 열기</button>
          <AvatarCropModal
            file={activeFile}
            onCancel={() => setActiveFile(null)}
            onSave={vi.fn(async () => true)}
          />
        </>
      );
    };

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: '사진 편집 열기' });
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole('button', { name: '편집 닫기' })).toBe(document.activeElement));
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: '취소' })).toBe(document.activeElement);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '프로필 사진 편집' })).toBeNull();
    expect(trigger).toBe(document.activeElement);
  });

  it('prevents duplicate crop saves and keeps upload failure visible in the modal', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const onSave = vi.fn(async () => false);
    render(<AvatarCropModal file={file} onCancel={vi.fn()} onSave={onSave} />);
    const previewImage = screen.getByAltText('편집 중인 프로필 사진');
    Object.defineProperty(previewImage, 'naturalWidth', { configurable: true, value: 1200 });
    Object.defineProperty(previewImage, 'naturalHeight', { configurable: true, value: 1200 });
    fireEvent.load(previewImage);

    const saveButton = screen.getByRole('button', { name: '저장' });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(cropAvatarFileMock).toHaveBeenCalledTimes(1);
    expect((await screen.findByRole('alert')).textContent).toBe('프로필 사진 저장에 실패했습니다.');
    expect(screen.getByRole('dialog', { name: '프로필 사진 편집' })).toBeTruthy();
  });
});
