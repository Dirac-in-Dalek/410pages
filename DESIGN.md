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
- Book tile: use the matched YES24 cover according to `docs/policies/book-metadata.md`; fall back to a CSS book silhouette when no unambiguous cover is available. The first tile is inline book creation.
- Sentence row: dominant text, quiet metadata, hover/focus selection control, and a separate detail action.
- Citation detail panel: notes, editing, and deletion for the active sentence.
- Undo toast: immediate sentence removal with one explicit five-second recovery action.
- All saved text uses the citation row regardless of length. There is no separate word object or word-specific UI; see `docs/policies/citation-saving.md`.
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

## 2026-09-13 Chapter alignment refinement

- Keep chapter title and management controls in one row, including narrow screens. Fold stays in the reading gutter; edit and delete share the right side of the first line. The title itself supports dragging and keyboard movement without a duplicate grip button.
- Book title, top-level chapter title and root citations share the reading start line. The selected grouped layout indents descendant titles and their citations/page/memo together.
- Use the existing item boundary as the chapter-add target. Do not reserve an extra add row or draw a second divider. Expand space only while editing.
- Use one parent rail with a single soft turn to each direct child, following the observed YouTube threaded-reply presentation. Siblings share a rail; grandchildren belong to their direct parent.
- Review the full book screen with real-length text and multiple hierarchy levels. Individual column measurements alone are insufficient evidence of a clean layout.

### 챕터·인용문 조작의 표시

챕터 수정·삭제는 마우스를 올리거나 키보드 초점이 행 안에 있을 때 표시한다. 제목 편집 중 저장·취소는 항상 표시한다. 호버가 없는 입력 환경에서도 조작을 찾을 수 있게 한다. 인용문 이동 손잡이는 본문 선택·강조와 구분하고 호버·초점 시 표시한다. 해당 이동 기능은 운영 DB 필드 추가 후 사용자 로컬 앱에 연결했다.

### 읽기 화면의 글자 위계

책 제목 > 최상위 챕터 > 하위 챕터 > 세부 챕터 > 인용문 > 페이지·보조 정보 순서로 크기를 구분한다. 앞의 다섯 단계는 사용자 본문 크기에 각각 2/1.6/1.3/1.1/1 배율을 적용한다. 들여쓰기뿐 아니라 글자 크기 자체로 정보 위계가 보여야 한다.

## 2026-09-13 Reading workspace refinement

- Book-wide notes start closed and open from the labeled Book notes button. Library visibility and showing all passage notes are independent controls. During ordinary reading, closed panels release their space to the reading region; active side-by-side note comparisons retain their reference alignment.
- Keep one global passage-notes control above the list. Use scope-specific note labels and visible autosave progress/success for the book-wide memo.
- Render citation details in the source row. Keep the original passage-note component mounted but hidden while details are open. Session-owned edit state survives filtering, and pending saves remain locked through remounts.
- Separate the left citation grip and selection checkbox into two 44px slots in the existing gutter. Never make the text itself draggable. Exclude this gutter and text/editor content from connection paths.
- Use quieter original divider lines and flat inline forms. Default fine-pointer chapter rows are 48px; the empty citation textarea is 40px with automatic expansion. Preserve touch control sizes and the fixed bottom composer.
- Book, chapter, child, deep chapter and body use 2/1.6/1.3/1.1/1 body-size ratios on desktop; narrow screens use 1.8/1.4/1.2/1.1/1. Remove repeated mobile book-title metadata.
- Saved-state visibility for book notes supersedes the earlier generic no-pending-badge guidance for that panel. The underlying 800ms autosave and explicit save path stay the same.
