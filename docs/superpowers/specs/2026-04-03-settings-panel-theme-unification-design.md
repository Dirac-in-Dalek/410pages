# Settings Panel Theme Unification Design

## Goal

Remove the special-case visual treatment from the settings panel profile area so it uses the same theme surface as the rest of the panel in both light mode and dark mode.

This change is intentionally small:

- Keep the current layout
- Keep the current controls and behavior
- Remove the separate "header" look from the top profile area
- Make the full panel follow the existing theme tokens consistently

## Approved Behavior

### Theme consistency

The top profile area in `SettingsPanel` should no longer use a hardcoded light gradient or any style that makes it feel like a separate themed header.

Instead, the full panel should visually read as one continuous surface using the existing tokens from [`/Users/life_habit/Desktop/Vibe APP/Sentences/the-citation-graph/index.css`](/Users/life_habit/Desktop/Vibe%20APP/Sentences/the-citation-graph/index.css):

- `--bg-card`
- `--bg-input`
- `--border-main`
- `--text-main`
- `--text-secondary`
- `--text-muted`
- `--accent-*`

### Profile controls

The following controls remain in place and keep their current interaction behavior:

- Avatar preview
- `사진 변경` button
- Display name input
- Close button

Only their colors and surface treatment should be normalized so they match the active theme without a custom header treatment.

## Scope

### In scope

- Update the top area of [`/Users/life_habit/Desktop/Vibe APP/Sentences/the-citation-graph/components/settings/SettingsPanel.tsx`](/Users/life_habit/Desktop/Vibe%20APP/Sentences/the-citation-graph/components/settings/SettingsPanel.tsx) to remove the hardcoded header background treatment
- Keep the existing border structure only where it supports the panel sections
- Ensure the avatar, button, and input continue to use the existing token system cleanly in both light and dark themes
- Update tests only if they rely on the old header semantics

### Out of scope

- Re-layout of the profile area
- New profile header design
- New gradients or theme-specific decorative styling
- Changes to settings behavior or persistence

## Implementation Notes

### `SettingsPanel`

The current top area uses a header-specific background:

- hardcoded light gradient
- dark-mode override to remove that background

That approach should be removed. The panel should rely on the same background token as the surrounding settings surface.

Recommended direction:

- remove the gradient classes from the top section
- use token-based background and border styling only
- preserve the current spacing and structure

### Visual result

Expected outcome:

- Light mode: top profile area blends naturally with the panel instead of appearing as a separate cream header
- Dark mode: no bright band appears at the top of the panel
- Both themes: the panel reads as one cohesive settings surface

## Testing

Update or retain tests that verify:

- settings panel still renders the same sections and actions
- avatar upload action still exists
- display name editing behavior is unchanged
- no test assumes a separate profile header section exists

Manual verification should confirm:

- light mode panel top matches the rest of the panel surface
- dark mode panel top no longer shows a light background
- button, input, and avatar remain legible in both themes

## Risks

### Risk: panel loses enough visual separation at the top

Removing the special header styling could make the top area feel flatter.

Mitigation:

- keep existing spacing
- keep border separation where needed
- rely on control shapes and typography rather than a separate themed header

### Risk: dark mode still contains one-off light styles

If any top-area child still uses fixed light colors, the visual bug may remain partially visible.

Mitigation:

- check the profile area for hardcoded light backgrounds or text colors
- keep the implementation token-driven end to end

## Recommendation

Implement this as a theme-token cleanup, not a redesign.

That matches the approved scope:

- no new header
- no layout change
- no behavior change
- one consistent panel surface across light and dark themes
