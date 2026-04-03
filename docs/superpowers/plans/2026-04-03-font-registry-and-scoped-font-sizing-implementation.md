# Font Registry And Scoped Font Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-option font picker with a scrollable single-column font list backed by a font registry, restore the full Nanum font series, and make the `10pt..40pt` slider apply across the main app UI while excluding login and PDF reader UI.

**Architecture:** Introduce a single registry module as the source of truth for supported fonts, then route preference storage, first-paint bootstrap, and settings UI through that registry. Expand typography token adoption only across included app surfaces, and explicitly isolate `Auth.tsx` and `components/pdf-reader/PdfReaderPage.tsx` so the slider does not affect excluded UI.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Tailwind utilities, CSS variables, browser `localStorage`

---

## File Structure

- Create: `lib/fontRegistry.ts`
  - Stores the supported font catalog, including Nanum entries, default font id, lookup helpers, and normalization
- Modify: `hooks/useUserPreferences.ts`
  - Expand `FontPreference`, parse font ids through the registry, keep `baseFontPt` logic intact
- Modify: `hooks/useUserPreferences.test.ts`
  - Add registry-backed preference coverage
- Modify: `index.html`
  - First-paint bootstrap must understand expanded font ids
- Modify: `index.css`
  - Add Nanum imports, map registry ids to CSS font variables, and add scoped opt-out rules for excluded UI
- Modify: `components/settings/TextSettingsSection.tsx`
  - Replace 2-button font picker with a scrollable vertical list
- Modify: `components/settings/SettingsPanel.test.tsx`
  - Verify all configured fonts render and selection updates
- Modify: `App.test.tsx`
  - Keep app-level settings wiring coverage valid
- Modify: `components/MainLayout.tsx`
  - Ensure main app shell inherits the included font-size behavior cleanly
- Modify: `components/MobileLayout.tsx`
  - Keep mobile shell under included behavior
- Modify: `components/main-layout/ProjectSidebar.tsx`
  - Keep project sidebar under included behavior
- Modify: `components/main-layout/LibrarySidebar.tsx`
  - Bring library sidebar onto token-backed text classes
- Modify: `components/ArchiveHeader.tsx`
  - Bring archive header typography under token-backed classes
- Modify: `components/CitationList.tsx`
  - Bring empty-state/list copy under token-backed classes
- Modify: `components/CitationCard.tsx`
  - Bring main citation card text surfaces under token-backed classes
- Modify: `components/CitationEditor.tsx`
  - Bring editor text fields under token-backed classes
- Modify: `components/BulkActionToolbar.tsx`
  - Bring bulk action text surfaces under token-backed classes
- Modify: `components/ConfirmModal.tsx`
  - Bring modal text surfaces under token-backed classes
- Modify: `Auth.tsx`
  - Explicitly opt out of app font-size scaling and keep login typography fixed
- Modify: `components/pdf-reader/PdfReaderPage.tsx`
  - Explicitly opt out of app font-size scaling and keep PDF reader UI fixed
- Create: `components/FontSelectionList.test.tsx`
  - Focused tests for the new font picker list behavior
- Test: `npm test -- hooks/useUserPreferences.test.ts components/FontSelectionList.test.tsx components/settings/SettingsPanel.test.tsx App.test.tsx`
- Test: `npm test`
- Test: `npm run build`

### Task 1: Add Font Registry And Preference/Bootstrap Support

**Files:**
- Create: `lib/fontRegistry.ts`
- Modify: `hooks/useUserPreferences.ts`
- Modify: `hooks/useUserPreferences.test.ts`
- Modify: `index.html`
- Modify: `index.css`
- Test: `hooks/useUserPreferences.test.ts`

- [ ] **Step 1: Recover the historical Nanum inventory before changing code**

Run:

```bash
git log --oneline -S "Nanum" -- index.css index.html Auth.tsx components hooks lib
```

Expected: one or more older commits that reference Nanum font imports or font-family mappings. Use those results to extract the exact Nanum font ids/labels you need to restore.

- [ ] **Step 2: Write the failing preference tests for registry-backed fonts**

Add cases to `hooks/useUserPreferences.test.ts` like:

