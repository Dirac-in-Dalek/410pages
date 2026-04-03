# Settings Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a settings button and shared settings layer that lets users change profile name, profile photo placeholder flow, theme, font, and text size without leaving the current screen.

**Architecture:** Keep settings open/close state in `App.tsx`, move visual preferences into a new `useUserPreferences` hook, and render a single shared `SettingsPanel` above both desktop and mobile shells. Reuse the existing `useDarkMode` theme logic by folding it into the new preference hook, then apply theme/font/text-size through root CSS variables so the whole app updates consistently.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS utilities, Supabase JS v2, Vitest, JSDOM, Testing Library

---

## File Map

- Create: `vitest.config.ts`
  - Enables browser-like tests in JSDOM
- Create: `hooks/useUserPreferences.ts`
  - Owns theme/font/text-scale local persistence and root DOM application
- Create: `hooks/useUserPreferences.test.ts`
  - Verifies preference hydration, migration, and root DOM updates
- Create: `components/settings/SettingsPanel.tsx`
  - Shared desktop/mobile layer container
- Create: `components/settings/ProfileSettingsSection.tsx`
  - Name field and profile photo action row
- Create: `components/settings/TextSettingsSection.tsx`
  - Font selector and text-size controls
- Create: `components/settings/AppearanceSettingsSection.tsx`
  - Theme segmented controls
- Create: `components/settings/SettingsPanel.test.tsx`
  - Verifies panel rendering, close interactions, and live control updates
- Modify: `package.json`
  - Add test script and required dev dependencies
- Modify: `index.html`
  - Extend pre-hydration script so theme/font/text scale apply before React mounts
- Modify: `index.css`
  - Add active font and text-scale CSS variables
- Modify: `App.tsx`
  - Own settings panel open state and wire settings entry points
- Modify: `components/MainLayout.tsx`
  - Forward `onOpenSettings`
- Modify: `components/main-layout/ProjectSidebar.tsx`
  - Replace bottom user-row inline editing/theme toggle with settings trigger area
- Modify: `components/MobileLayout.tsx`
  - Replace standalone theme toggle with settings trigger
- Modify: `hooks/useAuthStatus.ts`
  - Support external display-name sync from settings panel
- Modify: `lib/api.ts`
  - Generalize profile write path beyond username-only updates

## Task 1: Add Test Harness For Preferences And Panel Work

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install the test dependencies**

Run:

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/user-event
```

Expected: `package.json` and `package-lock.json` gain those four dev dependencies.

- [ ] **Step 2: Add the npm test script**

Update `package.json`:

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

- [ ] **Step 3: Add the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    clearMocks: true,
  },
});
```

- [ ] **Step 4: Run the empty test runner once**

Run:

```bash
npm test
```

Expected: PASS with zero tests or “No test files found”, confirming the runner loads.

- [ ] **Step 5: Commit the harness**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add vitest harness for settings work"
```

## Task 2: Add Failing Preference Tests And Implement `useUserPreferences`

**Files:**
- Create: `hooks/useUserPreferences.ts`
- Create: `hooks/useUserPreferences.test.ts`
- Modify: `index.html`
- Modify: `index.css`

- [ ] **Step 1: Write failing tests for preference hydration and DOM application**

Create `hooks/useUserPreferences.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  applyPreferencesToDocument,
  readStoredPreferences,
  useUserPreferences,
} from './useUserPreferences';

const resetDom = () => {
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-font');
  document.documentElement.style.removeProperty('--text-scale');
  window.localStorage.clear();
};

