import { getBrowserStorage, safeGetStorageItem, safeSetStorageItem, safeRemoveStorageItem } from '../../../shared/lib/browserStorage';
import type { StorageAdapter } from '../contract/storage';

export const REMEMBERED_EMAIL_STORAGE_KEY = 'rememberedLoginEmail';
export const AUTO_LOGIN_STORAGE_KEY = 'autoLoginEnabled';

const SUPABASE_USER_SUFFIX = '-user';

const getLocalStorage = () => getBrowserStorage('localStorage');
const getSessionStorage = () => getBrowserStorage('sessionStorage');

function getAuthStorageForPolicy(autoLoginEnabled: boolean): Storage | null {
  return autoLoginEnabled ? getLocalStorage() : getSessionStorage();
}

function getInactiveAuthStorage(autoLoginEnabled: boolean): Storage | null {
  return autoLoginEnabled ? getSessionStorage() : getLocalStorage();
}

export function readRememberedEmail(): string | null {
  return safeGetStorageItem(REMEMBERED_EMAIL_STORAGE_KEY, getLocalStorage());
}

export function setRememberedEmail(email: string): void {
  safeSetStorageItem(REMEMBERED_EMAIL_STORAGE_KEY, email, getLocalStorage());
}

export function clearRememberedEmail(): void {
  safeRemoveStorageItem(REMEMBERED_EMAIL_STORAGE_KEY, getLocalStorage());
}

export function readAutoLoginEnabled(): boolean {
  return safeGetStorageItem(AUTO_LOGIN_STORAGE_KEY, getLocalStorage()) === 'true';
}

export function setAutoLoginEnabled(enabled: boolean): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  safeSetStorageItem(AUTO_LOGIN_STORAGE_KEY, enabled ? 'true' : 'false', storage);
}

export function clearAutoLoginEnabled(): void {
  safeRemoveStorageItem(AUTO_LOGIN_STORAGE_KEY, getLocalStorage());
}

export function clearSupabaseSessionArtifacts(storageKey: string): void {
  const keys = [storageKey, `${storageKey}${SUPABASE_USER_SUFFIX}`];

  for (const storage of [getLocalStorage(), getSessionStorage()]) {
    for (const key of keys) {
      safeRemoveStorageItem(key, storage);
    }
  }
}

export function reconcileSupabaseSessionArtifacts(
  storageKey: string,
  autoLoginEnabled = readAutoLoginEnabled(),
): void {
  const inactiveStorage = getInactiveAuthStorage(autoLoginEnabled);
  const keys = [storageKey, `${storageKey}${SUPABASE_USER_SUFFIX}`];

  for (const key of keys) {
    safeRemoveStorageItem(key, inactiveStorage);
  }
}

export function createAuthStorageAdapter(): StorageAdapter {
  return {
    getItem(key: string) {
      return safeGetStorageItem(key, getAuthStorageForPolicy(readAutoLoginEnabled()));
    },
    setItem(key: string, value: string) {
      safeSetStorageItem(key, value, getAuthStorageForPolicy(readAutoLoginEnabled()));
    },
    removeItem(key: string) {
      safeRemoveStorageItem(key, getAuthStorageForPolicy(readAutoLoginEnabled()));
    },
  };
}
