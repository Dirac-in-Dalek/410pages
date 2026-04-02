export const REMEMBERED_EMAIL_STORAGE_KEY = 'rememberedLoginEmail';
export const AUTO_LOGIN_STORAGE_KEY = 'autoLoginEnabled';

const SUPABASE_USER_SUFFIX = '-user';

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  } as Storage;
}

const memoryLocalStorage = createMemoryStorage();
const memorySessionStorage = createMemoryStorage();

function setGlobalStorage(kind: 'localStorage' | 'sessionStorage', storage: Storage): void {
  try {
    Object.defineProperty(globalThis, kind, {
      configurable: true,
      enumerable: true,
      value: storage,
      writable: true,
    });
  } catch {
    try {
      (globalThis as Record<string, unknown>)[kind] = storage;
    } catch {
      // Ignore environments where globals are read-only.
    }
  }

  if (typeof window !== 'undefined') {
    try {
      Object.defineProperty(window, kind, {
        configurable: true,
        enumerable: true,
        value: storage,
        writable: true,
      });
    } catch {
      try {
        (window as Record<string, unknown>)[kind] = storage;
      } catch {
        // Ignore environments where window storage is read-only.
      }
    }
  }
}

function isStorageLike(value: unknown): value is Storage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Storage).getItem === 'function' &&
      typeof (value as Storage).setItem === 'function' &&
      typeof (value as Storage).removeItem === 'function' &&
      typeof (value as Storage).clear === 'function'
  );
}

function ensureStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storage = window[kind];

    if (isStorageLike(storage)) {
      return storage;
    }
  } catch {
    // Fall through to the in-memory shim.
  }

  const fallback = kind === 'localStorage' ? memoryLocalStorage : memorySessionStorage;
  setGlobalStorage(kind, fallback);
  return fallback;
}

function getBrowserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  return ensureStorage(kind);
}

ensureStorage('localStorage');
ensureStorage('sessionStorage');

function getLocalStorage(): Storage | null {
  return getBrowserStorage('localStorage');
}

function getSessionStorage(): Storage | null {
  return getBrowserStorage('sessionStorage');
}

function readStorageItem(storage: Storage | null, key: string): string | null {
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageItem(storage: Storage | null, key: string, value: string): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage access failures in non-browser or restricted environments.
  }
}

function removeStorageItem(storage: Storage | null, key: string): void {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage access failures in non-browser or restricted environments.
  }
}

function getAuthStorageForPolicy(autoLoginEnabled: boolean): Storage | null {
  return autoLoginEnabled ? getLocalStorage() : getSessionStorage();
}

function getInactiveAuthStorage(autoLoginEnabled: boolean): Storage | null {
  return autoLoginEnabled ? getSessionStorage() : getLocalStorage();
}

export function readRememberedEmail(): string | null {
  return readStorageItem(getLocalStorage(), REMEMBERED_EMAIL_STORAGE_KEY);
}

export function setRememberedEmail(email: string): void {
  writeStorageItem(getLocalStorage(), REMEMBERED_EMAIL_STORAGE_KEY, email);
}

export function clearRememberedEmail(): void {
  removeStorageItem(getLocalStorage(), REMEMBERED_EMAIL_STORAGE_KEY);
}

export function readAutoLoginEnabled(): boolean {
  return readStorageItem(getLocalStorage(), AUTO_LOGIN_STORAGE_KEY) === 'true';
}

export function setAutoLoginEnabled(enabled: boolean): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(AUTO_LOGIN_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage access failures in non-browser or restricted environments.
  }
}

export function clearAutoLoginEnabled(): void {
  removeStorageItem(getLocalStorage(), AUTO_LOGIN_STORAGE_KEY);
}

export function clearSupabaseSessionArtifacts(storageKey: string): void {
  const keys = [storageKey, `${storageKey}${SUPABASE_USER_SUFFIX}`];

  for (const storage of [getLocalStorage(), getSessionStorage()]) {
    for (const key of keys) {
      removeStorageItem(storage, key);
    }
  }
}

export function reconcileSupabaseSessionArtifacts(storageKey: string): void {
  const inactiveStorage = getInactiveAuthStorage(readAutoLoginEnabled());
  const keys = [storageKey, `${storageKey}${SUPABASE_USER_SUFFIX}`];

  for (const key of keys) {
    removeStorageItem(inactiveStorage, key);
  }
}

export function createAuthStorageAdapter(): StorageAdapter {
  return {
    getItem(key: string) {
      return readStorageItem(getAuthStorageForPolicy(readAutoLoginEnabled()), key);
    },
    setItem(key: string, value: string) {
      writeStorageItem(getAuthStorageForPolicy(readAutoLoginEnabled()), key, value);
    },
    removeItem(key: string) {
      removeStorageItem(getAuthStorageForPolicy(readAutoLoginEnabled()), key);
    },
  };
}