describe('useUserPreferences', () => {
  beforeEach(() => {
    resetDom();
  });

  it('returns defaults when storage is empty', () => {
    expect(readStoredPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('applies dark theme, font, and scale to the root document', () => {
    applyPreferencesToDocument({
      ...DEFAULT_PREFERENCES,
      theme: 'dark',
      fontFamily: 'serif',
      textScale: 'lg',
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.font).toBe('serif');
    expect(document.documentElement.style.getPropertyValue('--text-scale')).toBe('1.125');
  });

  it('persists updates from the hook', () => {
    const { result } = renderHook(() => useUserPreferences());

    act(() => {
      result.current.setTheme('light');
      result.current.setFontFamily('serif');
      result.current.setTextScale('sm');
    });

    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}')).toMatchObject({
      theme: 'light',
      fontFamily: 'serif',
      textScale: 'sm',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- hooks/useUserPreferences.test.ts
```

Expected: FAIL because `useUserPreferences.ts` does not exist yet.

- [ ] **Step 3: Implement the preferences hook and helpers**

Create `hooks/useUserPreferences.ts`:

```ts
import { useEffect, useMemo, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type FontPreference = 'pretendard' | 'serif';
export type TextScalePreference = 'sm' | 'md' | 'lg';

export type UserPreferences = {
  theme: ThemePreference;
  fontFamily: FontPreference;
  textScale: TextScalePreference;
};

export const PREFERENCES_STORAGE_KEY = 'user-preferences';
const LEGACY_THEME_STORAGE_KEY = 'theme-preference';
const LEGACY_DARK_MODE_KEY = 'dark-mode';

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  fontFamily: 'pretendard',
  textScale: 'md',
};

const TEXT_SCALE_MAP: Record<TextScalePreference, string> = {
  sm: '0.9375',
  md: '1',
  lg: '1.125',
};

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const resolveTheme = (theme: ThemePreference) =>
  theme === 'system' ? getSystemTheme() : theme;

export const readStoredPreferences = (): UserPreferences => {
  const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (stored) {
    try {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    } catch {
      window.localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    }
  }

  const legacyTheme = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (legacyTheme === 'system' || legacyTheme === 'light' || legacyTheme === 'dark') {
    return { ...DEFAULT_PREFERENCES, theme: legacyTheme };
  }

  const legacyDarkMode = window.localStorage.getItem(LEGACY_DARK_MODE_KEY);
  if (legacyDarkMode !== null) {
    try {
      return {
        ...DEFAULT_PREFERENCES,
        theme: JSON.parse(legacyDarkMode) ? 'dark' : 'light',
      };
    } catch {
      window.localStorage.removeItem(LEGACY_DARK_MODE_KEY);
    }
  }

  return DEFAULT_PREFERENCES;
};

export const applyPreferencesToDocument = (preferences: UserPreferences) => {
  const root = document.documentElement;
  const effectiveTheme = resolveTheme(preferences.theme);
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  root.classList.toggle('dark', effectiveTheme === 'dark');
  root.dataset.font = preferences.fontFamily;
  root.style.setProperty('--text-scale', TEXT_SCALE_MAP[preferences.textScale]);

  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', effectiveTheme === 'dark' ? '#191919' : '#ffffff');
  }
};

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => readStoredPreferences());

  useEffect(() => {
    applyPreferencesToDocument(preferences);
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (preferences.theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyPreferencesToDocument(preferences);
    mediaQuery.addEventListener?.('change', handleChange);
    mediaQuery.addListener?.(handleChange);
    return () => {
      mediaQuery.removeEventListener?.('change', handleChange);
      mediaQuery.removeListener?.(handleChange);
    };
  }, [preferences]);

  return useMemo(
    () => ({
      preferences,
      setPreferences,
      setTheme: (theme: ThemePreference) =>
        setPreferences((current) => ({ ...current, theme })),
      setFontFamily: (fontFamily: FontPreference) =>
        setPreferences((current) => ({ ...current, fontFamily })),
      setTextScale: (textScale: TextScalePreference) =>
        setPreferences((current) => ({ ...current, textScale })),
      isDarkMode: resolveTheme(preferences.theme) === 'dark',
    }),
    [preferences]
  );
};
```

- [ ] **Step 4: Extend the pre-hydration script and CSS variables**

Update the inline script in `index.html`:

```html
<script>
  (function () {
    const key = 'user-preferences';
    const legacyThemeKey = 'theme-preference';
    const legacyDarkModeKey = 'dark-mode';
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    let preferences = { theme: 'system', fontFamily: 'pretendard', textScale: 'md' };

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        preferences = { ...preferences, ...JSON.parse(stored) };
      } else {
        const legacyTheme = localStorage.getItem(legacyThemeKey);
        if (legacyTheme === 'system' || legacyTheme === 'light' || legacyTheme === 'dark') {
          preferences.theme = legacyTheme;
        } else {
          const legacyDarkMode = localStorage.getItem(legacyDarkModeKey);
          if (legacyDarkMode !== null) {
            preferences.theme = JSON.parse(legacyDarkMode) ? 'dark' : 'light';
          }
        }
      }
    } catch (_) {}

    const isDark = preferences.theme === 'dark' || (preferences.theme === 'system' && prefersDark);
    const textScaleMap = { sm: '0.9375', md: '1', lg: '1.125' };

    root.classList.toggle('dark', isDark);
    root.dataset.font = preferences.fontFamily;
    root.style.setProperty('--text-scale', textScaleMap[preferences.textScale] || '1');

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', isDark ? '#191919' : '#ffffff');
  })();
</script>
```

Update `index.css` root declarations:

```css
:root {
  --font-ui-active: var(--font-ui);
  --font-display-active: var(--font-display);
  --text-scale: 1;
}

:root[data-font='serif'] {
  --font-ui-active: 'Noto Serif KR', 'Iowan Old Style', 'Times New Roman', serif;
  --font-display-active: 'Noto Serif KR', 'Iowan Old Style', 'Times New Roman', serif;
}

body,
input,
textarea,
button {
  font-family: var(--font-ui-active);
}

body {
  font-size: calc(16px * var(--text-scale));
}

blockquote {
  font-family: var(--font-display-active);
}
```

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm test -- hooks/useUserPreferences.test.ts
npm run build
```

Expected: PASS for the new test file and a successful Vite production build.

- [ ] **Step 6: Commit the preference hook**

```bash
git add hooks/useUserPreferences.ts hooks/useUserPreferences.test.ts index.html index.css package.json package-lock.json vitest.config.ts
git commit -m "feat: add global user preferences hook"
```

## Task 3: Add Failing Panel Tests And Build The Shared Settings Panel

**Files:**
- Create: `components/settings/SettingsPanel.tsx`
- Create: `components/settings/ProfileSettingsSection.tsx`
- Create: `components/settings/TextSettingsSection.tsx`
- Create: `components/settings/AppearanceSettingsSection.tsx`
- Create: `components/settings/SettingsPanel.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `components/settings/SettingsPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SettingsPanel } from './SettingsPanel';

const baseProps = {
  isOpen: true,
  isMobile: false,
  displayName: '생활습관',
  avatarUrl: null,
  preferences: {
    theme: 'system' as const,
    fontFamily: 'pretendard' as const,
    textScale: 'md' as const,
  },
  onClose: vi.fn(),
  onDisplayNameChange: vi.fn(),
  onThemeChange: vi.fn(),
  onFontFamilyChange: vi.fn(),
  onTextScaleChange: vi.fn(),
  onAvatarChange: vi.fn(),
};

describe('SettingsPanel', () => {
  it('renders the expected sections', () => {
    render(<SettingsPanel {...baseProps} />);

    expect(screen.getByText('설정')).toBeInTheDocument();
    expect(screen.getByText('프로필')).toBeInTheDocument();
    expect(screen.getByText('텍스트')).toBeInTheDocument();
    expect(screen.getByText('화면')).toBeInTheDocument();
  });

  it('closes when the close button is pressed', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);

    await user.click(screen.getByRole('button', { name: '닫기' }));

    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('sends live theme changes', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel {...baseProps} />);

    await user.click(screen.getByRole('button', { name: '다크' }));

    expect(baseProps.onThemeChange).toHaveBeenCalledWith('dark');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- components/settings/SettingsPanel.test.tsx
```

Expected: FAIL because the settings panel components do not exist yet.

- [ ] **Step 3: Implement the shared panel and section components**

Create `components/settings/SettingsPanel.tsx`:

```tsx
import React, { useEffect } from 'react';
import {
  FontPreference,
  TextScalePreference,
  ThemePreference,
  UserPreferences,
} from '../../hooks/useUserPreferences';
import { AppearanceSettingsSection } from './AppearanceSettingsSection';
import { ProfileSettingsSection } from './ProfileSettingsSection';
import { TextSettingsSection } from './TextSettingsSection';

type SettingsPanelProps = {
  isOpen: boolean;
  isMobile: boolean;
  displayName: string;
  avatarUrl: string | null;
  preferences: UserPreferences;
  onClose: () => void;
  onDisplayNameChange: (value: string) => void;
  onAvatarChange: () => void;
  onThemeChange: (value: ThemePreference) => void;
  onFontFamilyChange: (value: FontPreference) => void;
  onTextScaleChange: (value: TextScalePreference) => void;
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  isMobile,
  displayName,
  avatarUrl,
  preferences,
  onClose,
  onDisplayNameChange,
  onAvatarChange,
  onThemeChange,
  onFontFamilyChange,
  onTextScaleChange,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="설정 닫기 배경"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className={[
          'fixed z-50 bg-[var(--bg-card)] border-[var(--border-main)] shadow-2xl transition-transform duration-300 ease-out',
          isMobile
            ? 'inset-x-0 bottom-0 top-16 rounded-t-3xl border-t translate-y-0'
            : 'right-0 top-0 h-full w-[min(520px,100vw)] border-l translate-x-0',
        ].join(' ')}
        aria-modal="true"
        role="dialog"
        aria-label="설정"
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-[var(--border-main)] bg-[linear-gradient(180deg,#f4efe7_0%,#fbfaf8_100%)] px-6 py-5 dark:bg-none">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-[var(--text-main)]">설정</h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={onClose}
                className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]"
              >
                ×
              </button>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : displayName.slice(0, 2)}
              </div>
              <div>
                <div className="text-base font-semibold text-[var(--text-main)]">{displayName}</div>
                <div className="text-sm text-[var(--text-secondary)]">reading environment</div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <ProfileSettingsSection
              displayName={displayName}
              avatarUrl={avatarUrl}
              onDisplayNameChange={onDisplayNameChange}
              onAvatarChange={onAvatarChange}
            />
            <TextSettingsSection
              fontFamily={preferences.fontFamily}
              textScale={preferences.textScale}
              onFontFamilyChange={onFontFamilyChange}
              onTextScaleChange={onTextScaleChange}
            />
            <AppearanceSettingsSection theme={preferences.theme} onThemeChange={onThemeChange} />
          </div>
        </div>
      </aside>
    </>
  );
};
```

- [ ] **Step 4: Add the section components with direct-edit controls**

Create `components/settings/ProfileSettingsSection.tsx`:

```tsx
import React from 'react';

type Props = {
  displayName: string;
  avatarUrl: string | null;
  onDisplayNameChange: (value: string) => void;
  onAvatarChange: () => void;
};

export const ProfileSettingsSection: React.FC<Props> = ({
  displayName,
  onDisplayNameChange,
  onAvatarChange,
}) => (
  <section className="mb-8">
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">프로필</h3>
    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-main)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-main)]">프로필 사진</span>
        <button
          type="button"
          className="rounded-md border border-[var(--border-main)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]"
          onClick={onAvatarChange}
        >
          변경
        </button>
      </div>
      <label className="block text-sm text-[var(--text-main)]">
        이름
        <input
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          className="mt-2 w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] px-3 py-2.5"
        />
      </label>
    </div>
  </section>
);
```

Create `components/settings/TextSettingsSection.tsx` and `components/settings/AppearanceSettingsSection.tsx` with the same direct-edit pattern and button/select controls for the approved options.

- [ ] **Step 5: Run the panel tests and build**

Run:

```bash
npm test -- components/settings/SettingsPanel.test.tsx
npm run build
```

Expected: PASS for the panel tests and a successful production build.

- [ ] **Step 6: Commit the shared panel**

```bash
git add components/settings hooks/useUserPreferences.ts hooks/useUserPreferences.test.ts index.css index.html
git commit -m "feat: add shared settings panel"
```

## Task 4: Integrate Settings Open State And Add The Buttons

**Files:**
- Modify: `App.tsx`
- Modify: `components/MainLayout.tsx`
- Modify: `components/main-layout/ProjectSidebar.tsx`
- Modify: `components/MobileLayout.tsx`

- [ ] **Step 1: Add shell-level panel state and mount the panel in `App.tsx`**

Update the top of `App.tsx`:

```tsx
const { preferences, setTheme, setFontFamily, setTextScale, isDarkMode } = useUserPreferences();
const [isSettingsOpen, setIsSettingsOpen] = useState(false);
```

Mount the panel near the root return:

```tsx
<SettingsPanel
  isOpen={isSettingsOpen}
  isMobile={isMobileApp}
  displayName={username}
  avatarUrl={null}
  preferences={preferences}
  onClose={() => setIsSettingsOpen(false)}
  onDisplayNameChange={handleUpdateUsername}
  onAvatarChange={() => window.alert('프로필 사진 변경은 다음 단계에서 연결합니다.')}
  onThemeChange={setTheme}
  onFontFamilyChange={setFontFamily}
  onTextScaleChange={setTextScale}
