import { api } from '../../../lib/api';
import { avatarDebugError, avatarDebugInfo } from '../../../lib/avatarDebug';
import { getSupabaseClient } from '../../../lib/supabase';
import type {
  DisplayNameSaveResult,
  ProfileRecord,
  ProfileSessionLike,
  ProfileSnapshot,
} from '../contract/profile';
import { writeCachedDisplayName } from '../policy/displayNameCache';
import { resolveDisplayNameFallback } from './profileIdentity';

export function buildFallbackProfileSnapshot(
  userId: string,
  session: ProfileSessionLike,
): ProfileSnapshot {
  return {
    username: resolveDisplayNameFallback(userId, session),
    avatarUrl: null,
  };
}

export async function fetchProfileSnapshot(
  userId: string,
  session: ProfileSessionLike,
): Promise<ProfileSnapshot> {
  const fallback = buildFallbackProfileSnapshot(userId, session);
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('username, avatar_path, avatar_url')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  const profile = data as ProfileRecord;
  const nextUsername =
    typeof profile?.username === 'string' && profile.username.trim()
      ? profile.username.trim()
      : fallback.username;
  const nextAvatarPath = api.resolveStoredProfileAvatarPath(
    profile?.avatar_path || profile?.avatar_url || null,
  );

  writeCachedDisplayName(userId, nextUsername);

  return {
    username: nextUsername,
    avatarUrl: nextAvatarPath ? api.getProfileAvatarPublicUrl(nextAvatarPath) : null,
  };
}

export async function saveProfileDisplayName(
  userId: string,
  currentUsername: string,
  newUsername: string,
): Promise<DisplayNameSaveResult> {
  const trimmed = newUsername.trim();

  if (!trimmed) {
    return { ok: false, changed: false, username: null };
  }

  if (trimmed === currentUsername.trim()) {
    return { ok: true, changed: false, username: currentUsername };
  }

  await api.updateProfile(userId, { username: trimmed });
  writeCachedDisplayName(userId, trimmed);

  return { ok: true, changed: true, username: trimmed };
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  try {
    avatarDebugInfo('upload flow started', {
      userId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    const nextAvatarPath = await api.uploadProfileAvatar(userId, file);

    avatarDebugInfo('storage upload succeeded', {
      userId,
      avatarPath: nextAvatarPath,
    });

    const avatarVersion = Date.now();
    await api.updateProfile(userId, { avatar_path: nextAvatarPath });

    avatarDebugInfo('profile update succeeded', {
      userId,
      avatarPath: nextAvatarPath,
      avatarVersion,
    });

    return api.getProfileAvatarPublicUrl(nextAvatarPath, avatarVersion);
  } catch (error) {
    avatarDebugError('upload flow failed', error);
    throw error;
  }
}
