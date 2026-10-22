export type BrowserStorageKind = 'localStorage' | 'sessionStorage';

export function getBrowserStorage(kind: BrowserStorageKind = 'localStorage'): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window[kind];
  } catch {
    return null;
  }
}

/** Distinguish a missing value from an unavailable read when replacing saved drafts. */
export function readStorageItem(key: string, storage = getBrowserStorage()) {
  try {
    if (!storage) return { ok: false, value: null } as const;
    return { ok: true, value: storage.getItem(key) } as const;
  } catch {
    return { ok: false, value: null } as const;
  }
}

export function safeGetStorageItem(key: string, storage = getBrowserStorage()): string | null {
  return readStorageItem(key, storage).value;
}

export function safeSetStorageItem(key: string, value: string, storage = getBrowserStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveStorageItem(key: string, storage = getBrowserStorage()): boolean {
  try {
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