```ts
it('accepts known registry font ids', () => {
  window.localStorage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify({ theme: 'system', fontFamily: 'nanum-myeongjo', baseFontPt: 16 })
  );

  expect(readStoredPreferences()).toMatchObject({
    fontFamily: 'nanum-myeongjo',
    baseFontPt: 16,
  });
});

it('falls back to the default font when the stored id is unknown', () => {
  window.localStorage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify({ theme: 'system', fontFamily: 'unknown-font', baseFontPt: 16 })
  );

  expect(readStoredPreferences()).toMatchObject({
    fontFamily: DEFAULT_FONT_ID,
  });
});
```

- [ ] **Step 3: Run the preference test file to verify the new font cases fail**

Run:

```bash
npm test -- hooks/useUserPreferences.test.ts
```

Expected: FAIL because the current code only accepts `pretendard | serif`.

- [ ] **Step 4: Create the font registry module**

Create `lib/fontRegistry.ts`:

```ts
export type FontCategory = 'sans' | 'serif' | 'nanum';

export type FontOption = {
  id: string;
  label: string;
  fontFamily: string;
  category: FontCategory;
};

export const FONT_OPTIONS: FontOption[] = [
  { id: 'pretendard', label: '프리텐다드', fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", category: 'sans' },
  { id: 'serif', label: '명조', fontFamily: "'Noto Serif KR', 'Iowan Old Style', 'Times New Roman', serif", category: 'serif' },
  { id: 'nanum-gothic', label: '나눔고딕', fontFamily: "'Nanum Gothic', 'Apple SD Gothic Neo', sans-serif", category: 'nanum' },
  { id: 'nanum-myeongjo', label: '나눔명조', fontFamily: "'Nanum Myeongjo', serif", category: 'nanum' },
];

export const DEFAULT_FONT_ID = 'pretendard';

export const FONT_OPTION_BY_ID = new Map(FONT_OPTIONS.map((option) => [option.id, option] as const));

export const isFontPreference = (value: unknown): value is FontOption['id'] =>
  typeof value === 'string' && FONT_OPTION_BY_ID.has(value);
```

Populate the full Nanum list from Step 1 instead of stopping at the two sample entries above.

- [ ] **Step 5: Route preference parsing and document application through the registry**

Update `hooks/useUserPreferences.ts` around the current font helpers:

```ts
import { DEFAULT_FONT_ID, isFontPreference } from '../lib/fontRegistry';

export type FontPreference = string;

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  fontFamily: DEFAULT_FONT_ID,
  baseFontPt: DEFAULT_BASE_FONT_PT,
};

const normalizePreferences = (value: unknown): UserPreferences => {
  const candidate =
    typeof value === 'object' && value !== null
      ? (value as Partial<UserPreferences> & { textScale?: unknown })
      : {};

  return {
    theme: isThemePreference(candidate.theme) ? candidate.theme : DEFAULT_PREFERENCES.theme,
    fontFamily: isFontPreference(candidate.fontFamily) ? candidate.fontFamily : DEFAULT_PREFERENCES.fontFamily,
    baseFontPt:
      candidate.baseFontPt !== undefined
        ? normalizeBaseFontPt(candidate.baseFontPt)
        : getBaseFontPtFromLegacyTextScale(candidate.textScale),
  };
};
```

Keep the existing `baseFontPt` behavior unchanged.

- [ ] **Step 6: Expand first-paint bootstrap and CSS imports**

Update `index.html` so the font check is registry-aware instead of hardcoding two ids:

```html
<script>
  (function () {
    const supportedFonts = new Set([
      'pretendard',
      'serif',
      'nanum-gothic',
      'nanum-myeongjo',
    ]);

    const defaultPreferences = { theme: 'system', fontFamily: 'pretendard', baseFontPt: 16 };

    // ...
    preferences = {
      // ...
      fontFamily:
        supportedFonts.has(candidate.fontFamily)
          ? candidate.fontFamily
          : defaultPreferences.fontFamily,
      // ...
    };
  })();
</script>
```

Update `index.css` imports and root mappings:

```css
@import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&family=Nanum+Myeongjo:wght@400;700;800&display=swap');

:root[data-font='nanum-gothic'] {
  --font-ui-active: 'Nanum Gothic', 'Apple SD Gothic Neo', sans-serif;
  --font-display-active: 'Nanum Gothic', 'Apple SD Gothic Neo', sans-serif;
}

:root[data-font='nanum-myeongjo'] {
  --font-ui-active: 'Nanum Myeongjo', serif;
  --font-display-active: 'Nanum Myeongjo', serif;
}
```

Add one block per restored Nanum entry.

- [ ] **Step 7: Re-run the preference tests**

Run:

