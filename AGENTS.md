# Development conventions

- Find the existing component, helper, policy and its tests before adding another
  implementation. A shared implementation change includes migrating its callers
  and removing the superseded logic in the same change.
- Keep policies with their owner. Shared UI typography, colors and shadows live
  in `index.css`; use semantic roles and named variants. Reuse `shared/ui/Button`
  for the common button appearance and interaction states.
- Browser width queries come from `shared/policy/responsive.js`. Tailwind and CSS
  consume that same policy; CSS media queries use `theme(screens.<role>)` or
  Tailwind variants. Reading defaults come from `shared/policy/readingDefaults.js`
  for both preferences and generated CSS.
- Use `shared/lib/browserStorage.ts` for browser storage. Keep keys, validation,
  account scoping and failure feedback in the owning feature. Writes of drafts
  must report failure rather than silently discarding unsaved work.
- Use `shared/logic/citationPage.ts`, `shared/logic/citationEditing.ts`,
  `shared/ui/useAutosizeTextarea.ts` and `shared/ui/useModalFocus.ts` for their
  respective shared behavior. Express real differences with options/variants;
  preserve keyboard, focus, draft and failed-save behavior.
- Run typecheck, lint, relevant tests and build. For changes to shared UI rules,
  also verify affected screens in the browser at representative widths and font
  settings. Lint checks guard the concrete shared paths; code review must still
  check semantic duplication and inappropriate variants.
- Finish authorized changes with a local commit. Push, merge and deploy only
  when the user explicitly authorizes those actions for the current work. An
  instruction to push does not by itself authorize merging.
