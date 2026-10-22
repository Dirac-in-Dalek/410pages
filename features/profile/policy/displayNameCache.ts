import { safeGetStorageItem, safeSetStorageItem, safeRemoveStorageItem } from '../../../shared/lib/browserStorage';

export const DEFAULT_USERNAME = 'Researcher';
export const PROFILE_DISPLAY_NAME_STORAGE_PREFIX = 'profileDisplayName:';

function getDisplayNameStorageKey(userId: string) {
  return `${PROFILE_DISPLAY_NAME_STORAGE_PREFIX}${userId}`;
}

export function readCachedDisplayName(userId: string): string | null {
  return safeGetStorageItem(getDisplayNameStorageKey(userId))?.trim() || null;
}

export function writeCachedDisplayName(userId: string, displayName: string): void {
  safeSetStorageItem(getDisplayNameStorageKey(userId), displayName);
}

export function clearCachedDisplayName(userId: string): void {
  safeRemoveStorageItem(getDisplayNameStorageKey(userId));
}