```bash
npm test -- hooks/useUserPreferences.test.ts
```

Expected: PASS with the new registry-backed font cases included.

- [ ] **Step 8: Commit the registry/plumbing work**

```bash
git add lib/fontRegistry.ts hooks/useUserPreferences.ts hooks/useUserPreferences.test.ts index.html index.css
git commit -m "feat: add font registry for preferences"
```

### Task 2: Replace The Font Toggle With A Scrollable Font List

**Files:**
- Modify: `components/settings/TextSettingsSection.tsx`
- Modify: `components/settings/SettingsPanel.tsx`
- Modify: `components/settings/SettingsPanel.test.tsx`
- Create: `components/FontSelectionList.test.tsx`
- Test: `components/FontSelectionList.test.tsx`
- Test: `components/settings/SettingsPanel.test.tsx`

- [ ] **Step 1: Write the failing settings/font-list tests**

Create `components/FontSelectionList.test.tsx`:

```ts
it('renders all configured font rows', () => {
  render(<TextSettingsSection fontFamily="pretendard" baseFontPt={16} onFontFamilyChange={vi.fn()} onBaseFontPtChange={vi.fn()} />);

  expect(screen.getByRole('button', { name: '프리텐다드' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '나눔명조' })).toBeTruthy();
});

it('marks the current font as selected', () => {
  render(<TextSettingsSection fontFamily="nanum-myeongjo" baseFontPt={16} onFontFamilyChange={vi.fn()} onBaseFontPtChange={vi.fn()} />);

  expect(screen.getByRole('button', { name: '나눔명조' }).getAttribute('aria-pressed')).toBe('true');
});
```

Update `components/settings/SettingsPanel.test.tsx` with a list-specific assertion:

```ts
expect(screen.getByRole('button', { name: '나눔고딕' })).toBeTruthy();
```

- [ ] **Step 2: Run the settings tests to verify the new list assertions fail**

Run:

```bash
npm test -- components/FontSelectionList.test.tsx components/settings/SettingsPanel.test.tsx
```

Expected: FAIL because the UI still renders only two buttons.

- [ ] **Step 3: Replace the two-button picker with a scrollable single-column list**

Update `components/settings/TextSettingsSection.tsx`:

```tsx
import { FONT_OPTIONS } from '../../lib/fontRegistry';

const optionRowClass = (isActive: boolean) =>
  `w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
    isActive
      ? 'border-transparent bg-[var(--accent-active)] text-[var(--accent-active-text)]'
      : 'border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-main)]'
  }`;

<div className="max-h-56 overflow-y-auto rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-2">
  <div className="space-y-2">
    {FONT_OPTIONS.map((option) => (
      <button
        key={option.id}
        type="button"
        aria-pressed={fontFamily === option.id}
        className={`${optionRowClass(fontFamily === option.id)} type-label`}
        style={{ fontFamily: option.fontFamily }}
        onClick={() => onFontFamilyChange(option.id)}
      >
        {option.label}
      </button>
    ))}
  </div>
</div>
```

Keep the slider block below this section.

- [ ] **Step 4: Re-run the settings tests**

Run:

```bash
npm test -- components/FontSelectionList.test.tsx components/settings/SettingsPanel.test.tsx
```

Expected: PASS with Nanum options visible and selected state asserted.

- [ ] **Step 5: Commit the font-picker UI work**

```bash
git add components/settings/TextSettingsSection.tsx components/settings/SettingsPanel.tsx components/settings/SettingsPanel.test.tsx components/FontSelectionList.test.tsx
git commit -m "feat: replace font toggle with scrollable list"
```

### Task 3: Expand Font-Size Application Across Included App UI And Exclude Login/PDF

**Files:**
- Modify: `index.css`
- Modify: `components/MainLayout.tsx`
- Modify: `components/MobileLayout.tsx`
- Modify: `components/main-layout/ProjectSidebar.tsx`
- Modify: `components/main-layout/LibrarySidebar.tsx`
- Modify: `components/ArchiveHeader.tsx`
- Modify: `components/CitationList.tsx`
- Modify: `components/CitationCard.tsx`
- Modify: `components/CitationEditor.tsx`
- Modify: `components/BulkActionToolbar.tsx`
- Modify: `components/ConfirmModal.tsx`
- Modify: `Auth.tsx`
- Modify: `components/pdf-reader/PdfReaderPage.tsx`
- Modify: `App.test.tsx`
- Test: `App.test.tsx`

