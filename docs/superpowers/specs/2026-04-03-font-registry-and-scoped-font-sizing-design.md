# Font Registry And Scoped Font Sizing Design

## Goal

Replace the current two-option font picker with a scrollable single-column font list and restore the full Nanum font series as selectable options.

At the same time, keep the `10pt..40pt` font-size slider but scope its effect to the main app UI only:

- Include: main screen, settings, mobile shell, general app chrome
- Exclude: login screen, PDF reader UI

The font-size setting must remain `1pt` granular and must affect visible app text more broadly than it does now.

## Approved Behavior

### Font picker

- The font picker is no longer a two-button toggle
- It becomes a vertically scrollable list
- One row represents one font option
- Clicking a row applies that font immediately
- The selected row is visually highlighted
- Each row should render its label in its own font when practical

### Font inventory

- Preserve the existing default UI font option
- Preserve the current serif option if it is still part of the product
- Reintroduce the previously connected Nanum font series in full
- The picker is limited to the app-supported font catalog, not arbitrary system fonts

### Font-size slider

- Range: `10pt` to `40pt`
- Step: `1pt`
- Current value remains visibly labeled
- The setting should affect the main app UI broadly enough that users perceive it as working
- Login and PDF reader UI are explicitly excluded from this rollout

## Problem Summary

The current implementation has two separate issues:

1. Font choice is structurally limited
   - The settings UI in [TextSettingsSection.tsx](/Users/life_habit/Desktop/Vibe%20APP/Sentences/the-citation-graph/.worktrees/codex-font-size-slider/components/settings/TextSettingsSection.tsx) hardcodes a two-option button group
   - Preference storage in [useUserPreferences.ts](/Users/life_habit/Desktop/Vibe%20APP/Sentences/the-citation-graph/.worktrees/codex-font-size-slider/hooks/useUserPreferences.ts) only accepts `pretendard | serif`
   - Nanum fonts cannot be selected even if the product historically supported them

2. Font-size application feels partial
   - `baseFontPt` is stored and tokenized, but only surfaces already migrated to token-backed typography respond
   - Users therefore perceive the `10..40pt` slider as not actually working

## Architecture

### Font registry

Move from hardcoded font options to a registry-based model.

Each supported font should be represented by metadata such as:

```ts
type FontOption = {
  id: string;
  label: string;
  fontFamily: string;
  category: 'sans' | 'serif' | 'nanum';
};
```

Requirements:

- Registry is the single source of truth for selectable fonts
- Preference storage keeps only the selected font id
- UI rendering and CSS application resolve through the registry
- Invalid or unknown stored ids fall back to the default font

### Preference model

Update `FontPreference` from a narrow union to a registry-backed font id set.

Requirements:

- Existing stored `pretendard` and `serif` values must continue to resolve correctly
- Newly added Nanum ids must be supported in storage, bootstrap, and runtime application
- Default remains the current primary UI font unless product decides otherwise

### First paint

The `index.html` bootstrap must understand the expanded font id set so the selected font is applied before React mounts.

This prevents a flash where:

- the wrong font appears briefly on page load
- or a Nanum choice is ignored until after hydration

### CSS strategy

Add supported Nanum font imports and expose them through CSS variables or a deterministic font-id-to-family mapping.

Requirements:

- Main app UI must use the selected font
- Login and PDF reader UI must remain on their current typography behavior
- The exclusion should be explicit, not accidental

Recommended approach:

- Keep current app-wide font variable plumbing
- Add scoped overrides for excluded surfaces if needed
- Avoid introducing parallel font systems unless exclusion cannot be expressed cleanly

## UI Design

### Settings font section

Replace the two-button font control with:

- a titled section
- a single-column scrollable list
- each row showing the font name
- selected row using the existing active styling vocabulary

Suggested behavior:

- fixed max height with `overflow-y-auto`
- keyboard focus support
- `aria-pressed` or equivalent selection state on rows

### Visual presentation

Each row should be lightweight and readable:

- one line per option
- no card grid
- no add/search UI
- no dynamic font discovery

This is intentionally simpler than a system font manager. The product is selecting from a curated supported font set.

## Font-Size Scope

### Included surfaces

The `baseFontPt` system should apply to:

- main desktop shell
- settings panel
- mobile shell
- main archive/list/detail text surfaces that belong to the app UI

### Excluded surfaces

Do not apply the new sizing behavior to:

- login/auth UI
- PDF reader UI

If these surfaces currently inherit shared typography tokens, they must be isolated so the slider does not affect them.

## Implementation Strategy

### Recommended approach

1. Introduce a font registry module
2. Expand preference parsing and bootstrap to accept registry ids
3. Replace the button group with a vertical scroll list bound to the registry
4. Add Nanum font imports and mapping
5. Expand typography-token adoption only across included app UI surfaces
6. Leave login and PDF reader on their current sizing behavior

### Why this approach

- Scales cleanly beyond two fonts
- Makes Nanum support explicit and maintainable
- Keeps exclusion boundaries for login/PDF deliberate
- Avoids coupling UI rendering to ad hoc conditionals

## Testing

### Preferences and bootstrap

Add or update tests for:

- known font ids are accepted
- invalid font ids fall back safely
- legacy stored font values still resolve
- first-paint bootstrap accepts Nanum ids

### Settings UI

Add or update tests for:

- vertical font list renders all configured options
- selected item reflects current preference
- clicking a font row updates the preference
- Nanum options are present in the rendered list

### Font-size behavior

Add or update tests for:

- included app surfaces respond to `baseFontPt`
- login UI does not participate
- PDF reader UI does not participate

### Manual verification

Manual checks should confirm:

- Nanum fonts appear in the settings list
- selecting a Nanum font updates visible app text immediately
- the list scrolls when options exceed the visible height
- changing the font size updates main/settings/mobile UI text
- login screen remains unchanged
- PDF reader UI remains unchanged

## Risks

### Risk: wrong Nanum inventory

If the historical Nanum set is not reconstructed accurately, users will still perceive missing fonts.

Mitigation:

- recover the previously connected Nanum list from project history or prior font imports before implementation

### Risk: font-size scope leaks into excluded surfaces

If login or PDF reader still consume shared typography tokens, the new slider will keep affecting them.

Mitigation:

- explicitly audit those surfaces during implementation
- add at least one verification for exclusion behavior

### Risk: partial rollout still feels broken

If only settings chrome scales but the main archive UI does not, users will still perceive the slider as non-functional.

Mitigation:

- apply typography tokens across the main included app surfaces, not only the settings panel

## Recommendation

Implement this as a curated registry-driven font system with a scrollable single-column picker, and treat font-size scope as an explicit boundary problem:

- app UI included
- login excluded
- PDF reader excluded

That directly matches the approved product behavior and avoids repeating the current “stored but not really applied” problem.