/>
```

- [ ] **Step 2: Thread `onOpenSettings` through the layout components**

Add this prop to `MainLayout` and `MobileLayout`:

```ts
onOpenSettings: () => void;
```

Pass it from `App.tsx`:

```tsx
onOpenSettings={() => setIsSettingsOpen(true)}
```

- [ ] **Step 3: Replace the desktop bottom user strip with the approved trigger area**

In `components/main-layout/ProjectSidebar.tsx`, remove the inline username editing and standalone theme toggle from the bottom user block and replace them with:

```tsx
<button
  type="button"
  onClick={onOpenSettings}
  className="mt-auto flex w-full items-center justify-between rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-3 text-left hover:bg-[var(--sidebar-hover)]"
>
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
      {username.slice(0, 2)}
    </div>
    <div className="min-w-0">
      <div className="truncate text-sm font-medium text-[var(--text-main)]">{username}</div>
      <div className="truncate text-xs text-[var(--text-muted)]">개인 설정</div>
    </div>
  </div>
  <Settings size={16} className="text-[var(--text-muted)]" />
</button>
```

- [ ] **Step 4: Replace the mobile theme toggle with the settings button**

In `components/MobileLayout.tsx`, replace the top-right header theme button with:

```tsx
<button
  onClick={onOpenSettings}
  className="p-2 rounded-md text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]"
  aria-label="Open settings"
