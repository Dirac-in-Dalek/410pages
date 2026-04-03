# Auth Session Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the app from entering the authenticated area automatically on startup unless the product explicitly wants true session persistence.

**Architecture:** Separate "session persistence" from "credential convenience." Supabase session persistence should be disabled for the default flow so app launch always starts from the login form, while optional convenience should be limited to remembering the email field and relying on the browser password manager for password autofill. Do not store raw passwords in app-managed storage.

**Tech Stack:** React 19, TypeScript, Vite, Supabase JS v2

---

### Task 1: Stop Session Resurrection On App Start

**Files:**
- Modify: `lib/supabase.ts`
- Verify: `hooks/useAuthStatus.ts`
- Verify: `App.tsx`

- [ ] **Step 1: Confirm the current root cause in code**

Current behavior is caused by these three facts:

```ts
// lib/supabase.ts
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// hooks/useAuthStatus.ts
supabase.auth.getSession().then(({ data: { session } }) => {
  setSession(session);
});

// App.tsx
if (!session) return <Auth />;
```

Expected result: the engineer agrees that a persisted Supabase session is enough to bypass the login form.

- [ ] **Step 2: Disable persistent auth storage**

Replace the client initialization with explicit auth options:

```ts
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: true,
  },
});
```

Expected result: login state exists only in memory for the active runtime and is not restored from browser storage on the next fresh load.

- [ ] **Step 3: Build after the config change**

Run: `npm run build`
Expected: Vite build completes without TypeScript or bundling errors.

- [ ] **Step 4: Manually verify the startup behavior**

Manual check:

```text
1. Open the app.
2. Sign in with valid credentials.
3. Confirm the archive screen is shown.
4. Hard refresh the page or reopen the app.
5. Confirm the login screen is shown again.
```

Expected: the app no longer enters the authenticated area automatically after restart.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase.ts
git commit -m "fix: disable implicit auth session restore"
```

### Task 2: Preserve Convenience Without Reintroducing Auto-Login

**Files:**
- Create: `lib/authPrefs.ts`
- Modify: `Auth.tsx`

- [ ] **Step 1: Add a focused helper for remembered login form state**

Create a tiny helper that only stores the email preference:

```ts
const REMEMBERED_EMAIL_KEY = 'rememberedLoginEmail';

export const authPrefs = {
  getRememberedEmail() {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
  },
  setRememberedEmail(email: string) {
    window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
  },
  clearRememberedEmail() {
    window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  },
};
```

Expected: the app has a dedicated place for login-form convenience data that is clearly separate from auth session state.

- [ ] **Step 2: Add a "remember email" checkbox to the login screen**

Update the login form state in `Auth.tsx`:

```ts
const [rememberEmail, setRememberEmail] = useState(false);

useEffect(() => {
  const rememberedEmail = authPrefs.getRememberedEmail();
  if (rememberedEmail) {
    setEmail(rememberedEmail);
    setRememberEmail(true);
  }
}, []);
```

Render a checkbox near the password field:

```tsx
<label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
  <input
    type="checkbox"
    checked={rememberEmail}
    onChange={(e) => setRememberEmail(e.target.checked)}
  />
  이메일 기억
</label>
```

Expected: the user can keep the email field prefilled without reviving the session automatically.

- [ ] **Step 3: Persist or clear the remembered email on successful login**

Add this directly after successful `signInWithPassword`:

```ts
if (rememberEmail) {
  authPrefs.setRememberedEmail(email);
} else {
  authPrefs.clearRememberedEmail();
}
```

Expected: remembered email behavior matches the checkbox, while the password remains managed by the browser rather than app code.

- [ ] **Step 4: Build after the form-state change**

Run: `npm run build`
Expected: the login page compiles and the checkbox logic is type-safe.

- [ ] **Step 5: Commit**

```bash
git add lib/authPrefs.ts Auth.tsx
git commit -m "feat: remember email without persisting session"
```

### Task 3: Make Product Language Match Actual Behavior

**Files:**
- Modify: `Auth.tsx`

- [ ] **Step 1: Remove misleading "auto login" wording if present**

If the UI currently describes the behavior as automatic login, change the copy to reflect the real choices:

```text
- "이메일 기억" for form convenience
- "로그인 상태 유지" only if true session persistence is intentionally added later
```

Expected: product language no longer suggests that stored credentials and stored sessions are the same thing.

- [ ] **Step 2: Do not add password storage**

Keep the password field unmanaged by app storage:

```text
- No localStorage password key
- No sessionStorage password key
- No custom encrypted password blob in frontend code
```

Expected: the implementation avoids a security regression while still allowing browser-native password autofill.

- [ ] **Step 3: Commit**

```bash
git add Auth.tsx
git commit -m "chore: clarify login preference wording"
```

### Task 4: Regression Verification

**Files:**
- Verify: `lib/supabase.ts`
- Verify: `Auth.tsx`
- Verify: `hooks/useAuthStatus.ts`
- Verify: `App.tsx`

- [ ] **Step 1: Verify the broken flow is gone**

Manual check:

```text
1. Sign in.
2. Close the tab or refresh the app.
3. Confirm the login form is shown instead of the archive.
```

Expected: no automatic entry into the authenticated UI.

- [ ] **Step 2: Verify the convenience flow still works**

Manual check:

```text
1. Check "이메일 기억".
2. Sign in successfully.
3. Reopen the app.
4. Confirm the email field is prefilled.
5. Confirm the user must still press "Sign In".
```

Expected: email convenience remains, but authentication is still explicit.

- [ ] **Step 3: Verify logout remains correct**

Manual check:

```text
1. Sign in.
2. Use the existing sign-out action.
3. Confirm the login form is shown immediately.
4. Reopen the app and confirm the authenticated screen does not appear.
```

Expected: sign-out clears active auth state and does not regress remembered email behavior.

- [ ] **Step 4: Final build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Final commit**

```bash
git add lib/supabase.ts lib/authPrefs.ts Auth.tsx
git commit -m "fix: require explicit sign-in on each app start"
```
