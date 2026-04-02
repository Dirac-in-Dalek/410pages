import { beforeEach, describe, expect, it } from 'vitest';
import {
  AUTO_LOGIN_STORAGE_KEY,
  REMEMBERED_EMAIL_STORAGE_KEY,
  clearAutoLoginEnabled,
  clearRememberedEmail,
  clearSupabaseSessionArtifacts,
  createAuthStorageAdapter,
  readRememberedEmail,
  reconcileSupabaseSessionArtifacts,
  setAutoLoginEnabled,
  setRememberedEmail,
} from './authStorage';

function createTestStorage(): Storage {
  const data = new Map<string, string>();

  return {
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    get length() {
      return data.size;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  } as Storage;
}

const localStorageRef = createTestStorage();
const sessionStorageRef = createTestStorage();

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: localStorageRef,
});

Object.defineProperty(window, 'sessionStorage', {
  configurable: true,
  value: sessionStorageRef,
});

const AUTH_TOKEN_KEY = 'sb-test-auth-token';
const AUTH_USER_KEY = `${AUTH_TOKEN_KEY}-user`;

beforeEach(() => {
  localStorageRef.clear();
  sessionStorageRef.clear();
});

describe('authStorage', () => {
  it('stores remembered email in localStorage and clears it on demand', () => {
    setRememberedEmail('alice@example.com');

    expect(localStorageRef.getItem(REMEMBERED_EMAIL_STORAGE_KEY)).toBe('alice@example.com');
    expect(readRememberedEmail()).toBe('alice@example.com');

    clearRememberedEmail();

    expect(localStorageRef.getItem(REMEMBERED_EMAIL_STORAGE_KEY)).toBeNull();
    expect(readRememberedEmail()).toBeNull();
  });

  it('stores and clears the auto-login flag in localStorage', () => {
    setAutoLoginEnabled(true);

    expect(localStorageRef.getItem(AUTO_LOGIN_STORAGE_KEY)).toBe('true');

    clearAutoLoginEnabled();

    expect(localStorageRef.getItem(AUTO_LOGIN_STORAGE_KEY)).toBeNull();
  });

  it('re-reads auto-login policy for getItem on every adapter call', () => {
    const storage = createAuthStorageAdapter();

    sessionStorageRef.setItem(AUTH_TOKEN_KEY, 'session-token');
    localStorageRef.setItem(AUTH_TOKEN_KEY, 'local-token');

    setAutoLoginEnabled(false);
    expect(storage.getItem(AUTH_TOKEN_KEY)).toBe('session-token');

    setAutoLoginEnabled(true);
    expect(storage.getItem(AUTH_TOKEN_KEY)).toBe('local-token');
  });

  it('re-reads auto-login policy for setItem on every adapter call', () => {
    const storage = createAuthStorageAdapter();

    setAutoLoginEnabled(false);
    storage.setItem(AUTH_TOKEN_KEY, 'session-token');

    expect(sessionStorageRef.getItem(AUTH_TOKEN_KEY)).toBe('session-token');
    expect(localStorageRef.getItem(AUTH_TOKEN_KEY)).toBeNull();

    setAutoLoginEnabled(true);
    storage.setItem(AUTH_TOKEN_KEY, 'local-token');

    expect(localStorageRef.getItem(AUTH_TOKEN_KEY)).toBe('local-token');
    expect(sessionStorageRef.getItem(AUTH_TOKEN_KEY)).toBe('session-token');
  });

  it('routes auth writes to sessionStorage when auto-login is off', () => {
    const storage = createAuthStorageAdapter();

    setAutoLoginEnabled(false);
    storage.setItem(AUTH_TOKEN_KEY, 'session-token');
    storage.setItem(AUTH_USER_KEY, 'session-user');

    expect(sessionStorageRef.getItem(AUTH_TOKEN_KEY)).toBe('session-token');
    expect(sessionStorageRef.getItem(AUTH_USER_KEY)).toBe('session-user');
    expect(localStorageRef.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorageRef.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it('routes auth writes to localStorage when auto-login is on', () => {
    const storage = createAuthStorageAdapter();

    setAutoLoginEnabled(true);
    storage.setItem(AUTH_TOKEN_KEY, 'local-token');
    storage.setItem(AUTH_USER_KEY, 'local-user');

    expect(localStorageRef.getItem(AUTH_TOKEN_KEY)).toBe('local-token');
    expect(localStorageRef.getItem(AUTH_USER_KEY)).toBe('local-user');
    expect(sessionStorageRef.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(sessionStorageRef.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it('re-reads auto-login policy for removeItem on every adapter call', () => {
    const storage = createAuthStorageAdapter();

    sessionStorageRef.setItem(AUTH_TOKEN_KEY, 'session-token');
    localStorageRef.setItem(AUTH_TOKEN_KEY, 'local-token');

    setAutoLoginEnabled(false);
    storage.removeItem(AUTH_TOKEN_KEY);

    expect(sessionStorageRef.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorageRef.getItem(AUTH_TOKEN_KEY)).toBe('local-token');

    setAutoLoginEnabled(true);
    storage.removeItem(AUTH_TOKEN_KEY);

    expect(localStorageRef.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it('removes stale session data from sessionStorage when auto-login is on', () => {
    localStorageRef.setItem(AUTH_TOKEN_KEY, 'active-local-token');
    localStorageRef.setItem(AUTH_USER_KEY, 'active-local-user');
    sessionStorageRef.setItem(AUTH_TOKEN_KEY, 'stale-session-token');
    sessionStorageRef.setItem(AUTH_USER_KEY, 'stale-session-user');

    setAutoLoginEnabled(true);
    reconcileSupabaseSessionArtifacts(AUTH_TOKEN_KEY);

    expect(localStorageRef.getItem(AUTH_TOKEN_KEY)).toBe('active-local-token');
    expect(localStorageRef.getItem(AUTH_USER_KEY)).toBe('active-local-user');
    expect(sessionStorageRef.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(sessionStorageRef.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it('removes stale session data from the inactive storage on reconcile when auto-login is off', () => {
    localStorageRef.setItem(AUTH_TOKEN_KEY, 'stale-local-token');
    localStorageRef.setItem(AUTH_USER_KEY, 'stale-local-user');
    sessionStorageRef.setItem(AUTH_TOKEN_KEY, 'active-session-token');
    sessionStorageRef.setItem(AUTH_USER_KEY, 'active-session-user');

    setAutoLoginEnabled(false);
    reconcileSupabaseSessionArtifacts(AUTH_TOKEN_KEY);

    expect(localStorageRef.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorageRef.getItem(AUTH_USER_KEY)).toBeNull();
    expect(sessionStorageRef.getItem(AUTH_TOKEN_KEY)).toBe('active-session-token');
    expect(sessionStorageRef.getItem(AUTH_USER_KEY)).toBe('active-session-user');
  });

  it('clears auth session artifacts from both storages', () => {
    localStorageRef.setItem(AUTH_TOKEN_KEY, 'local-token');
    localStorageRef.setItem(AUTH_USER_KEY, 'local-user');
    sessionStorageRef.setItem(AUTH_TOKEN_KEY, 'session-token');
    sessionStorageRef.setItem(AUTH_USER_KEY, 'session-user');

    clearSupabaseSessionArtifacts(AUTH_TOKEN_KEY);

    expect(localStorageRef.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorageRef.getItem(AUTH_USER_KEY)).toBeNull();
    expect(sessionStorageRef.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(sessionStorageRef.getItem(AUTH_USER_KEY)).toBeNull();
  });
});