>
  <Settings size={17} />
</button>
```

Also replace the bottom drawer theme button with a settings button that calls `onOpenSettings()` and `closeSheets()`.

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm test -- components/settings/SettingsPanel.test.tsx hooks/useUserPreferences.test.ts
npm run build
```

Expected: PASS for both test files and a successful build with no TypeScript errors.

- [ ] **Step 6: Commit the entry-point integration**

```bash
git add App.tsx components/MainLayout.tsx components/main-layout/ProjectSidebar.tsx components/MobileLayout.tsx components/settings hooks/useUserPreferences.ts hooks/useUserPreferences.test.ts
git commit -m "feat: wire settings entry points"
```

## Task 5: Generalize Profile Updates And Remove The Old Dark-Mode API

**Files:**
- Modify: `hooks/useAuthStatus.ts`
- Modify: `lib/api.ts`
- Delete or modify: `hooks/useDarkMode.ts`

- [ ] **Step 1: Generalize the profile update API**

Replace the username-only API in `lib/api.ts`:

```ts
async updateProfile(userId: string, profilePatch: { username?: string; avatar_url?: string | null }) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...profilePatch });
  if (error) throw error;
}
```

- [ ] **Step 2: Update the auth hook to use the generalized patch path**

Update `hooks/useAuthStatus.ts`:

