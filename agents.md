# AGENTS.md

This file defines design decisions and implementation guard rails for Codex and contributors working on this project.

## Product Scope (MVP)
- Platform: iOS-first React Native app built with Expo.
- Domain: Personal expense tracking with multi-user auth.
- Core outcomes: glanceable monthly health, fast transaction capture, category-level budget tracking.
- Theme: dark mode only for MVP.
- Currency: AUD only for MVP.
- Charts: `react-native-gifted-charts`.

## Required Tech Stack
- App runtime: Expo (managed workflow + EAS builds when needed).
- Navigation: Expo Router tabs.
- Backend: Supabase (Postgres + Supabase Auth + RLS).
- Local persistence: SQLite (`expo-sqlite`) for offline-first behavior.
- Sync model: local-first writes + outbox queue + background/foreground sync attempts.
- Forms/validation: React Hook Form + Zod.
- App state: keep global state minimal; prefer server/local DB as source of truth.

## Architecture Guard Rails
- Use feature-based modules under `src/features/*`.
- Keep screens thin; move business logic to hooks/services.
- Never call Supabase directly from deeply nested UI components.
- All write operations must:
  - Persist locally first.
  - Enqueue a sync mutation.
  - Return success to UI immediately (optimistic UX).
- Read paths should prefer local DB selectors; remote fetch is for sync, not primary rendering.
- Every user-owned table in Supabase must enforce RLS with `auth.uid()`.
- Soft delete over hard delete for syncable entities (`deleted_at` timestamp).

## Data Modeling Rules
- Money must be stored as integer cents (`amount_cents`), never floating point.
- Persist timestamps in ISO UTC; convert to local timezone in UI.
- Enumerations should be explicit:
  - `transaction_type`: `expense | income`
  - `payment_method`: `cash | card | bank`
  - `budget_period`: `monthly | yearly`
- Category deletion behavior: set related `category_id` to `NULL` (uncategorized), never cascade-delete transactions.
- Recurring transactions require a recurrence rule record and generated transaction instances.

## Offline and Sync Rules
- Local DB is the immediate source of truth for all screens.
- Maintain an outbox table with mutation type, payload, retries, and last error.
- Sync triggers:
  - app foreground
  - network reconnected
  - manual pull-to-refresh on key screens
- Conflict strategy for MVP: last-write-wins using `updated_at`.
- Never block data entry when offline.
- Show unobtrusive sync status and retry failures with clear user action.

## Auth and Security Rules
- Use Supabase Auth for sign-in/session management.
- Do not store service-role keys or privileged secrets in client code.
- Keep anon key in app config only.
- Enforce ownership constraints via RLS, not client-side filtering.
- App lock (biometric/passcode) is deferred; do not implement partial insecure lock patterns in MVP.

## UI and UX Rules
- Minimal but sophisticated dark UI with category color accents.
- Keep motion intentional: quick transitions, clear feedback, no decorative animations that delay tasks.
- Primary flows must be one-handed friendly on iPhone.
- Home tab must surface:
  - month spent
  - budget remaining
  - top categories
  - fast add-expense action
- Transactions tab must support:
  - search
  - category/date filters
  - edit/delete/duplicate
- Budgets tab must show:
  - overall monthly/yearly budget
  - per-category progress with clear 80% and 100% states
- Settings must include:
  - category management
  - CSV export
  - currency display (AUD)

## Charting Rules (`react-native-gifted-charts`)
- Use `react-native-gifted-charts` for all MVP charts.
- Preferred chart mapping:
  - Home category split: pie/donut chart.
  - Spending trends: bar/line by day within month.
  - Budget utilization: horizontal progress bars (native views) + optional compact bars.
- Always provide text summary near charts for accessibility and quick interpretation.
- Avoid over-dense labels; prioritize glanceability over detail.

## Performance Rules
- Avoid unnecessary rerenders:
  - memoize heavy list rows and chart transforms
  - use stable callbacks for large lists
- Use paginated or windowed transaction list rendering for large histories.
- Precompute aggregates (month totals, category totals) in local SQL queries, not in render loops.
- Keep bundle dependencies lean; avoid adding libraries for trivial utilities.

## iOS Siri Shortcuts Rules
- MVP supports Siri Shortcuts for quick add transaction.
- Shortcut action should deep link into a prefilled add-transaction flow.
- Shortcut processing must work offline and queue sync afterward.
- Implement with Expo dev build/EAS where required; do not rely on Expo Go-only assumptions.

## Code Quality Rules
- Language: TypeScript everywhere for app code.
- No `any` unless justified with an inline TODO and follow-up issue.
- Validate all external inputs at boundaries (forms, deep links, shortcut payloads, sync payloads).
- Keep files focused; split files that exceed reasonable complexity.
- Write unit tests for core domain logic:
  - budget threshold calculations
  - recurrence scheduling
  - sync merge/conflict behavior
- Add integration tests for critical flows when infra is available:
  - add transaction offline then sync
  - edit/delete transaction sync
  - category delete to uncategorized migration

## Observability and Error Handling
- Centralize error reporting and user-facing error messages.
- Use typed error categories: validation, network, auth, sync-conflict, unknown.
- Never swallow sync errors silently.
- Show actionable retry options for failed sync operations.

## Codex Change Guard Rails
- Do not introduce server components for MVP unless explicitly requested.
- Do not replace Supabase Auth with Clerk unless user approves a scope change.
- Do not introduce light mode in MVP.
- Do not introduce multi-currency in MVP.
- Do not change chart library away from `react-native-gifted-charts`.
- Do not add destructive migrations without an explicit migration plan.
- If a requested change conflicts with this file, ask for confirmation and document the decision.

## Suggested Project Structure
- `src/app/` route files (Expo Router)
- `src/features/home/`
- `src/features/transactions/`
- `src/features/budgets/`
- `src/features/settings/`
- `src/features/categories/`
- `src/features/recurrence/`
- `src/data/local/` SQLite schema, queries, migrations
- `src/data/remote/` Supabase clients, DTOs
- `src/data/sync/` outbox processor, pull/push sync logic
- `src/shared/ui/` reusable UI primitives
- `src/shared/theme/` dark theme tokens
- `src/shared/lib/` pure helpers

## Definition of Done (MVP)
- User can sign in and data is scoped to that user.
- User can add/edit/delete/duplicate transactions quickly.
- User can manage categories and uncategorized fallback works.
- User can set monthly/yearly budgets with 80% and 100% warnings.
- Dashboard shows month spent, income, net, and top categories.
- App works offline for core CRUD and syncs when online.
- Siri Shortcut for quick add works on iOS dev build.
- CSV export works from local data.
- Dark mode UI is consistent and performant.
