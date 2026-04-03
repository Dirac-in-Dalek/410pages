# Auth Session Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `아이디 기억` and `자동로그인` controls that persist email separately from auth session state, so non-persistent logins survive refreshes but require login again after the tab/browser is closed unless auto-login is enabled.

**Architecture:** Introduce a dedicated auth storage helper that owns login preference keys, a per-call Supabase storage adapter, and stale-session cleanup. Keep a single lazy Supabase client configured with `persistSession: true`, but route session storage to `sessionStorage` or `localStorage` based on the saved auto-login preference. Update login and logout flows to write preferences before sign-in, reconcile mismatched storage on startup, and clear auth artifacts from both storages on logout.

**Tech Stack:** React 19, TypeScript, Vite, Supabase JS v2, Vitest, JSDOM

---

## File Map

- Create: `lib/authStorage.ts`
  - Owns `rememberedLoginEmail` and `autoLoginEnabled`
  - Exposes the dynamic Supabase auth storage adapter
  - Handles stale session cleanup and logout cleanup for both storages
- Create: `lib/authStorage.test.ts`
  - Verifies storage routing, remembered email persistence, stale session reconciliation, and dual-storage cleanup
- Create: `vitest.config.ts`
  - Adds a minimal JSDOM test runner for browser storage tests
- Modify: `package.json`
  - Adds the `test` script; dependencies come from `npm install -D vitest jsdom`
- Modify: `lib/supabase.ts`
  - Replaces the eager exported client with a lazy singleton getter
  - Exports the derived Supabase auth storage key
- Modify: `lib/api.ts`
  - Switches to the lazy Supabase client getter
- Modify: `hooks/useAuthStatus.ts`
  - Reconciles stale storage before `getSession()`
  - Clears auto-login and both auth storage locations on logout
- Modify: `Auth.tsx`
  - Adds `아이디 기억` and `자동로그인` checkboxes
  - Hydrates remembered email and previous auto-login state
  - Writes preferences at the correct point in the sign-in flow

### Task 1: Add Test Harness And Failing Storage Tests

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/authStorage.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install the test dependencies**

Run:

```bash
npm install -D vitest jsdom
```

Expected: `package.json` and `package-lock.json` update with `vitest` and `jsdom` in `devDependencies`.

- [ ] **Step 2: Add the Vitest config and npm script**

Update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

Create `vitest.config.ts`:

```ts
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    clearMocks: true,
  },
});
```

- [ ] **Step 3: Write the failing storage-policy tests**