```ts
const handleUpdateUsername = async (newUsername: string) => {
  if (!session) return;
  const trimmed = newUsername.trim();
  if (!trimmed) return;

  try {
    await api.updateProfile(session.user.id, { username: trimmed });
    setUsername(trimmed);
  } catch (error) {
    console.error('Error updating username:', error);
  }
};
```

- [ ] **Step 3: Remove `useDarkMode` usage from `App.tsx`**

Delete:

```tsx
const { isDarkMode, toggleDarkMode } = useDarkMode();
```

Replace it with `useUserPreferences` values already wired in Task 4.

- [ ] **Step 4: Run focused verification**

Run:

```bash
npm test -- hooks/useUserPreferences.test.ts components/settings/SettingsPanel.test.tsx
npm run build
```

Expected: PASS for tests and build after removing the old hook usage.

- [ ] **Step 5: Commit the profile and theme consolidation**

```bash
git add App.tsx hooks/useAuthStatus.ts lib/api.ts hooks/useUserPreferences.ts
git commit -m "refactor: consolidate theme and profile settings flow"
```

## Task 6: Manual QA And Finish The Avatar Placeholder Flow

**Files:**
- Modify: `components/settings/ProfileSettingsSection.tsx`
- Modify: `docs/superpowers/specs/2026-04-02-settings-panel-design.md` if implementation deviates

