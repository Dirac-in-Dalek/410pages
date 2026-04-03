# Font Size Slider Design

## Goal

Replace the current three-step text scale setting with a slider that controls text size from `10pt` to `40pt` in `1pt` increments.

This setting must change text rendering only. It must not resize layout primitives such as:

- Sidebar width
- Panel width and height
- Button box size
- Icon size
- Spacing, padding, gap, or radius tokens

Large or small text may naturally wrap within the existing layout bounds. That is acceptable. The layout itself must not scale with the setting.

## Approved Behavior

### Slider

- Setting control uses a slider in the settings panel
- Range: `10pt` to `40pt`
- Step: `1pt`
- Current value is shown numerically, for example `16pt`

### Preference semantics

- The stored preference becomes `baseFontPt: number`
- Default value is `16`
- Existing `textScale: 'sm' | 'md' | 'lg'` is removed
- Old stored preferences migrate as:
  - `sm` -> `14`
  - `md` -> `16`
  - `lg` -> `18`

### Typography model

The slider controls a single base text size. The app’s typography system must derive all other text sizes relative to that base.

Examples:

- Body text: `1.0x`
- Muted/supporting text: smaller than body
- Labels/captions: smaller than body
- Section headings: larger than body
- Hero or brand headings: larger than section headings

The exact multipliers can be tuned in implementation, but they must remain relative to the base text size rather than being fixed absolute `pt` values.

This preserves visual hierarchy while allowing the user to scale text across the app.

## Scope

### In scope

- Settings UI change from three buttons to one slider
- Preference model change from `textScale` to `baseFontPt`
- Initial document bootstrap in `index.html`
- Preference hook update in `hooks/useUserPreferences.ts`
- Settings tests and preference tests
- Root CSS variable update so the typography system can consume the base value
- Converting key app text styles to use typography tokens derived from the base value

### Out of scope

- Resizing non-text layout primitives
- Responsive layout redesign
- Per-component custom font-size settings
- Independent title/body sliders

## Architecture

### Preference storage

Update `UserPreferences` to:

```ts
type UserPreferences = {
  theme: ThemePreference;
  fontFamily: FontPreference;
  baseFontPt: number;
};
```

Validation rules:

- Must be a finite integer
- Clamp to `10..40`
- Fallback to default `16` when invalid

### Initial paint

`index.html` currently reads `textScale` before React mounts. This bootstrap must be updated to:

- Read `baseFontPt`
- Migrate legacy `textScale` if present
- Apply the base font CSS variable before first paint

This avoids a flash where text appears at the wrong size on page load.

### CSS strategy

Introduce a base typography variable on `:root`, for example:

- `--font-base-pt`

Then derive typography tokens from it, for example:

- `--font-body`
- `--font-muted`
- `--font-label`
- `--font-title`
- `--font-section`
- `--font-hero`

These derived tokens should be used by text styles. Layout tokens remain unchanged.

Implementation may use `calc()` with relative multipliers. Exact token names may vary, but the separation between text tokens and layout tokens must remain explicit.

## Component Impact

### `hooks/useUserPreferences.ts`

- Replace `TextScalePreference` with numeric `baseFontPt`
- Add normalization and clamping helpers
- Update localStorage read/write shape
- Update `applyPreferencesToDocument`
- Expose setter such as `setBaseFontPt`

### `index.html`

- Replace `textScale` bootstrap logic with numeric base font logic
- Support migration from legacy `textScale`

### `components/settings/TextSettingsSection.tsx`

- Keep font-family controls
- Replace three text-size buttons with a range input
- Display current `pt` value next to or above the slider

### Settings consumers

Current components that read `preferences.textScale` must be updated to read `preferences.baseFontPt`.

## Testing

### Preference hook tests

Add or update tests for:

- Default `baseFontPt` is `16`
- Stored numeric value is read correctly
- Invalid values fall back to `16`
- Legacy `sm/md/lg` values migrate to `14/16/18`
- Applied document variable updates when the value changes
- Values outside `10..40` clamp correctly

### Settings panel tests

Add or update tests for:

- Slider renders with `min=10`, `max=40`, `step=1`
- Slider reflects current preference value
- Sliding updates the preference
- Visible value label updates as the slider moves

### Verification

Manual verification should confirm:

- Text changes size immediately when the slider moves
- Sidebar width and other layout boxes do not scale with the setting
- Headings and supporting text maintain hierarchy relative to body text
- Page reload preserves the selected size

## Risks

### Risk: layout accidentally scales

If existing styles tie component dimensions to font-size tokens, some layout elements may appear to grow.

Mitigation:

- Restrict the new variable to typography tokens
- Do not replace spacing or box-size tokens with font-derived values

### Risk: very large text causes overflow

At `40pt`, narrow areas may wrap heavily.

Mitigation:

- Accept wrapping as the intended accessibility tradeoff
- Preserve container bounds rather than growing the layout

### Risk: inconsistent typography adoption

If some components still use hardcoded text utilities while others use the new tokens, the slider effect will feel partial.

Mitigation:

- Update the main surfaces touched by settings work first
- Prefer token-backed text styles over scattered fixed text sizes

## Recommendation

Implement this as a numeric base typography system, not as another discrete scale preset.

That directly matches the approved UX:

- One slider
- `10pt..40pt`
- `1pt` steps
- Relative hierarchy preserved
- Layout dimensions unchanged
