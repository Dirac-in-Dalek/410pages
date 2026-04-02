# Settings Panel Design

## Goal

Add a user settings experience that feels like a lightweight layer over the current workspace, not a separate page. The first version should support:

- Profile photo change
- Display name change
- Font change
- Text size change
- Theme change

The interaction model should feel close to Notion's "open a layer above the current context" behavior, while preserving the app's existing left/right workspace layout.

## Context

The current desktop experience has:

- A left project sidebar
- A central archive content area
- A right library sidebar

The current mobile experience has:

- A top header
- A bottom navigation for opening projects and library sheets

There is already a global dark mode toggle managed through `useDarkMode`, and the app already uses CSS variables for colors and fonts in [`/Users/life_habit/Desktop/Vibe APP/Sentences/the-citation-graph/index.css`](/Users/life_habit/Desktop/Vibe%20APP/Sentences/the-citation-graph/index.css).

This means the settings feature should extend existing global UI state rather than introduce page-local state.

## UX Decisions

### Entry point

Desktop settings should open from the user area at the bottom of the left sidebar.

That area should contain:

- User avatar
- Display name
- Small settings trigger

Reasoning:

- Settings are personal, global preferences, not project-specific tools
- The user area is already the natural home for profile-related actions
- This avoids competing with archive actions and avoids inventing a new top app bar

Mobile settings should reuse the same settings content, but the entry point can live in the mobile header or user menu rather than the bottom nav. The bottom nav should stay focused on workspace navigation.

### Layer model

Desktop settings should open as a right-side sliding panel above the existing screen.

Recommended desktop behavior:

- Width: `420px` to `520px`
- Enter from the right edge
- Backdrop: subtle dim overlay with light blur
- Dismiss by close button, backdrop click, or `Escape`

This preserves context better than a centered modal and avoids the cost of a full-screen settings view.

### Internal structure

The first version should use a single-column vertical layout, not a left-nav settings shell.

Reasoning:

- The initial scope is only five settings
- A multi-section left navigation would add unnecessary chrome
- A vertical layout is faster to scan and easier to implement cleanly

### Visual direction

The chosen direction is a profile-emphasized panel.

Panel composition:

- Top header with panel title and close button
- Profile hero area near the top
- Three vertical sections below:
  - Profile
  - Text
  - Appearance

This gives the panel a clear "personal space" feeling without becoming a separate app view.

### Interaction style

Settings controls should be directly visible rather than hidden behind expandable rows.

Recommended controls:

- Profile photo: avatar preview plus `Change` action
- Display name: inline text input
- Font: dropdown/select
- Text size: segmented control or slider
- Theme: segmented control with `Light`, `Dark`, `System`

Reasoning:

- Most of these settings benefit from immediate adjustment and instant visual feedback
- The first version has too few items to justify collapsed rows
- Right-panel settings should feel quick and editable at a glance

## UI Structure

### Desktop panel layout

1. Header
   - Title: `설정`
   - Close button on the right

2. Profile hero
   - Larger avatar
   - Display name
   - Secondary descriptor if useful

3. Profile section
   - Profile photo row with preview and change action
   - Name field

4. Text section
   - Font selector
   - Text size control

5. Appearance section
   - Theme selector

6. Optional footer behavior
   - No explicit save button for local preference changes
   - Use optimistic updates with debounced persistence where needed

### Mobile layout

Mobile should reuse the same content model with a different container:

- Full-height or near-full-height sheet
- Same section ordering
- Same control model

Do not build a separate mobile settings information architecture for this version.

## State Design

### Preference model

Introduce a single user preferences model that owns global UI preferences.

Suggested shape:

```ts
type ThemePreference = 'light' | 'dark' | 'system';
type FontPreference = 'pretendard' | 'serif';
type TextScalePreference = 'sm' | 'md' | 'lg';

type UserPreferences = {
  displayName: string;
  avatarUrl: string | null;
  theme: ThemePreference;
  fontFamily: FontPreference;
  textScale: TextScalePreference;
};
```

This should replace the current narrow "dark mode only" mental model with a broader user preference model.

### Ownership

Preference state should be owned at the app shell level and exposed through a dedicated hook such as `useUserPreferences`.

Recommended responsibility split:

- `App.tsx`
  - Owns panel open/close state
  - Wires preference state into desktop and mobile layout entry points
- `useUserPreferences`
  - Loads preferences
  - Updates preferences
  - Persists preferences
  - Exposes derived theme application state
- `SettingsPanel`
  - Pure UI container for editing preferences

### Why not keep using `useDarkMode`

`useDarkMode` is too specific for the target feature set. It should either:

- Be replaced by `useUserPreferences`, or
- Be absorbed into `useUserPreferences` and removed

The preferred direction is consolidation, not parallel preference hooks.

## Rendering Strategy

### CSS variables

Font and text size changes should be applied through CSS variables so the entire app updates consistently.

