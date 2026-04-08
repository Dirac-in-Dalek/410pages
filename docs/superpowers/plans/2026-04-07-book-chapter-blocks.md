# Book Chapter Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add book-only chapter blocks that users can insert between citations, keep them hidden outside book view, and preserve their relative position under page/date sorting.

**Architecture:** Keep citations unchanged and introduce a separate `chapter_blocks` table plus a lightweight merge layer for book view. The archive keeps using citation-only data everywhere else, while book view normalizes citations and chapter blocks into one sorted render list with hover-only insertion controls.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Supabase JS v2

---

### Task 1: Add Chapter Block Storage And API Surface

**Files:**
- Modify: `supabase_schema.sql`
- Modify: `types.ts`
- Modify: `lib/api.ts`
- Modify: `lib/api.test.ts`

- [ ] **Step 1: Define the new data types before wiring persistence**

Add focused types to `types.ts`:

```ts
export interface ChapterBlock {
  id: string;
  bookId: string;
  label: string;
  pageSort?: number;
  createdAtSort: number;
  createdAt: number;
}

export interface CreateChapterBlockInput {
  bookId: string;
  label: string;
  pageSort?: number;
  createdAtSort: number;
}
```

Expected result: chapter blocks are modeled independently from citations and are ready to flow through hooks and UI.

- [ ] **Step 2: Add the new Supabase table with the same per-user safety model**

Extend `supabase_schema.sql` with a `chapter_blocks` table:

```sql
create table if not exists chapter_blocks (
  id uuid default uuid_generate_v4() primary key,
  book_id uuid references books(id) on delete cascade not null,
  label text not null,
  page_sort double precision,
  created_at_sort double precision not null,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table chapter_blocks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Users can crud their own chapter_blocks') then
    create policy "Users can crud their own chapter_blocks" on chapter_blocks for all using (auth.uid() = user_id);
  end if;
end $$;
```

Expected result: database storage exists with cascade delete through `book_id` and matches the existing auth policy style.

- [ ] **Step 3: Add fetch/create methods in `lib/api.ts`**

Add two focused methods:

```ts
async fetchChapterBlocks(userId: string, bookId: string) {
  const { data, error } = await getSupabaseClient()
    .from('chapter_blocks')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .order('created_at_sort', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    bookId: row.book_id,
    label: row.label,
    pageSort: row.page_sort ?? undefined,
    createdAtSort: row.created_at_sort,
    createdAt: new Date(row.created_at).getTime(),
  }));
},

async createChapterBlock(userId: string, input: CreateChapterBlockInput) {
  const { data, error } = await getSupabaseClient()
    .from('chapter_blocks')
    .insert({
      book_id: input.bookId,
      label: input.label,
      page_sort: input.pageSort,
      created_at_sort: input.createdAtSort,
      user_id: userId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    bookId: data.book_id,
    label: data.label,
    pageSort: data.page_sort ?? undefined,
    createdAtSort: data.created_at_sort,
    createdAt: new Date(data.created_at).getTime(),
  };
}
```

Expected result: the app can persist and reload chapter blocks without changing citation storage.

- [ ] **Step 4: Add a focused API test for chapter block mapping**

Extend `lib/api.test.ts` with a new describe block that mocks `.from('chapter_blocks')` and asserts the API maps DB fields correctly:

```ts
it('maps a created chapter block from snake_case to camelCase', async () => {
  mockSingle.mockResolvedValue({
    data: {
      id: 'block-1',
      book_id: 'book-1',
      label: '3장',
      page_sort: 336,
      created_at_sort: 1700.5,
      created_at: '2026-04-07T10:00:00.000Z',
    },
    error: null,
  });

  const block = await api.createChapterBlock('user-1', {
    bookId: 'book-1',
    label: '3장',
    pageSort: 336,
    createdAtSort: 1700.5,
  });

  expect(block).toMatchObject({
    id: 'block-1',
    bookId: 'book-1',
    label: '3장',
    pageSort: 336,
    createdAtSort: 1700.5,
  });
});
```

