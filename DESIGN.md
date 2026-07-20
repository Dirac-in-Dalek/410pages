# 410pages Design System

## 1. Product Direction

410pages is a calm editorial archive for collecting sentences and words from books. Pinterest is a reference for color balance and component finish, not for feed layout or information architecture. Reading content is always the visual foreground; controls remain quiet until needed.

## 2. Design Principles

- Prioritize collected text over navigation, metadata, and decoration.
- Use one clear primary action per context.
- Show optimistic items as complete; surface a recovery state only after failure.
- Prefer direct Korean labels over unexplained icons or mixed-language copy.
- Avoid decorative gradients, glass effects, and repeated card borders.

## 3. Color and Themes

- All surfaces and text colors come from CSS custom properties in `index.css`.
- The Pinterest-like day theme uses warm neutral surfaces and a restrained red accent.
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
- Sentence cards form the primary vertical rhythm. Word cards occupy a compact wrapped row directly above the related sentence position.
- Desktop keeps navigation secondary; mobile moves navigation into focused side sheets.
- Editor source fields wrap into two balanced rows at 375px without horizontal overflow.

## 6. Shape and Elevation

- Standard radii are 8px for compact controls, 12px for cards, 16px for panels, and full pills for metadata.
- Cards use subtle shadows instead of repeated borders.
- Borders identify inputs, popovers, and explicit state boundaries only.
- Selected items use an inset accent ring. Failed items use a red inset ring plus one group-level recovery message.

## 7. Components

- Sentence card: dominant reading surface, 44px selection target, quiet metadata, expandable copy, and optional notes.
- Word card: checkbox plus one wrapping word or short phrase; no author, book, page, note, edit, or per-card retry UI.
- Header: centered search on desktop and one account action; mobile exposes folders, library, and settings as 44px targets.
- Editor: Korean placeholder and labels, compact source fields, and a clear send action.
- Auth: Korean login, signup, reset request, and recovery screens with password visibility controls and actionable error copy.

## 8. Interaction and Accessibility

- Touch targets are at least 44px on mobile; dense desktop inputs may reduce to 32px only at the desktop breakpoint.
- Every icon-only action has a Korean accessible name and visible focus behavior.
- Popovers use menu semantics, Escape dismissal, and state attributes.
- Animate only color, shadow, opacity, or transform for 150–200ms; respect `prefers-reduced-motion`.
- Saving has no pending badge, disabled card, or alternate card treatment. Failure feedback must explain the next action.

## 9. Responsive Rules

- Verify integrated layouts at desktop width and at 375px.
- Never allow horizontal page scrolling, clipped controls, or fixed-width word chips.
- Word text uses `break-words`; editor controls use wrapping flex layouts.
- Desktop search remains visually centered even when account actions change width.
- Mobile overlays use a plain dim layer and solid panels, not glassmorphism.
