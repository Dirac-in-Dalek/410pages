# New Book Reading Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PDF-free “새 책 읽기” flow that creates a real book immediately, opens that book view, defaults first app entry to the most recently cited book, and removes author/book inputs from the Book View citation composer.

**Architecture:** Books become first-class archive data alongside citations and projects. The archive tree is built from both persisted books and citations, so empty books can appear before their first citation. View state owns selected book context and injects that context into citation creation from Book View.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Supabase client, Tailwind utility classes.

---

### Task 1: Persisted Book API

**Files:**
- Modify: `types.ts`
- Modify: `lib/api.ts`
- Modify: `shared/api/bookApi.ts`
- Modify: `features/archive/contract/archiveMutationContract.ts`
- Modify: `features/archive/logic/useArchiveQuery.ts`
- Modify: `features/archive/logic/useArchiveMutations.ts`

- [ ] **Step 1: Write failing tests**
  - Add `api.fetchBooks` and `api.createBook` tests in `lib/api.test.ts`.
  - Expected failures: functions do not exist.

- [ ] **Step 2: Implement minimal API**
  - Add `BookSource` and `CreateBookInput` types.
  - Add `api.fetchBooks(userId)` selecting books with authors.
  - Add `api.createBook(userId, input)` by reusing the existing source resolution path.
  - Export wrappers in `shared/api/bookApi.ts`.

- [ ] **Step 3: Wire archive data state**
  - Add `books`, `setBooks`, and `handleCreateBook`.
  - Fetch `books` with citations/projects.
  - Append created books locally.

### Task 2: Tree and Initial Book Selection

**Files:**
- Modify: `features/archive/logic/archiveTree.ts`
- Modify: `features/archive/logic/archiveTree.test.ts`
- Modify: `features/archive/contract/archiveViewContract.ts`
- Modify: `features/archive/logic/useArchiveViewState.ts`
- Modify: `hooks/useArchiveFilter.ts`
- Modify: `app/AppShell.tsx`

- [ ] **Step 1: Write failing tests**
  - Empty persisted books appear in tree.
  - Latest cited book is selected on first archive load.

- [ ] **Step 2: Implement tree changes**
  - Build author/book nodes from `BookSource[]`.
  - Merge citation-derived metadata without duplicating books.

- [ ] **Step 3: Implement initial selection**
  - Compute latest cited book by citation `createdAt`.
  - Select it once on initial data availability.
  - Keep user navigation from being overwritten.

### Task 3: New Book UI

**Files:**
- Modify: `app/contract/appShellScreenContract.ts`
- Modify: `app/logic/createLayoutProps.ts`
- Modify: `components/MainLayout.tsx`
- Modify: `features/archive/contract/librarySidebarContract.ts`
- Modify: `features/archive/ui/LibrarySidebar.tsx`
- Modify: `features/archive/ui/LibrarySidebarTree.tsx`
- Modify: `app/AppShell.tsx`

- [ ] **Step 1: Add UI tests where practical**
  - Verify new props pass through layout factories.
  - Verify sidebar exposes `새 책 읽기`.

- [ ] **Step 2: Implement modal**
  - Add a Library top button.
  - Modal fields: author, book title.
  - On submit, call `handleCreateBook`, then select the returned book.

### Task 4: Book View Citation Composer

**Files:**
- Modify: `features/citation-entry/contract/citationEntryContract.ts`
- Modify: `features/citation-entry/ui/CitationEditor.tsx`
- Modify: `features/citation-entry/logic/useCitationEntryController.ts`
- Modify: `features/archive/ui/ArchiveHeader.tsx`
- Modify: `features/archive/logic/useArchiveViewState.ts`
- Modify: `components/CitationTypography.test.tsx`

- [ ] **Step 1: Write failing composer test**
  - In Book View mode, author/book inputs are absent.
  - Submitted citation still includes selected author/book.

- [ ] **Step 2: Implement compact mode**
  - Add `hideSourceFields`.
  - Hide author/book controls while preserving controlled values.
  - Keep page field and sequential entry behavior.

### Task 5: Verification Loop

**Files:**
- Review all changed files.

- [ ] **Step 1: Run focused tests**
  - `npm test -- --run lib/api.test.ts features/archive/logic/archiveTree.test.ts components/CitationTypography.test.tsx App.test.tsx`

- [ ] **Step 2: Run full tests and build**
  - `npm test -- --run`
  - `npm run build`

- [ ] **Step 3: Browser verification**
  - Start Vite.
  - Check the archive UI at desktop width.
  - Confirm no layout overlap in the Library and composer area.

- [ ] **Step 4: Review diff**
  - Run code review pass.
  - Fix concrete issues.
  - Repeat tests/build until no new issues are found.