- [ ] **Step 5: Run the API test**

Run: `npm test -- lib/api.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add supabase_schema.sql types.ts lib/api.ts lib/api.test.ts
git commit -m "feat: add chapter block storage"
```

### Task 2: Add Book-View Merge And Sort Logic

**Files:**
- Create: `lib/bookViewItems.ts`
- Create: `lib/bookViewItems.test.ts`
- Modify: `types.ts`

- [ ] **Step 1: Define a normalized render item union**

Add a shared render shape to `types.ts`:

```ts
export type BookViewItem =
  | { type: 'citation'; id: string; citation: Citation; pageSort?: number; createdAtSort: number }
  | { type: 'chapter_block'; id: string; block: ChapterBlock; pageSort?: number; createdAtSort: number };
```

Expected result: book view can sort citations and chapter blocks with one consistent item shape.

- [ ] **Step 2: Move page/date merge logic into a dedicated helper**

Create `lib/bookViewItems.ts`:

```ts
export const toBookViewItems = (
  citations: Citation[],
  chapterBlocks: ChapterBlock[],
): BookViewItem[] => {
  return [
    ...citations.map((citation) => ({
      type: 'citation' as const,
      id: citation.id,
      citation,
      pageSort: citation.pageSort,
      createdAtSort: citation.createdAt,
    })),
    ...chapterBlocks.map((block) => ({
      type: 'chapter_block' as const,
      id: block.id,
      block,
      pageSort: block.pageSort,
      createdAtSort: block.createdAtSort,
    })),
  ];
};

export const sortBookViewItems = (
  items: BookViewItem[],
  sortField: 'date' | 'page',
  direction: 'asc' | 'desc',
) => {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    if (sortField === 'date') {
      return (a.createdAtSort - b.createdAtSort) * factor;
    }
    if (a.pageSort == null && b.pageSort == null) {
      return a.createdAtSort - b.createdAtSort;
    }
    if (a.pageSort == null) return 1;
    if (b.pageSort == null) return -1;
    if (a.pageSort !== b.pageSort) return (a.pageSort - b.pageSort) * factor;
    return a.createdAtSort - b.createdAtSort;
  });
};
```

Expected result: the risky merge behavior lives in a unit-testable module instead of being hidden inside the component tree.

- [ ] **Step 3: Add insertion midpoint helpers**

In the same file, add a helper for new block positions:

```ts
export const getMidpoint = (left?: number, right?: number) => {
  if (left != null && right != null) return (left + right) / 2;
  if (left != null) return left + 0.9;
  if (right != null) return right - 0.1;
  return undefined;
};
```

Expected result: UI code can ask for `pageSort` and `createdAtSort` without duplicating arithmetic across components.

- [ ] **Step 4: Add unit tests that lock down the sort rules**

Create `lib/bookViewItems.test.ts`:

```ts
it('keeps a chapter block between neighboring citations under page sorting', () => {
  const citation335: Citation = {
    id: 'c-335',
    text: 'Page 335 quote',
    author: 'Author',
    book: 'Book',
    page: '335',
    pageSort: 335,
    notes: [],
    tags: [],
    createdAt: 1000,
  };
  const citation337: Citation = {
    id: 'c-337',
    text: 'Page 337 quote',
    author: 'Author',
    book: 'Book',
    page: '337',
    pageSort: 337,
    notes: [],
    tags: [],
    createdAt: 2000,
  };

  const items = toBookViewItems(
    [citation335, citation337],
    [
      { id: 'b-1', bookId: 'book-1', label: '4장', pageSort: 336, createdAtSort: 1500, createdAt: 1500 },
    ],
  );

  expect(sortBookViewItems(items, 'page', 'asc').map((item) => item.id)).toEqual([
    'c-335',
    'b-1',
    'c-337',
  ]);
});

it('derives midpoint fallbacks when only one neighbor exists', () => {
  expect(getMidpoint(336, undefined)).toBe(336.9);
  expect(getMidpoint(undefined, 336)).toBe(335.9);
});
```