Create `lib/authStorage.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
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

const AUTH_KEY = 'sb-project-auth-token';

const resetBrowserStorage = () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
};

describe('authStorage', () => {
  afterEach(() => {
    clearAutoLoginEnabled();
    clearRememberedEmail();
    resetBrowserStorage();
  });

  it('stores remembered email in localStorage', () => {
    setRememberedEmail('reader@example.com');

    expect(readRememberedEmail()).toBe('reader@example.com');
    expect(window.localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY)).toBe('reader@example.com');
  });

  it('routes auth writes to sessionStorage when auto-login is off', () => {
    const storage = createAuthStorageAdapter();
    storage.setItem(AUTH_KEY, JSON.stringify({ access_token: 'session-token' }));

    expect(window.sessionStorage.getItem(AUTH_KEY)).toContain('session-token');
    expect(window.localStorage.getItem(AUTH_KEY)).toBeNull();
  });

  it('routes auth writes to localStorage when auto-login is on', () => {
    setAutoLoginEnabled(true);

    const storage = createAuthStorageAdapter();
    storage.setItem(AUTH_KEY, JSON.stringify({ access_token: 'persistent-token' }));

    expect(window.localStorage.getItem(AUTH_KEY)).toContain('persistent-token');
    expect(window.sessionStorage.getItem(AUTH_KEY)).toBeNull();
    expect(window.localStorage.getItem(AUTO_LOGIN_STORAGE_KEY)).toBe('true');
  });

  it('removes stale session data from the inactive storage on reconcile', () => {
    window.localStorage.setItem(AUTH_KEY, 'stale-local-session');

    reconcileSupabaseSessionArtifacts(AUTH_KEY);

    expect(window.localStorage.getItem(AUTH_KEY)).toBeNull();
  });

  it('clears auth keys from both storages', () => {
    window.localStorage.setItem(AUTH_KEY, 'local-session');
    window.localStorage.setItem(`${AUTH_KEY}-user`, '{"id":"user-1"}');
    window.sessionStorage.setItem(AUTH_KEY, 'tab-session');
    window.sessionStorage.setItem(`${AUTH_KEY}-user`, '{"id":"user-1"}');

    clearSupabaseSessionArtifacts(AUTH_KEY);

    expect(window.localStorage.getItem(AUTH_KEY)).toBeNull();
    expect(window.localStorage.getItem(`${AUTH_KEY}-user`)).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(`${AUTH_KEY}-user`)).toBeNull();
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail for the right reason**

Run:

```bash
npm test -- lib/authStorage.test.ts
```

Expected: FAIL with a module-resolution error for `./authStorage` or missing exported members, because the helper has not been implemented yet.

- [ ] **Step 5: Commit the test harness and failing tests**

```bash
git add package.json package-lock.json vitest.config.ts lib/authStorage.test.ts
git commit -m "test: add auth storage policy coverage"
```

### Task 2: Implement The Auth Storage Helper

**Files:**
- Create: `lib/authStorage.ts`
- Test: `lib/authStorage.test.ts`

- [ ] **Step 1: Implement the storage helper with preference and cleanup APIs**

Create `lib/authStorage.ts`:

```ts
import type { SupportedStorage } from '@supabase/auth-js';

export const REMEMBERED_EMAIL_STORAGE_KEY = 'rememberedLoginEmail';
export const AUTO_LOGIN_STORAGE_KEY = 'autoLoginEnabled';

const hasBrowserStorage = () =>
  typeof window !== 'undefined' &&
  typeof window.localStorage !== 'undefined' &&
  typeof window.sessionStorage !== 'undefined';

const getLocalStorage = (): Storage | null => (hasBrowserStorage() ? window.localStorage : null);
const getSessionStorage = (): Storage | null => (hasBrowserStorage() ? window.sessionStorage : null);

const authKeyNames = (storageKey: string) => [storageKey, `${storageKey}-user`];
const getPreferredSessionStorage = (): Storage | null =>
  readAutoLoginEnabled() ? getLocalStorage() : getSessionStorage();

export const readRememberedEmail = () => getLocalStorage()?.getItem(REMEMBERED_EMAIL_STORAGE_KEY) ?? '';

export const setRememberedEmail = (email: string) => {
  const storage = getLocalStorage();
  if (!storage) return;

  const trimmedEmail = email.trim();
  if (trimmedEmail) {
    storage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, trimmedEmail);
    return;
  }

  storage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
};

export const clearRememberedEmail = () => {
  getLocalStorage()?.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
};

export const readAutoLoginEnabled = () => getLocalStorage()?.getItem(AUTO_LOGIN_STORAGE_KEY) === 'true';

export const setAutoLoginEnabled = (enabled: boolean) => {
  const storage = getLocalStorage();
  if (!storage) return;

  if (enabled) {
    storage.setItem(AUTO_LOGIN_STORAGE_KEY, 'true');
    return;
  }

  storage.removeItem(AUTO_LOGIN_STORAGE_KEY);
};

export const clearAutoLoginEnabled = () => {
  getLocalStorage()?.removeItem(AUTO_LOGIN_STORAGE_KEY);
};

export const clearSupabaseSessionArtifacts = (storageKey: string) => {
  [getLocalStorage(), getSessionStorage()].forEach((storage) => {
    if (!storage) return;
    authKeyNames(storageKey).forEach((key) => storage.removeItem(key));
  });
};

export const reconcileSupabaseSessionArtifacts = (storageKey: string) => {
  const inactiveStorage = readAutoLoginEnabled() ? getSessionStorage() : getLocalStorage();
  if (!inactiveStorage) return;

  authKeyNames(storageKey).forEach((key) => inactiveStorage.removeItem(key));
};