- [ ] **Step 1: Replace the alert-based avatar placeholder with a non-blocking stub**

Use a temporary callback:

```ts
onAvatarChange={() => console.info('Avatar upload flow pending Supabase storage work')}
```

And show helper text inside `ProfileSettingsSection`:

```tsx
<p className="mt-2 text-xs text-[var(--text-muted)]">
  프로필 사진 업로드는 다음 단계에서 Supabase Storage와 연결합니다.
</p>
```

- [ ] **Step 2: Run the full local verification sweep**

Run:

```bash
npm test
npm run build
```

Expected: PASS for the complete test suite and successful build output in `dist/`.

- [ ] **Step 3: Perform manual QA**

Check these flows in `npm run dev`:

```text
1. Desktop left-sidebar user area opens the settings panel.
2. Desktop panel closes via close button, backdrop click, and Escape.
3. Mobile header settings button opens the mobile sheet version.
4. Theme changes apply immediately and survive refresh.
5. Font changes apply immediately and survive refresh.
6. Text size changes apply immediately and survive refresh.
7. Name edits update sidebar and archive surfaces after blur/change.
8. Existing project/library drawers still open and close normally.
```

- [ ] **Step 4: Commit the QA pass**

```bash
git add components/settings/ProfileSettingsSection.tsx
git commit -m "chore: finalize settings panel qa pass"
```

## Self-Review

- Spec coverage check:
  - Desktop settings button: covered in Task 4
  - Mobile settings button: covered in Task 4
  - Right-side panel / mobile sheet: covered in Task 3 and Task 4
  - Theme/font/text size global application: covered in Task 2
  - Display name editing: covered in Task 3 and Task 5
  - Avatar placeholder action: covered in Task 3 and Task 6
- Placeholder scan:
  - The only deferred item is real avatar upload, which is explicitly constrained to a placeholder stub in this implementation plan rather than left ambiguous
- Type consistency:
  - `ThemePreference`, `FontPreference`, `TextScalePreference`, and `UserPreferences` are defined in Task 2 and reused consistently in later tasks

