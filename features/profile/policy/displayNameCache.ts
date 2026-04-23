export const DEFAULT_USERNAME = 'Researcher';
export const PROFILE_DISPLAY_NAME_STORAGE_PREFIX = 'profileDisplayName:';

function getDisplayNameStorageKey(userId: string) {
  return `${PROFILE_DISPLAY_NAME_STORAGE_PREFIX}${userId}`;
}

export function readCachedDisplayName(userId: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cached = window.localStorage.getItem(getDisplayNameStorageKey(userId))?.trim();
    return cached || null;
  } catch {
    return null;
  }
}

export function writeCachedDisplayName(userId: string, displayName: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getDisplayNameStorageKey(userId), displayName);
  } catch {
    // Ignore localStorage write failures in restricted environments.
  }
}

export function clearCachedDisplayName(userId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(getDisplayNameStorageKey(userId));
  } catch {
    // Ignore localStorage write failures in restricted environments.
  }
}
