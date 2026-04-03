# Font Size Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current three-step text scale setting with a `10pt..40pt` slider that changes text size only while preserving relative typography hierarchy and leaving layout dimensions untouched.

**Architecture:** Keep preference ownership in `useUserPreferences`, but replace the discrete `textScale` enum with numeric `baseFontPt`. Apply the numeric value during first paint in `index.html`, then expose it through CSS typography tokens derived from the base value. Update the settings panel to use a range slider and migrate the most visible app text surfaces to token-backed typography without tying layout measurements to the text variable.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS variables, Tailwind utility classes

---

## File Structure

- Modify: `hooks/useUserPreferences.ts`
  - Replace `textScale` enum state with numeric `baseFontPt`
  - Add clamp and migration helpers
  - Apply new document CSS variable
- Modify: `hooks/useUserPreferences.test.ts`
  - Cover default, clamping, migration, persistence, and document application
- Modify: `index.html`
  - Update pre-React bootstrap to read and migrate `baseFontPt`
- Modify: `components/settings/TextSettingsSection.tsx`
  - Replace three buttons with slider UI and numeric value readout
- Modify: `components/settings/SettingsPanel.tsx`
  - Rename prop contract from `textScale` to `baseFontPt`
- Modify: `components/settings/SettingsPanel.test.tsx`
  - Replace discrete button assertions with slider assertions
- Modify: `App.tsx`
  - Pass `baseFontPt` and `setBaseFontPt` through settings wiring
- Modify: `index.css`
  - Replace `--text-scale` with base font and derived typography tokens
  - Add reusable typography utility classes for text-only scaling
- Modify: `components/settings/ProfileSettingsSection.tsx`
  - Swap hardcoded text sizes to typography token-backed classes
- Modify: `components/settings/AppearanceSettingsSection.tsx`
  - Swap hardcoded text sizes to typography token-backed classes
- Modify: `components/main-layout/ProjectSidebar.tsx`
  - Swap key sidebar text styles to typography token-backed classes while leaving widths untouched
- Modify: `components/MainLayout.tsx`
  - Update token-backed text classes in primary desktop shell text surfaces
- Modify: `components/MobileLayout.tsx`
  - Update token-backed text classes in primary mobile shell text surfaces
- Test: `npm test -- hooks/useUserPreferences.test.ts components/settings/SettingsPanel.test.tsx`
- Test: `npm test`
- Test: `npm run build`

### Task 1: Replace Preference Model With Numeric Base Font Size

**Files:**
- Modify: `hooks/useUserPreferences.test.ts`
- Modify: `hooks/useUserPreferences.ts`
- Modify: `index.html`
- Test: `hooks/useUserPreferences.test.ts`

- [ ] **Step 1: Write the failing preference tests**

Add or replace tests in `hooks/useUserPreferences.test.ts` with numeric font-size coverage:

```ts
it('returns defaults when storage is empty', () => {
  expect(readStoredPreferences()).toEqual(DEFAULT_PREFERENCES);
});

it('migrates legacy textScale values into baseFontPt', () => {
  window.localStorage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify({ theme: 'system', fontFamily: 'pretendard', textScale: 'lg' })
  );

  expect(readStoredPreferences()).toEqual({
    theme: 'system',
    fontFamily: 'pretendard',
    baseFontPt: 18,
  });
});

it('clamps invalid stored baseFontPt values', () => {
  window.localStorage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify({ theme: 'light', fontFamily: 'serif', baseFontPt: 99 })
  );

  expect(readStoredPreferences()).toEqual({
    theme: 'light',
    fontFamily: 'serif',
    baseFontPt: 40,
  });
});

it('applies dark theme, font, and base font size to the root document', () => {
  applyPreferencesToDocument({
    ...DEFAULT_PREFERENCES,
    theme: 'dark',
    fontFamily: 'serif',
    baseFontPt: 22,
  });

  expect(document.documentElement.classList.contains('dark')).toBe(true);
  expect(document.documentElement.dataset.font).toBe('serif');
  expect(document.documentElement.style.getPropertyValue('--font-base-pt')).toBe('22pt');
});

it('persists numeric baseFontPt updates from the hook', () => {
  const { result } = renderHook(() => useUserPreferences());

  act(() => {
    result.current.setBaseFontPt(19);
  });

  expect(JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}')).toMatchObject({
    baseFontPt: 19,
  });
});
```