export const createAuthStorageAdapter = (): SupportedStorage => ({
  getItem(key) {
    return getPreferredSessionStorage()?.getItem(key) ?? null;
  },
  setItem(key, value) {
    getPreferredSessionStorage()?.setItem(key, value);
  },
  removeItem(key) {
    getPreferredSessionStorage()?.removeItem(key);
  },
});
```

- [ ] **Step 2: Run the targeted tests**

Run:

```bash
npm test -- lib/authStorage.test.ts
```

Expected: PASS

- [ ] **Step 3: Run the full test suite to confirm the new harness is stable**

Run:

```bash
npm test
```

Expected: PASS with the same five `authStorage` tests.

- [ ] **Step 4: Run a type-and-bundle smoke test**

Run:

```bash
npm run build
```

Expected: PASS

- [ ] **Step 5: Commit the helper implementation**

```bash
git add lib/authStorage.ts lib/authStorage.test.ts package.json package-lock.json vitest.config.ts
git commit -m "feat: add auth storage routing helper"
```

### Task 3: Wire The Storage Helper Into Supabase And Auth Lifecycle

**Files:**
- Modify: `lib/supabase.ts`
- Modify: `lib/api.ts`
- Modify: `hooks/useAuthStatus.ts`
- Test: `lib/authStorage.test.ts`

- [ ] **Step 1: Replace the eager Supabase export with a lazy singleton getter**

Update `lib/supabase.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAuthStorageAdapter } from './authStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase Environment Variables');
}

export const SUPABASE_AUTH_STORAGE_KEY = supabaseUrl
  ? `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
  : 'sb-fallback-auth-token';

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = () => {
  if (supabaseClient) return supabaseClient;

  supabaseClient = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: SUPABASE_AUTH_STORAGE_KEY,
      storage: createAuthStorageAdapter(),
    },
  });

  return supabaseClient;
};
```

- [ ] **Step 2: Update the data layer and auth hook to use the new client and cleanup APIs**

Update the top of `lib/api.ts`:

```ts
import { getSupabaseClient } from './supabase';
import { Citation, CitationSourceInput, Note, Project } from '../types';

const supabase = getSupabaseClient();
```

Update `hooks/useAuthStatus.ts`:

```ts
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  clearAutoLoginEnabled,
  clearSupabaseSessionArtifacts,
  reconcileSupabaseSessionArtifacts,
} from '../lib/authStorage';
import { getSupabaseClient, SUPABASE_AUTH_STORAGE_KEY } from '../lib/supabase';

export const useAuthStatus = () => {
  const [session, setSession] = useState<any>(null);
  const [username, setUsername] = useState('Researcher');
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      if (data?.username) {
        setUsername(data.username);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async (newUsername: string) => {
    if (!session) return;
    try {
      await api.updateProfile(session.user.id, newUsername);
      setUsername(newUsername);
    } catch (error) {
      console.error('Error updating username:', error);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    clearAutoLoginEnabled();
    clearSupabaseSessionArtifacts(SUPABASE_AUTH_STORAGE_KEY);
  };

  useEffect(() => {
    const supabase = getSupabaseClient();
    reconcileSupabaseSessionArtifacts(SUPABASE_AUTH_STORAGE_KEY);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUsername('Researcher');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    username,
    loading,
    setLoading,
    handleUpdateUsername,
    handleSignOut,
  };
};
```

- [ ] **Step 3: Run the targeted tests again to ensure the helper contract still passes**

Run:

```bash
npm test -- lib/authStorage.test.ts
```

Expected: PASS

- [ ] **Step 4: Build the app after the Supabase client refactor**

Run:

```bash
npm run build
```

Expected: PASS

- [ ] **Step 5: Commit the Supabase integration changes**

```bash
git add lib/supabase.ts lib/api.ts hooks/useAuthStatus.ts lib/authStorage.ts lib/authStorage.test.ts
git commit -m "refactor: route auth session storage by policy"
```

