import type { ProfileSessionLike } from '../contract/profile';
import { DEFAULT_USERNAME, readCachedDisplayName } from '../policy/displayNameCache';

export function readSessionDisplayName(session: ProfileSessionLike): string | null {
  const metadataName = session?.user?.user_metadata?.username;
  return typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : null;
}

export function resolveDisplayNameFallback(userId: string, session: ProfileSessionLike): string {
  return readCachedDisplayName(userId) || readSessionDisplayName(session) || DEFAULT_USERNAME;
}
