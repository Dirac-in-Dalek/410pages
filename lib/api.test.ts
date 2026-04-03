import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpload = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockStorageFrom = vi.fn(() => ({
  upload: mockUpload,
  update: mockUpdate,
  remove: mockRemove,
  getPublicUrl: mockGetPublicUrl,
}));

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({
    storage: {
      from: mockStorageFrom,
    },
  }),
}));

import { api, PROFILE_AVATAR_BUCKET } from './api';

describe('api.uploadProfileAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    mockUpload.mockResolvedValue({ error: null });
    mockUpdate.mockResolvedValue({ error: null });
    mockRemove.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          'https://yyfapuwgvimbjsebfifb.supabase.co/storage/v1/object/public/profile-avatars/user-1/avatar',
      },
    });
  });

  it('uploads the first avatar to a single stable object path', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    const nextUrl = await api.uploadProfileAvatar('user-1', file, null);

    expect(mockStorageFrom).toHaveBeenCalledWith(PROFILE_AVATAR_BUCKET);
    expect(mockUpload).toHaveBeenCalledWith('user-1/avatar', file, {
      upsert: false,
      contentType: 'image/png',
    });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockGetPublicUrl).toHaveBeenCalledWith('user-1/avatar');
    expect(nextUrl).toBe(
      'https://yyfapuwgvimbjsebfifb.supabase.co/storage/v1/object/public/profile-avatars/user-1/avatar?v=1700000000000'
    );
  });

  it('updates the existing avatar in place when the stable object already exists', async () => {
    const file = new File(['avatar-2'], 'avatar-2.png', { type: 'image/png' });

    await api.uploadProfileAvatar(
      'user-1',
      file,
      'https://yyfapuwgvimbjsebfifb.supabase.co/storage/v1/object/public/profile-avatars/user-1/avatar?v=old'
    );

    expect(mockUpdate).toHaveBeenCalledWith('user-1/avatar', file, {
      contentType: 'image/png',
    });
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('removes a legacy avatar object before uploading the single stable avatar object', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    await api.uploadProfileAvatar(
      'user-1',
      file,
      'https://yyfapuwgvimbjsebfifb.supabase.co/storage/v1/object/public/profile-avatars/user-1/avatar-1699999999000.png?v=old'
    );

    expect(mockRemove).toHaveBeenCalledWith(['user-1/avatar-1699999999000.png']);
    expect(mockUpload).toHaveBeenCalledWith('user-1/avatar', file, {
      upsert: false,
      contentType: 'image/png',
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
