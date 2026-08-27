# 410pages Design System

## 1. Product Direction

410pages is a warm editorial library for collecting sentences and words from books. The author index is the home anchor, each author opens a CSS bookshelf, and each book becomes a continuous paper-like reading list.

## 2. Design Principles

- Prioritize collected text over navigation, metadata, and decoration.
- Use one clear primary action per context.
- Show optimistic items as complete; surface a recovery state only after failure.
- Prefer direct Korean labels over unexplained icons or mixed-language copy.
- Avoid decorative gradients, glass effects, and repeated card borders.

## 3. Color and Themes

- All surfaces and text colors come from CSS custom properties in `index.css`.
- The editorial day theme uses warm paper-like surfaces and a restrained red accent.
- Dark and named themes preserve the same semantic token roles.
- `--text-muted` must maintain at least WCAG AA 4.5:1 contrast against main, card, and input surfaces.
- Red is reserved for primary emphasis and failure recovery; green is reserved for successful completion.

## 4. Typography

- UI text uses `--font-ui-active`; collected sentences use the configured reading font.
- Sentence copy uses a comfortable 1.6 line height and stable bounded type classes.
- Titles are compact and semibold; metadata and control labels remain smaller than content.
- Korean interface copy is the default. Product names and user-provided book data are not translated.
- Mobile sentence text is left-aligned to prevent uneven spacing.

## 5. Layout and Spacing

- The reading column is the main anchor and retains a consistent maximum width.
- Use the existing 4px-based spacing scale; major component gaps are 8, 12, 16, or 24px.
- Author index tiles form the home rhythm; book silhouettes form the second-level rhythm. Inside a book, sentences and words use the same flat rows separated by whitespace or a single divider.
- Desktop uses one left navigation rail. Mobile exposes the same hierarchy in one modal sheet.
- Editor source fields wrap into two balanced rows at 375px without horizontal overflow.

## 6. Shape and Elevation

- Standard radii are 8px for compact controls, 12px for book tiles, 16px for panels, and full pills for metadata.
- Elevation is reserved for dialogs and contextual panels. Sentence rows do not use card shadows.
- Borders identify inputs, popovers, and explicit state boundaries only.
- Selected items use an inset accent ring. Failed items use a red inset ring plus one group-level recovery message.

## 7. Components

- Author tile: paper index silhouette with a large centered author name and quiet book count; no decorative sequence label; the first tile is inline author creation.
- Author/book tile actions: one bottom-right overflow control, revealed by hover/focus on pointer layouts and always visible on touch layouts.
- Book tile: CSS book silhouette with title; the first tile is inline book creation and no external cover image is used.
- Sentence row: dominant text, quiet metadata, hover/focus selection control, and a separate detail action.
- Citation detail panel: notes, editing, and deletion for the active sentence.
- Undo toast: immediate sentence removal with one explicit five-second recovery action.
- Word row: flat divider-separated text with checkbox, date, and inline edit; no chip/card shadow.
- Header: centered search on desktop and one account action; mobile exposes one navigation action and settings as 44px targets.
- Editor: fixed to the bottom in book view, Korean placeholder and labels, hidden source fields, and a clear send action.
- Auth: Korean login, signup, reset request, and recovery screens with password visibility controls and actionable error copy.

## 8. Interaction and Accessibility

- Touch targets are at least 44px on mobile; dense desktop inputs may reduce to 32px only at the desktop breakpoint.
- Every icon-only action has a Korean accessible name and visible focus behavior.
- Popovers use menu semantics, Escape dismissal, and state attributes.
- Desktop author and author-folder actions appear on hover or keyboard focus; mobile uses one 44px more-actions button.
- Animate only color, shadow, opacity, or transform for 150–200ms; respect `prefers-reduced-motion`.
- Saving has no pending badge, disabled card, or alternate card treatment. Failure feedback must explain the next action.

## 9. Responsive Rules

- Verify integrated layouts at desktop width and at 375px.
- Never allow horizontal page scrolling, clipped controls, or fixed-width word chips.
- Word text uses `break-words`; editor controls use wrapping flex layouts.
- Desktop search remains visually centered even when account actions change width.
- Mobile overlays use a plain dim layer and solid panels, not glassmorphism.
