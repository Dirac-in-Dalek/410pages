# Book Chapter Blocks Design

## Goal

Allow users to insert book-specific structure blocks such as `3장` or `시 제목` between citations so the book view reads more like an organized reading flow.

This feature is only for book view.

- Show chapter blocks when a specific book is selected
- Hide chapter blocks in author view
- Hide chapter blocks in project view
- Hide chapter blocks in the all-citations view

## Approved Behavior

### User flow

- In book view, a `+ block` affordance appears only when the user hovers between citations
- Clicking it opens a small inline input
- The user enters any freeform label such as `3장` or `시 제목`
- Saving inserts a visible chapter block between the surrounding citations

### Visibility rules

- Chapter blocks belong to a book, not to a citation and not to a note
- Chapter blocks render only in book view
- Other views continue to show only citations

### Sorting behavior

- Chapter blocks must participate in the same date/page sorting flow as citations when rendered in book view
- Their sort position is stored directly as numeric sort values
- Example: if a block is inserted between page `335` and page `337`, its `page_sort` can be stored as `336`
- The same midpoint rule applies to time ordering through `created_at_sort`

### Visual treatment

- Chapter blocks should look clearly different from citations
- They should read as separators or section markers, not as quote cards
- The add affordance stays hidden until hover so the list remains visually quiet

## Problem Framing

The current citation list is a pure stack of quote cards.

That works for capture, but it makes a selected book feel flat because there is no way to mark internal reading structure such as chapters, poem titles, or sections.

Completion means:

- a user can insert a labeled structure block at a chosen position in book view
- the block stays in the intended place under page/date sorts
- the block is not shown in non-book contexts

Good results mean:

- the book view becomes easier to scan
- the feature does not complicate existing citation flows
- the data model stays narrow and easy to maintain

## State And System Design

### Ownership

- `citations` remain the source of truth for quotes
- `chapter_blocks` becomes the source of truth for book-only structure markers
- book view owns the merge step that combines citations and chapter blocks into one rendered list

### Storage model

Create a new `chapter_blocks` table with fields equivalent to:

```ts
type ChapterBlock = {
  id: string;
  bookId: string;
  label: string;
  pageSort?: number;
  createdAtSort: number;
  userId: string;
  createdAt: string;
};
```

Required columns:

- `id`
- `book_id`
- `label`
- `page_sort`
- `created_at_sort`
- `user_id`
- `created_at`

Recommended constraints:

- `book_id` references `books(id)` with cascade delete
- row-level security matches the existing per-user pattern

### Boundary definition

- Database layer: persist and fetch chapter blocks
- Data hooks: expose create/fetch operations and merge-ready view data
- UI layer: render hover affordance, inline input, and chapter block presentation

Do not move existing citation ownership into a new shared item table in this change.

## Logic Design

### Insertion rule

When creating a block between two visible citations in book view:

- compute `page_sort` as a midpoint between the surrounding citation page sort values when both exist
- compute `created_at_sort` as a midpoint between the surrounding citation timestamps

Fallbacks:

- if only one side has a page value, derive a nearby decimal position from that side
- if neither side has a page value, leave `page_sort` empty and rely on `created_at_sort`
- if inserted at the start or end of the list, derive a nearby value outside the neighboring item

Accepted examples:

- between `335` and `337` -> `336`
- between `336` and `337` -> `336.5`
- after `336` with no right neighbor -> `336.9`
- before `336` with no left neighbor -> `335.9` or another safely smaller nearby value

What matters is stable ordering between adjacent items without changing neighboring citation data.

### Rendering rule

In book view:

1. fetch citations for the selected book
2. fetch chapter blocks for the selected book
3. normalize both into a common render shape
4. sort with the active sort mode using citation values or chapter block sort values
5. render citations as quote cards and chapter blocks as separators

In every other view:

- skip chapter block fetch/merge entirely

### Hover affordance rule

- The `+ block` trigger appears only while hovering the insertion zone between citations
- It should not permanently occupy visual space
- It should be easy to discover when intentionally moving the mouse through the list

## Implementation Strategy

### Recommended approach

1. Add `chapter_blocks` schema and API methods
2. Extend archive data loading with chapter block fetch support
3. Add a book-view-only merge layer that combines citations and chapter blocks
4. Add inline insertion zones between citations
5. Render chapter blocks with a distinct visual component

### Why this approach

- keeps current citation storage intact
- limits scope to the exact feature requested
- matches the requirement that blocks only matter inside book view
- leaves room to generalize later if more block types become necessary

## Testing

Add or update tests for:

- chapter blocks fetch only in book view
- chapter blocks never render in author/project/all views
- inserting a block between two citations produces the expected relative sort position
- page sort and date sort keep the block between the intended neighboring citations
- hover affordance stays hidden until hover

Manual verification:

- open a book with multiple citations
- hover between two citations and create `3장`
- confirm the block appears in that position
- switch between page and date sorting and confirm the block stays logically between neighbors
- switch to author view and confirm the block disappears
- switch to project view and confirm the block disappears

## Risks

### Risk: midpoint exhaustion

If users insert many blocks repeatedly between the same neighbors, sort values can become overly granular.

Mitigation:

- accept decimal midpoint values for now
- defer rebalancing logic unless real usage shows it is needed

### Risk: sort ambiguity when page data is sparse

Some citations may not have a usable page number.

Mitigation:

- treat `created_at_sort` as the reliable fallback ordering channel
- keep page ordering best-effort rather than forcing synthetic page values

### Risk: UI clutter

Too many visible insertion controls would make the list noisy.

Mitigation:

- keep insertion affordances hover-only
- style chapter blocks as light separators instead of full cards
