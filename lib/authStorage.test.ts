import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAuthKeys,
  createAuthStorageAdapter,
  getRememberedLoginEmail,
  reconcileAuthStorage,
  setRememberedLoginEmail,
} from './authStorage';

const AUTH_TOKEN_KEY = 'sb-test-auth-token';
const AUTH_USER_KEY = `${AUTH_TOKEN_KEY}-user`;
const REMEMBERED_EMAIL_KEY = 'rememberedLoginEmail';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('authStorage', () => {
  it('stores remembered email in localStorage', () => {
    setRememberedLoginEmail('alice@example.com');

    expect(localStorage.getItem(REMEMBERED_EMAIL_KEY)).toBe('alice@example.com');
    expect(getRememberedLoginEmail()).toBe('alice@example.com');
  });

  it('routes auth writes to sessionStorage when auto-login is off', () => {
    const storage = createAuthStorageAdapter(() => false, AUTH_TOKEN_KEY);

    storage.setItem(AUTH_TOKEN_KEY, 'session-token');
    storage.setItem(AUTH_USER_KEY, 'session-user');

    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe('session-token');
    expect(sessionStorage.getItem(AUTH_USER_KEY)).toBe('session-user');
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it('routes auth writes to localStorage when auto-login is on', () => {
    const storage = createAuthStorageAdapter(() => true, AUTH_TOKEN_KEY);

    storage.setItem(AUTH_TOKEN_KEY, 'local-token');
    storage.setItem(AUTH_USER_KEY, 'local-user');

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('local-token');
    expect(localStorage.getItem(AUTH_USER_KEY)).toBe('local-user');
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it('removes stale session data from the inactive storage on reconcile', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'stale-local-token');
    localStorage.setItem(AUTH_USER_KEY, 'stale-local-user');
    sessionStorage.setItem(AUTH_TOKEN_KEY, 'active-session-token');
    sessionStorage.setItem(AUTH_USER_KEY, 'active-session-user');

    reconcileAuthStorage(() => false, AUTH_TOKEN_KEY);

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe('active-session-token');
    expect(sessionStorage.getItem(AUTH_USER_KEY)).toBe('active-session-user');
  });

  it('clears auth keys from both storages', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'local-token');
    localStorage.setItem(AUTH_USER_KEY, 'local-user');
    localStorage.setItem(REMEMBERED_EMAIL_KEY, 'alice@example.com');
    sessionStorage.setItem(AUTH_TOKEN_KEY, 'session-token');
    sessionStorage.setItem(AUTH_USER_KEY, 'session-user');

    clearAuthKeys(AUTH_TOKEN_KEY);

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_USER_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_USER_KEY)).toBeNull();
    expect(localStorage.getItem(REMEMBERED_EMAIL_KEY)).toBe('alice@example.com');
  });
});
