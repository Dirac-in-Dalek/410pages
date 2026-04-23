<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1oZbsL9-xtqAIRJsutvx64-jP1BWNG2tV

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
4. If Supabase schema drift shows up in the browser, apply `supabase_schema.sql` or the matching migration in `supabase/migrations/`

## Code Structure

This app is now organized feature-first.

- `app/`
  App shell orchestration, responsive mode, and screen prop factories.
- `features/archive/`
  Archive-specific `contract`, `logic`, `policy`, and `ui`.
- `features/citation-entry/`
  Citation editor flow, entry policy, and draft/submit logic.
- `features/reader/`
  Reader session, viewport/selection logic, and reader UI.
- `features/settings/`
  User preference contracts, settings logic, and settings UI.
- `shared/api/`
  Shared data access helpers used across features.
- `shared/lib/`
  Pure reusable logic helpers such as tree and reorder utilities.
- `shared/ui/`
  Reusable UI primitives and small cross-feature components.

Within each feature, prefer:

- `policy/` for rules and allowed behavior
- `contract/` for input/output and shared types
- `logic/` for hooks, orchestration, and state transitions
- `ui/` for rendering components
