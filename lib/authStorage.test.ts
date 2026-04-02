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

const AUTH_TOKEN_KEY = 'sb-test-auth-token';
const AUTH_USER_KEY = `${AUTH_TOKEN_KEY}-user`;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('authStorage', () => {
  it('stores remembered email in localStorage and clears it on demand', () => {
    setRememberedEmail('alice@example.com');

    expect(localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY)).toBe('alice@example.com');
    expect(readRememberedEmail()).toBe('alice@example.com');

    clearRememberedEmail();

    expect(localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY)).toBeNull();
    expect(readRememberedEmail()).toBeNull();
  });

  it('stores and clears the auto-login flag in localStorage', () => {
    setAutoLoginEnabled(true);

    expect(localStorage.getItem(AUTO_LOGIN_STORAGE_KEY)).toBe('true');

    clearAutoLoginEnabled();

    expect(localStorage.getItem(AUTO_LOGIN_STORAGE_KEY)).toBeNull();
  });

  it('re-reads auto-login policy for getItem on every adapter call', () => {
    const storage = createAuthStorageAdapter();

    sessionStorage.setItem(AUTH_TOKEN_KEY, 'session-token');
    localStorage.setItem(AUTH_TOKEN_KEY, 'local-token');

    setAutoLoginEnabled(false);
    expect(storage.getItem(AUTH_TOKEN_KEY)).toBe('session-token');

    setAutoLoginEnabled(true);
    expect(storage.getItem(AUTH_TOKEN_KEY)).toBe('local-token');
  });

  it('re-reads auto-login policy for setItem on every adapter call', () => {
    const storage = createAuthStorageAdapter();

    setAutoLoginEnabled(false);
    storage.setItem(AUTH_TOKEN_KEY, 'session-token');

    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe('session-token');
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();

    setAutoLoginEnabled(true);
    storage.setItem(AUTH_TOKEN_KEY, 'local-token');

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('local-token');
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe('session-token');
  });

  it('re-reads auto-login policy for removeItem on every adapter call', () => {
    const storage = createAuthStorageAdapter();

    sessionStorage.setItem(AUTH_TOKEN_KEY, 'session-token');
    localStorage.setItem(AUTH_TOKEN_KEY, 'local-token');

    setAutoLoginEnabled(false);
    storage.removeItem(AUTH_TOKEN_KEY);

    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('local-token');

    setAutoLoginEnabled(true);
    storage.removeItem(AUTH_TOKEN_KEY);

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it('removes stale session data from sessionStorage when auto-login is on', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'active-local-token');
    localStorage.setItem(AUTH_USER_KEY, 'active-local-user');
    sessionStorage.setItem(AUTH_TOKEN_KEY, 'stale-session-token');
    sessionStorage.setItem(AUTH_USER_KEY, 'stale-session-user');

    setAutoLoginEnabled(true);
    reconcileSupabaseSessionArtifacts(AUTH_TOKEN_KEY);

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('active-local-token');
    expect(localStorage.getItem(AUTH_USER_KEY)).toBe('active-local-user');
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it('clears auth session artifacts from both storages', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'local-token');
    localStorage.setItem(AUTH_USER_KEY, 'local-user');
    sessionStorage.setItem(AUTH_TOKEN_KEY, 'session-token');
    sessionStorage.setItem(AUTH_USER_KEY, 'session-user');

    clearSupabaseSessionArtifacts(AUTH_TOKEN_KEY);

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });
});