- [ ] **Step 2: Run the hook test file to verify it fails**

Run: `npm test -- hooks/useUserPreferences.test.ts`

Expected: FAIL because `baseFontPt`, legacy migration, and `--font-base-pt` are not implemented yet.

- [ ] **Step 3: Implement numeric preference support in the hook**

Update `hooks/useUserPreferences.ts` so the preference shape, migration, clamping, and setter all use numeric font size:

```ts
export type UserPreferences = {
  theme: ThemePreference;
  fontFamily: FontPreference;
  baseFontPt: number;
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  fontFamily: 'pretendard',
  baseFontPt: 16,
};

const LEGACY_TEXT_SCALE_MAP = {
  sm: 14,
  md: 16,
  lg: 18,
} as const;

const clampBaseFontPt = (value: unknown): number => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return DEFAULT_PREFERENCES.baseFontPt;
  return Math.min(40, Math.max(10, Math.round(numericValue)));
};

const normalizePreferences = (value: unknown): UserPreferences => {
  const candidate = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const legacyTextScale = candidate.textScale;

  return {
    theme: isThemePreference(candidate.theme) ? candidate.theme : DEFAULT_PREFERENCES.theme,
    fontFamily: isFontPreference(candidate.fontFamily) ? candidate.fontFamily : DEFAULT_PREFERENCES.fontFamily,
    baseFontPt:
      typeof candidate.baseFontPt !== 'undefined'
        ? clampBaseFontPt(candidate.baseFontPt)
        : legacyTextScale === 'sm' || legacyTextScale === 'md' || legacyTextScale === 'lg'
          ? LEGACY_TEXT_SCALE_MAP[legacyTextScale]
          : DEFAULT_PREFERENCES.baseFontPt,
  };
};

export const applyPreferencesToDocument = (preferences: UserPreferences) => {
  const root = document.documentElement;
  const effectiveTheme = resolveTheme(preferences.theme);
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  root.classList.toggle('dark', effectiveTheme === 'dark');
  root.dataset.font = preferences.fontFamily;
  root.style.setProperty('--font-base-pt', `${preferences.baseFontPt}pt`);

  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', effectiveTheme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }
};
```

Expose the setter from the hook:

```ts
setBaseFontPt: (baseFontPt: number) =>
  setPreferences((current) => ({ ...current, baseFontPt: clampBaseFontPt(baseFontPt) })),
```

- [ ] **Step 4: Update the first-paint bootstrap in `index.html`**

Replace the old `textScale` bootstrap with numeric `baseFontPt` handling:

```html
<script>
  (function () {
    const preferencesKey = 'user-preferences';
    const legacyThemeKey = 'theme-preference';
    const legacyDarkModeKey = 'dark-mode';
    const legacyTextScaleMap = { sm: 14, md: 16, lg: 18 };
    const defaultPreferences = { theme: 'system', fontFamily: 'pretendard', baseFontPt: 16 };
    const clampBaseFontPt = (value) => {
      const numericValue = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(numericValue)) return defaultPreferences.baseFontPt;
      return Math.min(40, Math.max(10, Math.round(numericValue)));
    };

    let preferences = defaultPreferences;

    try {
      const storedPreferences = localStorage.getItem(preferencesKey);
      if (storedPreferences) {
        const parsed = JSON.parse(storedPreferences);
        const legacyTextScale = parsed?.textScale;

        preferences = {
          theme:
            parsed?.theme === 'light' || parsed?.theme === 'dark' || parsed?.theme === 'system'
              ? parsed.theme
              : defaultPreferences.theme,
          fontFamily:
            parsed?.fontFamily === 'serif' || parsed?.fontFamily === 'pretendard'
              ? parsed.fontFamily
              : defaultPreferences.fontFamily,
          baseFontPt:
            typeof parsed?.baseFontPt !== 'undefined'
              ? clampBaseFontPt(parsed.baseFontPt)
              : legacyTextScale === 'sm' || legacyTextScale === 'md' || legacyTextScale === 'lg'
                ? legacyTextScaleMap[legacyTextScale]
                : defaultPreferences.baseFontPt,
        };
      }
    } catch (_) {
      preferences = defaultPreferences;
    }

    const root = document.documentElement;
    root.dataset.font = preferences.fontFamily;
    root.style.setProperty('--font-base-pt', `${preferences.baseFontPt}pt`);
  })();
</script>
```

- [ ] **Step 5: Re-run the hook test file to verify it passes**

Run: `npm test -- hooks/useUserPreferences.test.ts`

Expected: PASS with all updated numeric preference tests green.

- [ ] **Step 6: Commit the preference-model change**

Run:

```bash
git add hooks/useUserPreferences.ts hooks/useUserPreferences.test.ts index.html
git commit -m "feat: replace text scale with base font size preference"
```

### Task 2: Replace Text Scale Buttons With Slider Controls

**Files:**
- Modify: `components/settings/TextSettingsSection.tsx`
- Modify: `components/settings/SettingsPanel.tsx`
- Modify: `components/settings/SettingsPanel.test.tsx`
- Modify: `App.tsx`
- Test: `components/settings/SettingsPanel.test.tsx`

- [ ] **Step 1: Write failing settings-panel slider tests**

Add tests in `components/settings/SettingsPanel.test.tsx` for slider rendering and interaction:

```ts
it('renders a font-size slider with the approved range', () => {
  render(<SettingsPanel {...baseProps} />);

  const slider = screen.getByRole('slider', { name: '글자 크기' });
  expect(slider).toHaveAttribute('min', '10');
  expect(slider).toHaveAttribute('max', '40');
  expect(slider).toHaveAttribute('step', '1');
  expect(slider).toHaveValue('16');
  expect(screen.getByText('16pt')).toBeTruthy();
});

it('sends numeric font-size updates when the slider moves', async () => {
  const user = userEvent.setup();
  render(<SettingsPanel {...baseProps} />);

  const slider = screen.getByRole('slider', { name: '글자 크기' });
  await user.clear(slider);
  fireEvent.input(slider, { target: { value: '22' } });

  expect(baseProps.onBaseFontPtChange).toHaveBeenCalledWith(22);
});
```

Update the shared props fixture:

```ts
preferences: {
  theme: 'system' as const,
  fontFamily: 'pretendard' as const,
  baseFontPt: 16,
},
onBaseFontPtChange: vi.fn(),
```

- [ ] **Step 2: Run the settings panel test file to verify it fails**

Run: `npm test -- components/settings/SettingsPanel.test.tsx`

Expected: FAIL because `SettingsPanel` and `TextSettingsSection` still use `textScale`.

- [ ] **Step 3: Replace the settings UI with a numeric slider**

Update `components/settings/TextSettingsSection.tsx`:

