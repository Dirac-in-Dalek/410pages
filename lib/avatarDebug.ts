const AVATAR_DEBUG_STORAGE_KEY = 'avatar-debug-log';
const MAX_AVATAR_DEBUG_ENTRIES = 50;

type AvatarDebugLevel = 'info' | 'error';

type AvatarDebugEntry = {
  level: AvatarDebugLevel;
  event: string;
  payload?: unknown;
  timestamp: string;
};

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ note: 'unserializable payload' });
  }
}

function readAvatarDebugEntries(): AvatarDebugEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(AVATAR_DEBUG_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAvatarDebugEntry(entry: AvatarDebugEntry) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const entries = readAvatarDebugEntries();
    entries.push(entry);
    const nextEntries = entries.slice(-MAX_AVATAR_DEBUG_ENTRIES);
    window.localStorage.setItem(AVATAR_DEBUG_STORAGE_KEY, safeStringify(nextEntries));
  } catch {
    // Ignore localStorage failures while debugging.
  }
}

export function clearAvatarDebugLog() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(AVATAR_DEBUG_STORAGE_KEY);
  } catch {
    // Ignore localStorage failures while debugging.
  }
}

export function avatarDebugInfo(event: string, payload?: unknown) {
  console.info(`[avatar] ${event}`, payload);
  writeAvatarDebugEntry({
    level: 'info',
    event,
    payload,
    timestamp: new Date().toISOString(),
  });
}

export function avatarDebugError(event: string, payload?: unknown) {
  console.error(`[avatar] ${event}`, payload);
  writeAvatarDebugEntry({
    level: 'error',
    event,
    payload,
    timestamp: new Date().toISOString(),
  });
}
