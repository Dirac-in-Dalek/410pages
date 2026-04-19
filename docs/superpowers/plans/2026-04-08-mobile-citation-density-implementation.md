# Mobile Citation Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make mobile archive browsing denser by moving folder and library entry points into the mobile header and collapsing long citation text to 2 lines on mobile and 3 lines on desktop.

**Architecture:** Keep the navigation change isolated to `MobileLayout.tsx` so existing sheet behavior stays intact. Keep citation text clamping self-contained in `CitationCard.tsx`, with overflow detection and a local expand/collapse state that only affects read mode.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Tailwind utility classes

---

## File Structure

- Modify: `components/MobileLayout.tsx`
  - Replace the bottom mobile nav bar with compact header action buttons for folders and library.
- Modify: `components/CitationCard.tsx`
  - Add responsive clamp and expand/collapse behavior for long citation text.
- Modify: `components/CitationTypography.test.tsx`
  - Add card-level tests for collapsed and expanded text behavior.
- Create: `components/MobileLayout.test.tsx`
  - Verify the header actions open the existing left and right sheets and that the bottom nav is removed.

### Task 1: Lock In Mobile Header Actions With Tests

**Files:**
- Create: `components/MobileLayout.test.tsx`
- Modify: `components/MobileLayout.tsx`

- [ ] **Step 1: Write the failing mobile layout test**

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MobileLayout } from './MobileLayout';