```tsx
import type { FontPreference } from '../../hooks/useUserPreferences';

type TextSettingsSectionProps = {
  fontFamily: FontPreference;
  baseFontPt: number;
  onFontFamilyChange: (value: FontPreference) => void;
  onBaseFontPtChange: (value: number) => void;
};

export const TextSettingsSection: React.FC<TextSettingsSectionProps> = ({
  fontFamily,
  baseFontPt,
  onFontFamilyChange,
  onBaseFontPtChange,
}) => (
  <section className="mb-8">
    <h3 className="type-label-muted mb-3 uppercase tracking-[0.12em]">텍스트</h3>

    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-main)] p-4 shadow-sm">
      <div className="mb-5">
        <p className="type-body-strong mb-2">서체</p>
        <div className="grid grid-cols-2 gap-2">
          {/* existing font family buttons stay as-is */}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="settings-font-size" className="type-body-strong">
            글자 크기
          </label>
          <output htmlFor="settings-font-size" className="type-body text-[var(--text-secondary)]">
            {baseFontPt}pt
          </output>
        </div>

        <input
          id="settings-font-size"
          aria-label="글자 크기"
          type="range"
          min={10}
          max={40}
          step={1}
          value={baseFontPt}
          onChange={(event) => onBaseFontPtChange(Number(event.target.value))}
          className="w-full accent-[var(--accent)]"
        />

        <div className="mt-2 flex justify-between text-[var(--font-muted)] text-[var(--text-muted)]">
          <span>10pt</span>
          <span>40pt</span>
        </div>
      </div>
    </div>
  </section>
);
```

Update `components/settings/SettingsPanel.tsx` prop names:

```ts
onBaseFontPtChange: (value: number) => void;
```

and usage:

```tsx
<TextSettingsSection
  fontFamily={preferences.fontFamily}
  baseFontPt={preferences.baseFontPt}
  onFontFamilyChange={onFontFamilyChange}
  onBaseFontPtChange={onBaseFontPtChange}
/>
```

Update `App.tsx` wiring:

```ts
const { preferences, setTheme, setFontFamily, setBaseFontPt } = useUserPreferences();
```

and:

```tsx
onBaseFontPtChange={setBaseFontPt}
```

- [ ] **Step 4: Re-run the settings panel test file to verify it passes**

Run: `npm test -- components/settings/SettingsPanel.test.tsx`

Expected: PASS with slider tests green.

- [ ] **Step 5: Commit the settings-panel slider work**

Run:

```bash
git add App.tsx components/settings/TextSettingsSection.tsx components/settings/SettingsPanel.tsx components/settings/SettingsPanel.test.tsx
git commit -m "feat: replace text scale buttons with font slider"
```

### Task 3: Introduce Typography Tokens And Apply Them To Visible Text Surfaces

**Files:**
- Modify: `index.css`
- Modify: `components/settings/ProfileSettingsSection.tsx`
- Modify: `components/settings/AppearanceSettingsSection.tsx`
- Modify: `components/main-layout/ProjectSidebar.tsx`
- Modify: `components/MainLayout.tsx`
- Modify: `components/MobileLayout.tsx`
- Test: `npm test`

- [ ] **Step 1: Add tokenized typography CSS derived from `--font-base-pt`**

Update `index.css` so text sizing comes from font tokens rather than `html { font-size: ... }`:

```css
:root {
  --font-base-pt: 16pt;
  --font-body: calc(var(--font-base-pt) * 1);
  --font-muted: calc(var(--font-base-pt) * 0.875);
  --font-label: calc(var(--font-base-pt) * 0.8125);
  --font-title: calc(var(--font-base-pt) * 1.125);
  --font-section: calc(var(--font-base-pt) * 1.375);
  --font-hero: calc(var(--font-base-pt) * 2);
}

html {
  font-size: 16px;
}

.type-body {
  font-size: var(--font-body);
  line-height: 1.5;
}

.type-body-strong {
  font-size: var(--font-body);
  line-height: 1.45;
  font-weight: 500;
}

.type-muted {
  font-size: var(--font-muted);
  line-height: 1.45;
}

.type-label-muted {
  font-size: var(--font-label);
  line-height: 1.3;
  font-weight: 600;
  color: var(--text-muted);
}

.type-title {
  font-size: var(--font-title);
  line-height: 1.25;
}

.type-section {
  font-size: var(--font-section);
  line-height: 1.15;
}

.type-hero {
  font-size: var(--font-hero);
  line-height: 1;
}
```