- [ ] **Step 1: Add failing tests for exclusion boundaries**

Update `App.test.tsx` with a focused contract check:

```ts
it('keeps login UI outside the app font-size scope', () => {
  authState.session = null as any;
  render(<App />);

  expect(screen.getByText('auth-screen')).toBeTruthy();
});
```

If needed, add a mock-level assertion that the main app still passes settings changes through `setBaseFontPt`.

- [ ] **Step 2: Run the app test file**

Run:

```bash
npm test -- App.test.tsx
```

Expected: PASS or FAIL only on the new scope-specific assertions. If it already passes, continue and use the remaining tasks to add coverage in the changed components.

- [ ] **Step 3: Expand token-backed typography across included app surfaces**

Update included UI files to replace remaining `text-sm`, `text-xs`, `text-base`, `text-lg`, and `text-2xl` utilities on visible text surfaces with `type-*` roles.

Examples:

```tsx
// components/ArchiveHeader.tsx
<h2 className="type-display truncate text-[var(--text-main)]">{viewTitle}</h2>

// components/main-layout/LibrarySidebar.tsx
<span className="type-title font-semibold text-[var(--text-main)]">Library</span>

// components/CitationList.tsx
<p className="type-body-muted mt-2">No citations yet.</p>
```

Keep constrained chrome on `*-bounded` roles. Do not change widths, heights, padding, or icon sizes.

- [ ] **Step 4: Explicitly isolate excluded login/PDF surfaces**

Add explicit opt-out wrappers or fixed typography rules.

One acceptable pattern in `index.css`:

```css
.font-size-scope-excluded {
  --type-muted-size: 0.75rem;
  --type-label-size: 0.875rem;
  --type-body-size: 1rem;
  --type-title-size: 1.25rem;
  --type-section-size: 1.125rem;
  --type-display-size: 1.5rem;
}
```

Then apply it at the roots:

```tsx
// Auth.tsx
<div className="font-size-scope-excluded min-h-screen ...">

// components/pdf-reader/PdfReaderPage.tsx
<div className="font-size-scope-excluded pdf-reader-mode h-screen ...">
```

This keeps login and PDF reader out of the main app slider scope while preserving the shared font-family system.

- [ ] **Step 5: Re-run the focused app test file**

Run:

```bash
npm test -- App.test.tsx
```

Expected: PASS with current settings wiring intact.

- [ ] **Step 6: Commit the scoped font-size rollout**

```bash
git add index.css components/MainLayout.tsx components/MobileLayout.tsx components/main-layout/ProjectSidebar.tsx components/main-layout/LibrarySidebar.tsx components/ArchiveHeader.tsx components/CitationList.tsx components/CitationCard.tsx components/CitationEditor.tsx components/BulkActionToolbar.tsx components/ConfirmModal.tsx Auth.tsx components/pdf-reader/PdfReaderPage.tsx App.test.tsx
git commit -m "feat: scope font sizing across app ui"
```

### Task 4: Full Verification And Manual Scope Checks

**Files:**
- Test: `hooks/useUserPreferences.test.ts`
- Test: `components/FontSelectionList.test.tsx`
- Test: `components/settings/SettingsPanel.test.tsx`
- Test: `App.test.tsx`
- Test: `npm test`
- Test: `npm run build`

- [ ] **Step 1: Run the focused verification suite**

Run:

```bash
npm test -- hooks/useUserPreferences.test.ts components/FontSelectionList.test.tsx components/settings/SettingsPanel.test.tsx App.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS with zero failing test files.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: PASS. Existing Vite chunk-size warning may remain, but the build must exit successfully.

- [ ] **Step 4: Perform the manual browser checks**

Verify in the browser:

```text
1. Open Settings → Text
2. Scroll through the font list and confirm Nanum rows are present
3. Select at least one Nanum sans and one Nanum serif option
4. Confirm main/settings/mobile app UI text changes immediately
5. Move the slider from 10pt to 40pt and confirm main app UI changes visibly
6. Open login/auth screen and confirm its typography does not change with the slider
7. Open PDF reader and confirm its UI does not change with the slider
8. Reload and confirm the selected font persists without a first-paint flash back to the default font
```

- [ ] **Step 5: Commit any final test or verification fixes**

```bash
git add hooks/useUserPreferences.test.ts components/FontSelectionList.test.tsx components/settings/SettingsPanel.test.tsx App.test.tsx
git commit -m "test: cover scoped font preferences"
```