### Task 4: Add Login Preferences To The Auth Screen And Verify The Flows

**Files:**
- Modify: `Auth.tsx`
- Test: `lib/authStorage.test.ts`

- [ ] **Step 1: Hydrate login preferences and use the lazy Supabase client**

Update the imports and component state in `Auth.tsx`:

```ts
import React, { useEffect, useState } from 'react';
import {
  clearRememberedEmail,
  readAutoLoginEnabled,
  readRememberedEmail,
  setAutoLoginEnabled,
  setRememberedEmail,
} from './lib/authStorage';
import { getSupabaseClient } from './lib/supabase';

export const Auth = () => {
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [emailCheckResult, setEmailCheckResult] = useState<{ available: boolean; message: string } | null>(null);

  useEffect(() => {
    const rememberedEmail = readRememberedEmail();
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberEmail(true);
    }

    setAutoLogin(readAutoLoginEnabled());
  }, []);
```

- [ ] **Step 2: Write the sign-in flow so storage policy changes happen at the correct point**

Update the sign-in branch inside `handleAuth`:

```ts
const handleAuth = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  try {
    if (isSignUp) {
      if (emailCheckResult && !emailCheckResult.available) {
        throw new Error('이미 사용 중인 이메일입니다.');
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) throw error;
      setIsSuccess(true);
      return;
    }

    if (rememberEmail) {
      setRememberedEmail(email);
    } else {
      clearRememberedEmail();
    }

    const previousAutoLogin = readAutoLoginEnabled();
    setAutoLoginEnabled(autoLogin);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAutoLoginEnabled(previousAutoLogin);
      throw error;
    }
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 3: Add the checkbox UI and browser autofill hints**

Update the email and password inputs, then add the preference row under the password field:

```tsx
<input
  type="email"
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    setEmailCheckResult(null);
  }}
  autoComplete="username"
  required
  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--accent-ring)] bg-[var(--bg-card)] ${
    isSignUp && emailCheckResult
      ? emailCheckResult.available
        ? 'border-emerald-300'
        : 'border-red-300'
      : 'border-[var(--border-main)]'
  }`}
  placeholder="name@example.com"
/>

<input
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  autoComplete={isSignUp ? 'new-password' : 'current-password'}
  required
  className="w-full px-3 py-2 border border-[var(--border-main)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--accent-ring)] bg-[var(--bg-card)]"
  placeholder="••••••••"
/>

{!isSignUp && (
  <div className="flex items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
    <label className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={rememberEmail}
        onChange={(event) => setRememberEmail(event.target.checked)}
        className="h-4 w-4 rounded border-[var(--border-main)]"
      />
      아이디 기억
    </label>
    <label className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={autoLogin}
        onChange={(event) => setAutoLogin(event.target.checked)}
        className="h-4 w-4 rounded border-[var(--border-main)]"
      />
      자동로그인
    </label>
  </div>
)}
```

- [ ] **Step 4: Run automated and manual verification**

Run:

```bash
npm test && npm run build
```

Expected: PASS

Then manually verify these flows:

```text
1. 자동로그인 OFF, 아이디 기억 OFF
   - 로그인 성공
   - 새로고침: 로그인 유지
   - 탭 종료 후 재접속: 로그인 화면 표시

2. 자동로그인 OFF, 아이디 기억 ON
   - 로그인 성공
   - 탭 종료 후 재접속: 이메일만 남고 로그인 화면 표시

3. 자동로그인 ON, 아이디 기억 OFF
   - 로그인 성공
   - 브라우저 재접속: 자동 진입

4. 자동로그인 ON 상태에서 로그아웃
   - 즉시 로그인 화면으로 이동
   - 재접속: 자동 진입되지 않음

5. 아이디 기억 ON 상태에서 로그아웃
   - 로그인 화면에 이메일은 남아 있음
   - 자동로그인은 해제됨
```

- [ ] **Step 5: Commit the login UI and flow updates**

```bash
git add Auth.tsx
git commit -m "feat: add remember-email and auto-login controls"
```