describe('MobileLayout header actions', () => {
  it('opens folders and library from header actions without rendering the bottom nav labels', async () => {
    const user = userEvent.setup();

    render(
      <MobileLayout
        title="All Citations"
        projects={[]}
        selectedProjectId={null}
        onProjectSelect={vi.fn()}
        onCreateProject={vi.fn()}
        treeData={[]}
        onTreeItemClick={vi.fn()}
        onOpenSettings={vi.fn()}
      >
        <div>Archive content</div>
      </MobileLayout>
    );

    expect(screen.queryByText('Folders')).toBeNull();
    expect(screen.queryByText('Library')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Open folders' }));
    expect(screen.getByRole('heading', { name: 'Folders' })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Open library' }));
    expect(screen.getByRole('heading', { name: 'Library' })).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails for the right reason**

Run: `npm test -- components/MobileLayout.test.tsx`

Expected: FAIL because `Open folders` and `Open library` buttons do not exist yet, and the current layout still renders bottom nav labels.

- [ ] **Step 3: Implement the minimal mobile header action change**

```tsx
const headerActionClass =
  'flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-main)] text-[var(--text-muted)] transition-colors hover:bg-[var(--sidebar-hover)]';

<div className="flex items-center gap-2">
  <button
    type="button"
    onClick={toggleProjectsPanel}
    className={headerActionClass}
    aria-label="Open folders"
  >
    <Folder size={16} />
  </button>
  <button
    type="button"
    onClick={toggleLibraryPanel}
    className={headerActionClass}
    aria-label="Open library"
  >
    <Library size={16} />
  </button>
  <button
    type="button"
    onClick={onOpenSettings}
    className={headerActionClass}
    aria-label="Open settings"
  >
    <Settings size={17} />
  </button>
</div>
```

Also:

- remove the `navButtonClass` helper
- remove the bottom `<nav>` block
- remove the extra bottom padding on `<main>` that existed only to clear the nav bar
- change the sheet titles to semantic headings:

```tsx
<h2 className="type-title-bounded font-semibold">Folders</h2>
<h2 className="type-title-bounded font-semibold">Library</h2>
```

- [ ] **Step 4: Run the mobile layout test to verify it passes**

Run: `npm test -- components/MobileLayout.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit the mobile layout change**

```bash
git add components/MobileLayout.tsx components/MobileLayout.test.tsx
git commit -m "feat: move mobile navigation actions into header"
```

### Task 2: Add Responsive Citation Clamp With TDD

**Files:**
- Modify: `components/CitationCard.tsx`
- Modify: `components/CitationTypography.test.tsx`

- [ ] **Step 1: Write the failing citation clamp tests**

Add these cases to `components/CitationTypography.test.tsx`:

```tsx
it('starts long citations in a collapsed state with a More action', () => {
  render(
    <CitationCard
      citation={{
        ...citation,
        text: 'Long quote '.repeat(80),
      }}
      index={0}
      username="Dalek"
      isSelected={false}
      onToggleSelect={vi.fn()}
      onAddNote={vi.fn()}
      onUpdateNote={vi.fn()}
      onDeleteNote={vi.fn()}
      onDelete={vi.fn()}
      onUpdate={vi.fn()}
    />
  );

  expect(screen.getByRole('button', { name: /more/i })).not.toBeNull();
  expect(screen.getByTestId('citation-text').className).toContain('line-clamp-2');
  expect(screen.getByTestId('citation-text').className).toContain('lg:line-clamp-3');
});

it('expands long citations when the More action is pressed', async () => {
  const user = userEvent.setup();

  render(
    <CitationCard
      citation={{
        ...citation,
        text: 'Long quote '.repeat(80),
      }}
      index={0}
      username="Dalek"
      isSelected={false}
      onToggleSelect={vi.fn()}
      onAddNote={vi.fn()}
      onUpdateNote={vi.fn()}
      onDeleteNote={vi.fn()}
      onDelete={vi.fn()}
      onUpdate={vi.fn()}
    />
  );

  await user.click(screen.getByRole('button', { name: /more/i }));

  expect(screen.getByRole('button', { name: /less/i })).not.toBeNull();
  expect(screen.getByTestId('citation-text').className).not.toContain('line-clamp-2');
});
```

- [ ] **Step 2: Run the citation typography test file to verify RED**

Run: `npm test -- components/CitationTypography.test.tsx`

Expected: FAIL because the new toggle button and `data-testid="citation-text"` do not exist yet.

- [ ] **Step 3: Implement the minimal citation clamp behavior**

In `components/CitationCard.tsx`, add local UI state:

```tsx
const [isExpanded, setIsExpanded] = useState(false);
const [isOverflowing, setIsOverflowing] = useState(false);
const quoteRef = useRef<HTMLElement>(null);
```

Add an effect to measure overflow:

```tsx
useEffect(() => {
  if (isEditing) {
    setIsOverflowing(false);
    return;
  }

  const quote = quoteRef.current;
  if (!quote) return;

  const checkOverflow = () => {
    if (isExpanded) {
      setIsOverflowing(true);
      return;
    }

    setIsOverflowing(quote.scrollHeight - quote.clientHeight > 1);
  };

  checkOverflow();
  window.addEventListener('resize', checkOverflow);
  return () => window.removeEventListener('resize', checkOverflow);
}, [citation.text, isEditing, isExpanded, localHighlights]);
```

Update the blockquote:

```tsx
<blockquote
  ref={quoteRef}
  data-testid="citation-text"
  className={[
    'type-body leading-relaxed text-[var(--text-main)] relative z-10 select-text whitespace-pre-wrap',
    isExpanded ? 'mb-2' : 'mb-2 line-clamp-2 lg:line-clamp-3'
  ].join(' ')}
  onMouseUp={handleTextSelection}
>
  {renderHighlightedText()}
</blockquote>
```

Render the secondary toggle only when needed:

```tsx
{isOverflowing && (
  <button
    type="button"
    onClick={() => setIsExpanded((prev) => !prev)}
    className="type-label-bounded mb-4 text-[var(--text-muted)] underline-offset-2 hover:text-[var(--text-main)] hover:underline"
    aria-label={isExpanded ? 'Less' : 'More'}
  >
    {isExpanded ? 'Less' : 'More'}
  </button>
)}
```

- [ ] **Step 4: Run the citation tests to verify GREEN**

Run: `npm test -- components/CitationTypography.test.tsx`

Expected: PASS

- [ ] **Step 5: Run the combined verification for both tasks**

Run: `npm test -- components/MobileLayout.test.tsx components/CitationTypography.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit the citation clamp change**

```bash
git add components/CitationCard.tsx components/CitationTypography.test.tsx
git commit -m "feat: clamp citation text by default"
```

### Task 3: Final Regression Check

**Files:**
- Verify: `components/MobileLayout.tsx`
- Verify: `components/CitationCard.tsx`
- Verify: `components/CitationTypography.test.tsx`
- Verify: `components/MobileLayout.test.tsx`

- [ ] **Step 1: Run the targeted and full test suites**

Run: `npm test -- components/MobileLayout.test.tsx components/CitationTypography.test.tsx`

Expected: PASS

Run: `npm test`

Expected: PASS with no new failures

- [ ] **Step 2: Review the changed files for scope drift**

Check that:

- `MobileLayout.tsx` only changes mobile header and bottom nav behavior
- `CitationCard.tsx` only changes read-mode quote display behavior
- no desktop sidebar structure changed
- no citation editor layout changed

- [ ] **Step 3: Commit any final cleanup if needed**

```bash
git status --short
```

Expected: working tree clean, or only intentional changes remain for a final commit
