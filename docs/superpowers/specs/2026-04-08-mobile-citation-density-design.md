# Mobile Citation Density Design

## Summary

Improve the mobile citation browsing experience by reducing visual weight on first load.

Two approved changes are in scope:

1. Replace the bottom mobile `Folders / Library` bar with compact circular header actions.
2. Collapse citation text by default to `2 lines on mobile` and `3 lines on desktop`, with an inline expand/collapse control for longer citations.

This design intentionally preserves the current sheet behavior and avoids changing desktop sidebar structure.

## Problem Framing

### What this change solves

- Mobile users currently see too few citations above the fold because each card expands to full text height.
- The bottom `Folders / Library` controls take too much visual space and feel heavier than their actual function.
- The screen should prioritize browsing and comparing citations before secondary navigation.

### Done means

- On mobile, the bottom navigation bar for `Folders / Library` is removed.
- On mobile, `Folders`, `Library`, and `Settings` are available as compact circular buttons in the top header.
- Citation cards default to collapsed text presentation.
- The text clamp is `2 lines on mobile`, `3 lines on desktop`.
- Only citations that overflow show a `More / Less` style control.
- Existing folder and library sheets still open from the same sides and keep the same internal behavior.

### Success criteria

- More citations are visible in the first mobile viewport.
- Navigation to folders and library is still easy, but less visually dominant.
- Desktop layout behavior remains familiar.

## State And System Design

### Ownership boundaries

- `MobileLayout.tsx`
  - Owns the mobile header action placement.
  - Continues to own `isProjectsOpen` and `isLibraryOpen`.
  - Reuses the current left/right sheet behavior.

- `CitationCard.tsx`
  - Owns collapsed vs expanded citation text presentation.
  - Decides whether the expand/collapse affordance should appear.

- Desktop layout
  - Remains owned by `MainLayout.tsx` and desktop sidebars.
  - No desktop sidebar architecture change is included in this work.

### State model

Add local per-card UI state for citation text expansion:

- `isExpanded: boolean`
- `isOverflowing: boolean`

Existing mobile panel state is reused as-is:

- `isProjectsOpen`
- `isLibraryOpen`

No cross-component shared state is needed for this change.

## Logic Design

### Mobile navigation behavior

- Remove the bottom mobile `Folders / Library` bar.
- Add two new circular icon buttons beside the existing `Settings` action in the mobile header:
  - `Folders`
  - `Library`
- Keep the current panel-opening rules:
  - `Folders` opens the left sheet.
  - `Library` opens the right sheet.
  - Opening one closes the other.

### Citation text collapse behavior

- Default collapsed state:
  - Mobile: 2 lines
  - Desktop: 3 lines
- If the citation text does not exceed the clamp, do not show the expand/collapse control.
- If the citation text exceeds the clamp, show an inline text action below the quote area.
- Expanded state shows the full citation text.
- Tapping the action toggles between collapsed and expanded.

### Editing and interaction rules

- While a citation is in edit mode, always show the full editable text area.
- Existing highlight rendering remains unchanged.
- Text selection/highlight behavior should continue to work on visible text.
- The collapse behavior applies only to read mode, not edit mode.

## UX Notes

- The header actions should be visually lighter than the current bottom controls.
- The new header actions should still be large enough for comfortable touch interaction.
- The expand/collapse control should read as a secondary action, not a primary button.
- The first impression of the screen should emphasize citation browsing, not navigation chrome.

## Out Of Scope

- Changing desktop sidebars into header actions.
- Redesigning folder/library sheet contents.
- Virtualized list rendering.
- Changing citation metadata tag hierarchy.
- Changing citation creation/editor layout.

## Risks And Mitigations

### Discoverability risk

Moving `Folders / Library` into header icons reduces their visual prominence.

Mitigation:

- Keep the icons adjacent to `Settings`.
- Use familiar icons and consistent circular affordance styling.

### Interaction risk

Clamped text can interfere with reading or selection expectations.

Mitigation:

- Show the control only when needed.
- Make expansion one tap away.
- Keep edit mode fully expanded.

## Implementation Notes

- Primary files expected:
  - `components/MobileLayout.tsx`
  - `components/CitationCard.tsx`
- Styling should follow existing token usage and avoid introducing a new mobile-only navigation system.