- [ ] **Step 5: Run the merge-logic tests**

Run: `npm test -- lib/bookViewItems.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add types.ts lib/bookViewItems.ts lib/bookViewItems.test.ts
git commit -m "feat: add book view chapter block sorting"
```

### Task 3: Load Chapter Blocks Only For Book View

**Files:**
- Modify: `hooks/useArchiveData.ts`
- Modify: `hooks/useArchiveFilter.ts`
- Modify: `App.tsx`
- Modify: `App.test.tsx`

- [ ] **Step 1: Extend archive data hook state with chapter block loading**

In `hooks/useArchiveData.ts`, add state and handlers:

```ts
const [chapterBlocksByBook, setChapterBlocksByBook] = useState<Record<string, ChapterBlock[]>>({});

const handleLoadChapterBlocks = async (bookId: string) => {
  if (!session) return;
  const blocks = await api.fetchChapterBlocks(session.user.id, bookId);
  setChapterBlocksByBook((prev) => ({ ...prev, [bookId]: blocks }));
};

const handleCreateChapterBlock = async (input: CreateChapterBlockInput) => {
  if (!session) return;
  const block = await api.createChapterBlock(session.user.id, input);
  setChapterBlocksByBook((prev) => ({
    ...prev,
    [input.bookId]: [...(prev[input.bookId] || []), block],
  }));
};
```

Expected result: chapter block state is available without mixing it into the global citation array.

- [ ] **Step 2: Teach the filter hook to expose the selected book identity directly**

In `hooks/useArchiveFilter.ts`, add explicit state instead of recomputing from `treeData`:

```ts
const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
const isBookView = filter?.type === 'book' && !selectedProjectId && !searchTerm.trim() && !!selectedBookId;

const handleProjectSelect = (id: string | null) => {
  setSelectedProjectId(id);
  setSelectedBookId(null);
  setFilter(null);
  setSearchTerm('');
  setEditorPrefill(undefined);
};

const handleTreeItemClick = (item: SidebarItem) => {
  if (!item.data) return;
  setSelectedBookId(item.type === 'book' ? item.data.bookId || null : null);
  setEditorPrefill({
    author: item.data.author,
    book: item.data.book || '',
  });
  setFilter({
    type: item.type === 'book' ? 'book' : 'author',
    value: item.type === 'book' ? item.data.book! : item.data.author,
    author: item.data.author,
  });
  setSelectedProjectId(null);
  setSearchTerm('');
};
```

Expected result: downstream code gets a reliable `selectedBookId` for fetch and insert operations without depending on label matching.

- [ ] **Step 3: Wire the new state through `App.tsx`**

Pass the new props into `CitationList`:

```tsx
<CitationList
  citations={filteredCitations}
  chapterBlocks={selectedBookId ? chapterBlocksByBook[selectedBookId] || [] : []}
  isBookView={isBookView}
  sortField={sortField}
  dateDirection={dateDirection}
  pageDirection={pageDirection}
  onCreateChapterBlock={handleCreateChapterBlock}
  projects={projects}
  username={username}
  loading={dataLoading || authLoading}
  searchTerm={searchTerm}
  selectedIds={selectedIds}
  onToggleSelect={handleToggleSelect}
  onAddNote={handleAddNote}
  onUpdateNote={handleUpdateNote}
  onDeleteNote={handleDeleteNote}
  onDeleteCitation={handleDeleteCitation}
  onUpdateCitation={handleUpdateCitation}
/>
```

Add an effect that only loads blocks when `selectedBookId` is present:

```ts
useEffect(() => {
  if (!selectedBookId) return;
  void handleLoadChapterBlocks(selectedBookId);
}, [selectedBookId, handleLoadChapterBlocks]);
```