Do not bind widths, heights, padding, gaps, or icon sizes to these variables.

- [ ] **Step 2: Apply typography token classes to settings surfaces**

Update `components/settings/ProfileSettingsSection.tsx` and `components/settings/AppearanceSettingsSection.tsx` to use token classes instead of `text-xs` and `text-sm` for visible copy:

```tsx
<h3 className="type-label-muted mb-3 uppercase tracking-[0.12em]">프로필</h3>
<label className="type-body block text-[var(--text-main)]">
  이름
</label>
<p
  id="profile-display-name-hint"
  aria-live="polite"
  className={`type-muted mt-2 ${displayNameError ? 'text-red-600' : 'text-[var(--text-secondary)]'}`}
>
```

- [ ] **Step 3: Apply typography token classes to main shell text**

Update `components/main-layout/ProjectSidebar.tsx`, `components/MainLayout.tsx`, and `components/MobileLayout.tsx` so visible text surfaces use token-backed classes. Keep widths and spacing utilities unchanged.

Examples:

```tsx
<p className="type-title text-[var(--text-main)]">{project.name}</p>
<p className="type-muted text-[var(--text-secondary)]">{username}</p>
<button className="type-body ...">설정</button>
```

For hero-style display text already used in settings or shell headers, keep the existing visual hierarchy but convert the font-size source to `type-section` or `type-hero`.

- [ ] **Step 4: Run the full test suite to verify no regressions**

Run: `npm test`

Expected: PASS with the full suite green after typography token changes.

- [ ] **Step 5: Commit typography token adoption**

Run:

```bash
git add index.css components/settings/ProfileSettingsSection.tsx components/settings/AppearanceSettingsSection.tsx components/main-layout/ProjectSidebar.tsx components/MainLayout.tsx components/MobileLayout.tsx
git commit -m "refactor: derive app typography from base font size"
```

### Task 4: Final Verification And Manual Behavior Checks

**Files:**
- Verify only

- [ ] **Step 1: Run targeted preference and settings tests**

Run: `npm test -- hooks/useUserPreferences.test.ts components/settings/SettingsPanel.test.tsx`

Expected: PASS for all preference and slider coverage.

- [ ] **Step 2: Run the full suite**

Run: `npm test`

Expected: PASS with all project tests green.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: PASS. Existing chunk-size warnings are acceptable if the build succeeds.

- [ ] **Step 4: Run manual browser verification**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 4173
```

Verify manually:

- Slider appears in settings instead of three size buttons
- Slider moves in `1pt` increments
- Numeric value updates live, for example `17pt`, `18pt`, `19pt`
- Sidebar width stays fixed while text size changes
- Settings panel width stays fixed while text size changes
- Headings, labels, and muted text scale relative to body text instead of collapsing to the same size
- Reload preserves the selected value

- [ ] **Step 5: Commit any final verification-driven fix**

If manual verification required a code change, commit it separately:

```bash
git add <exact files changed>
git commit -m "fix: polish font size slider behavior"
```

If no code changes were required, skip this step.

## Self-Review

### Spec coverage

- Slider range `10..40` and `1pt` step: Task 2
- Replace `textScale` with `baseFontPt`: Task 1
- Legacy `sm/md/lg` migration: Task 1
- First-paint bootstrap update: Task 1
- Relative typography hierarchy: Task 3
- Layout dimensions unchanged: Task 3 and Task 4 manual checks
- Tests for hook and settings panel: Task 1 and Task 2
- Full regression and build verification: Task 3 and Task 4

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” placeholders remain
- Each task includes concrete file paths, commands, and code snippets

### Type consistency

- `textScale` is fully replaced by `baseFontPt`
- `setTextScale` is fully replaced by `setBaseFontPt`
- `onTextScaleChange` is fully replaced by `onBaseFontPtChange`