Current CSS already defines:

- `--font-ui`
- `--font-display`
- Theme color variables on `:root` and `.dark`

Extend this approach with:

- Font family variants selectable through a root data attribute or root-level CSS variable override
- Text scale variables for control sizing and typography

Possible additions:

```css
:root {
  --text-scale: 1;
  --font-ui-active: var(--font-ui);
  --font-display-active: var(--font-display);
}
```

Then apply `font-family: var(--font-ui-active)` and font-size scaling where appropriate.

### Theme application

Theme should support three states:

- `light`
- `dark`
- `system`

The hook should resolve a final applied mode based on:

- Stored preference
- Current OS media query when preference is `system`

This is a structural upgrade from the current toggle model.

## Component Architecture

Create a dedicated settings area under `components/settings/`.

Recommended structure:

- `components/settings/SettingsPanel.tsx`
- `components/settings/SettingsSection.tsx`
- `components/settings/ProfileSettingsSection.tsx`
- `components/settings/TextSettingsSection.tsx`
- `components/settings/AppearanceSettingsSection.tsx`

This keeps the feature isolated and avoids bloating `ProjectSidebar` or `MainLayout`.

### Integration points

Desktop:

- `App.tsx` passes `onOpenSettings` into `MainLayout`
- `MainLayout` passes it into `ProjectSidebar`
- `ProjectSidebar` renders the user area trigger
- `SettingsPanel` mounts near the app root so it can overlay the full shell cleanly

Mobile:

- `App.tsx` passes `onOpenSettings` into `MobileLayout`
- `MobileLayout` renders the trigger in the header or user affordance
- The same `SettingsPanel` content is reused with a mobile container mode

## Persistence Strategy

### Phase 1

Persist to local storage for immediate, reliable UI behavior.

This phase should cover:

- Theme
- Font
- Text size
- Locally cached display name

### Phase 2

Sync preferences to the authenticated user record in Supabase.

Recommended sequence:

1. Apply change locally immediately
2. Persist locally
3. Sync remotely in the background
4. Surface errors non-destructively if remote save fails

### Profile photo

Profile photo should be treated separately from simple scalar preferences because it requires:

- File selection
- Upload flow
- Storage path handling
- URL persistence

Do not entangle avatar upload behavior with simple theme/font update logic.

## Behavior Rules

- Opening settings must not navigate away from the current archive state
- Closing settings must preserve the underlying scroll and current archive filter context
- Preference changes should reflect immediately when safe
- Theme, font, and text size should update live
- Name changes can update on blur or with a short debounce
- Avatar change can use a discrete upload action with progress or pending state

## Accessibility

- Panel must trap focus while open
- `Escape` closes the panel
- Initial focus should land on the close button or the first editable control
- Backdrop should be inert to screen readers when panel is open
- All icon-only buttons need accessible labels
- Theme and text-size controls must remain usable by keyboard only

## Risks

### Hook fragmentation

If `useDarkMode` and `useUserPreferences` both survive, preference logic will become split and harder to reason about.

Mitigation:

- Consolidate into one preference hook

### Styling inconsistencies

If font and text scale are applied ad hoc per component, the result will be uneven.

Mitigation:

- Route typography changes through root CSS variables and shared utility classes

### Auth/profile overlap

The app already has a username flow in `useAuthStatus`. Duplicating name state in another place can create sync bugs.

Mitigation:

- Define one source of truth and one update path for display name

### Mobile drift

If mobile gets its own separate settings structure too early, the feature will fork unnecessarily.

Mitigation:

- Reuse one content model and vary only the container

## Testing Strategy

### Functional checks

- Open and close panel on desktop
- Open and close panel on mobile
- Change theme and verify live application
- Change font and verify global typography update
- Change text size and verify visible scaling
- Change name and verify header/sidebar surfaces update consistently
- Change avatar and verify preview updates

### Regression checks

- Existing desktop sidebar interactions still work
- Existing mobile sheet interactions still work
- PDF reader mode is unaffected when settings are closed
- No layout shift or overflow regressions in the archive screen

## Out of Scope

- Multi-page settings navigation
- Notification settings
- Account security settings
- Workspace-level preferences
- Advanced typography customization beyond the initial font and size controls

## Recommended Implementation Order

1. Introduce `useUserPreferences`
2. Migrate dark mode handling into the new preference model
3. Add root-level theme/font/text-scale application
4. Build `SettingsPanel` and section components
5. Add desktop and mobile entry points
6. Add local persistence
7. Add remote Supabase sync
8. Add avatar upload flow

## Final Recommendation

Build the first version as a personal settings layer, not a new screen.

The decisive architectural move is to treat theme, font, and text size as global preferences owned by a single hook and rendered through root CSS variables. The decisive UX move is to open settings from the user area and show direct-edit controls in a right-side panel with profile emphasis.