Expected result: author/project/all views stay chapter-block-free by default.

- [ ] **Step 4: Add an app-level regression test for the view gate**

Extend `App.test.tsx` to assert the new props:

```ts
vi.mock('./components/CitationList', () => ({
  CitationList: (props: any) => (
    <div data-testid="citation-list" data-is-book-view={String(props.isBookView)} />
  ),
}));

it('marks book view so chapter blocks can render only there', () => {
  archiveFilterState.filter = { type: 'book', value: 'Collected Poems', author: 'A' };
  archiveFilterState.selectedBookId = 'book-1';
  render(<App />);
  expect(screen.getByTestId('citation-list')).toHaveAttribute('data-is-book-view', 'true');
});
```

- [ ] **Step 5: Run the app test**

Run: `npm test -- App.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add hooks/useArchiveData.ts hooks/useArchiveFilter.ts App.tsx App.test.tsx
git commit -m "feat: load chapter blocks only in book view"
```

### Task 4: Render Chapter Blocks And Hover-Only Insertion Zones

**Files:**
- Create: `components/ChapterBlockCard.tsx`
- Create: `components/ChapterBlockInsertButton.tsx`
- Modify: `components/CitationList.tsx`
- Create: `components/CitationList.chapter-blocks.test.tsx`

- [ ] **Step 1: Create a dedicated chapter block presentation component**

Create `components/ChapterBlockCard.tsx`:

```tsx
export const ChapterBlockCard = ({ label }: { label: string }) => (
  <div className="relative py-6">
    <div className="h-px bg-[var(--border-main)]" />
    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
      <span className="type-label-bounded rounded-full border border-[var(--accent-border)] bg-[var(--bg-card)] px-4 py-1 text-[var(--accent-strong)] shadow-sm">
        {label}
      </span>
    </div>
  </div>
);
```

Expected result: chapter blocks read as separators instead of quote cards.

- [ ] **Step 2: Create a hover-only inline insertion control**

Create `components/ChapterBlockInsertButton.tsx` with local edit state:

```tsx
export const ChapterBlockInsertButton = ({ onSubmit }: { onSubmit: (label: string) => Promise<void> | void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState('');

  if (isEditing) {
    return (
      <div className="py-2">
        <input
          autoFocus
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="3장"
          className="type-label-bounded w-full rounded-lg border border-[var(--accent-border)] bg-[var(--bg-card)] px-3 py-2"
        />
        <button onClick={() => { if (label.trim()) void onSubmit(label.trim()); }}>
          Save block
        </button>
      </div>
    );
  }

  return (
    <div className="group py-2">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="opacity-0 transition-opacity group-hover:opacity-100"
      >
        + block
      </button>
    </div>
  );
};
```

Expected result: the insertion control is hidden during normal reading and appears only on hover.

- [ ] **Step 3: Teach `CitationList` to render a mixed book-view list**

Replace the straight `citations.map(...)` flow with:

```tsx
const sortDirection = sortField === 'page' ? pageDirection : dateDirection;
const items = isBookView
  ? sortBookViewItems(toBookViewItems(citations, chapterBlocks), sortField, sortDirection)
  : citations.map((citation) => ({ type: 'citation' as const, id: citation.id, citation }));

return (
  <div className="w-full">
    {items.map((item, index) => {
      const prev = items[index - 1];
      const next = items[index + 1];

      return (
        <React.Fragment key={item.id}>
          {isBookView && item.type === 'citation' ? (
            <ChapterBlockInsertButton onSubmit={(label) => onCreateChapterBlock(buildInsertInput(prev, item, label))} />
          ) : null}
          {item.type === 'citation' ? (
            <CitationCard
              key={item.citation.id}
              index={index}
              citation={item.citation}
              username={username}
              projectNames={projects.filter((project) => project.citationIds.includes(item.citation.id)).map((project) => project.name)}
              isSelected={selectedIds.has(item.citation.id)}
              onToggleSelect={onToggleSelect}
              onAddNote={onAddNote}
              onUpdateNote={onUpdateNote}
              onDeleteNote={onDeleteNote}
              onDelete={onDeleteCitation}
              onUpdate={onUpdateCitation}
            />
          ) : (
            <ChapterBlockCard label={item.block.label} />
          )}
          {isBookView && index === items.length - 1 ? (
            <ChapterBlockInsertButton onSubmit={(label) => onCreateChapterBlock(buildInsertInput(item, next, label))} />
          ) : null}
        </React.Fragment>
      );
    })}
  </div>
);
```

Use `getMidpoint` for both `pageSort` and `createdAtSort` when building the insert payload.

Expected result: book view can display citations and chapter blocks in one stream without affecting other views.

- [ ] **Step 4: Add a component test for hover-only affordance and block rendering**

Create `components/CitationList.chapter-blocks.test.tsx`:

```tsx
it('renders chapter blocks only in book view and exposes the insert trigger on hover', async () => {
  const user = userEvent.setup();
  render(
    <CitationList
      citations={[citation335, citation337]}
      projects={[]}
      username="Reader"
      loading={false}
      searchTerm=""
      selectedIds={new Set<string>()}
      chapterBlocks={[block336]}
      isBookView
      sortField="page"
      dateDirection="desc"
      pageDirection="asc"
      onToggleSelect={vi.fn()}
      onAddNote={vi.fn()}
      onUpdateNote={vi.fn()}
      onDeleteNote={vi.fn()}
      onDeleteCitation={vi.fn()}
      onUpdateCitation={vi.fn()}
      onCreateChapterBlock={vi.fn()}
    />
  );

  expect(screen.getByText('4장')).toBeInTheDocument();
  const trigger = screen.getAllByRole('button', { name: /\+ block/i })[0];
  expect(trigger.className).toContain('opacity-0');
  await user.hover(trigger.parentElement!);
});
```

Add a second assertion that the same component does not render `4장` when `isBookView={false}`.

- [ ] **Step 5: Run the component tests**

Run: `npm test -- components/CitationList.chapter-blocks.test.tsx components/CitationTypography.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/ChapterBlockCard.tsx components/ChapterBlockInsertButton.tsx components/CitationList.tsx components/CitationList.chapter-blocks.test.tsx
git commit -m "feat: render chapter blocks in book view"
```

### Task 5: Final Integration Verification

**Files:**
- Verify: `supabase_schema.sql`
- Verify: `lib/api.ts`
- Verify: `hooks/useArchiveData.ts`
- Verify: `hooks/useArchiveFilter.ts`
- Verify: `App.tsx`
- Verify: `components/CitationList.tsx`

- [ ] **Step 1: Run the focused test suite**

Run:

```bash
npm test -- lib/api.test.ts lib/bookViewItems.test.ts App.test.tsx components/CitationList.chapter-blocks.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Manually verify the book-only experience**

Manual check:

```text
1. Open a specific book view with at least two citations.
2. Hover between citations and confirm + block appears.
3. Create a block named "3장".
4. Confirm the block renders between the intended neighbors.
5. Switch page sort and date sort; confirm the block remains logically between those neighbors.
6. Open author view, project view, and all-citations view; confirm the block does not render.
```

Expected result: the feature exists exactly in book view and nowhere else.

- [ ] **Step 5: Final commit**

```bash
git add supabase_schema.sql types.ts lib/api.ts lib/api.test.ts lib/bookViewItems.ts lib/bookViewItems.test.ts hooks/useArchiveData.ts hooks/useArchiveFilter.ts App.tsx App.test.tsx components/ChapterBlockCard.tsx components/ChapterBlockInsertButton.tsx components/CitationList.tsx components/CitationList.chapter-blocks.test.tsx
git commit -m "feat: add book chapter blocks"
```
