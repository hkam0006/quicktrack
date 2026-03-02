# Supabase + Supabase Auth Implementation Checklist

## Phase 0: Prep
- [x] `T0.1` Create Supabase project and save `SUPABASE_URL` + `SUPABASE_ANON_KEY`.
  - Acceptance: values available for local dev and EAS envs.
  - Status: Completed on March 2, 2026 (`.env` includes both keys for local development).
- [x] `T0.2` Define auth scope for MVP: email/password only, no guest mode.
  - Acceptance: decision documented in `agents.md`.
  - Status: Completed on March 2, 2026 in `agents.md` under "Auth and Security Rules".

## Phase 1: Backend Schema + RLS
- [x] `T1.1` Create SQL migration for `profiles`, `categories`, `transactions`, `budgets`, `recurrence_rules` in Supabase.
  - Acceptance: all money columns use `amount_cents` integer; all tables include `created_at`, `updated_at`, `deleted_at`, `user_id`.
  - Status: Completed on March 2, 2026 in `supabase/migrations/20260302131500_mvp_schema_auth_rls.sql`.
- [x] `T1.2` Add constraints/enums for `transaction_type`, `payment_method`, `budget_period`.
  - Acceptance: invalid enum writes fail at DB layer.
  - Status: Completed on March 2, 2026 in `supabase/migrations/20260302131500_mvp_schema_auth_rls.sql`.
- [x] `T1.3` Enable RLS on all user-owned tables.
  - Acceptance: unauthenticated queries fail; authenticated access is scoped to own `user_id`.
  - Status: Completed on March 2, 2026 in `supabase/migrations/20260302131500_mvp_schema_auth_rls.sql`.
- [x] `T1.4` Add CRUD policies with `auth.uid() = user_id`.
  - Acceptance: cross-user reads/writes are denied.
  - Status: Completed on March 2, 2026 in `supabase/migrations/20260302131500_mvp_schema_auth_rls.sql`.
- [x] `T1.5` Add `updated_at` maintenance trigger.
  - Acceptance: updates always modify `updated_at` server-side.
  - Status: Completed on March 2, 2026 in `supabase/migrations/20260302131500_mvp_schema_auth_rls.sql`.
- [x] `T1.6` Add profile bootstrap trigger on signup (`currency = 'AUD'`).
  - Acceptance: new auth user gets a `profiles` row automatically.
  - Status: Completed on March 2, 2026 in `supabase/migrations/20260302131500_mvp_schema_auth_rls.sql`.

## Phase 2: App Config + Supabase Client
- [x] `T2.1` Add Supabase dependencies to `package.json`.
  - Acceptance: install succeeds and app compiles.
  - Status: Implemented on March 2, 2026 in `package.json` (installation pending local network access).
- [x] `T2.2` Add app env wiring (`extra`) in `app.json`.
  - Acceptance: app can read URL/key at runtime.
  - Status: Completed on March 2, 2026 in `app.json` and `app.config.js`.
- [x] `T2.3` Implement typed env validation module.
  - Acceptance: app fails fast with clear error if env is missing.
  - Status: Completed on March 2, 2026 in `src/shared/lib/env.ts`.
- [x] `T2.4` Implement Supabase client module in `src/data/remote`.
  - Acceptance: singleton client exports typed interface and session persistence works in Expo.
  - Status: Completed on March 2, 2026 in `src/data/remote/supabase.client.ts` and `src/data/remote/supabase.types.ts`.

## Phase 3: Auth Feature
- [x] `T3.1` Add `src/features/auth` module (services, hooks, types).
  - Acceptance: supports `signUp`, `signIn`, `signOut`, `getSession`, auth state listener.
  - Status: Completed on March 2, 2026 in `src/features/auth/*`.
- [x] `T3.2` Add auth routes/screens under `app/` for sign-in/sign-up.
  - Acceptance: unauthenticated users can reach auth screens only.
  - Status: Completed on March 2, 2026 in `app/(auth)/_layout.tsx`, `app/(auth)/sign-in.tsx`, and `app/(auth)/sign-up.tsx`.
- [x] `T3.3` Add auth gate in `app/_layout.tsx`.
  - Acceptance: authenticated users see tabs; unauthenticated users are redirected.
  - Status: Completed on March 2, 2026 in `app/_layout.tsx`.
- [x] `T3.4` Add form validation with RHF + Zod.
  - Acceptance: invalid email/password blocked with typed errors.
  - Status: Completed on March 2, 2026 in auth screens using `react-hook-form` + `zod` via `@hookform/resolvers`.

## Phase 4: Local DB User Scope Refactor
- [x] `T4.1` Remove hardcoded `LOCAL_USER_ID` from `src/data/local/database.ts`.
  - Acceptance: every query/write is scoped by active auth user id.
  - Status: Completed on March 2, 2026 in `src/data/local/database.ts` (removed session fallback user and required explicit scoped `userId`).
- [x] `T4.2` Introduce user-aware repository/API surface for local data access.
  - Acceptance: no screen reads/writes data without explicit current user context.
  - Status: Completed on March 2, 2026 in `src/data/local/database.ts` (`createLocalDataRepository(userId)`) and feature hooks (`src/features/home/use-home-data.ts`, `src/features/budgets/use-budgets-data.ts`, `src/features/transactions/use-transactions-data.ts`, `src/features/transactions/use-add-transaction.ts`).
- [x] `T4.3` Rework seed behavior for dev-only and authenticated contexts.
  - Acceptance: no production user gets sample/demo data unexpectedly.
  - Status: Completed on March 2, 2026 in `src/data/local/database.ts` (seed flow limited to baseline default categories for authenticated user scope; no demo/sample transaction or budget auto-seeding).

## Phase 5: Outbox + Sync Engine
- [x] `T5.1` Implement local outbox table + checkpoint table in SQLite migrations.
  - Acceptance: schema stores mutation type, payload, retries, last error, timestamps.
  - Status: Completed on March 2, 2026 in `src/data/local/database.ts` (`outbox` + `sync_checkpoints` schema with retries, error fields, and sync timestamps).
- [x] `T5.2` Update write flows (transactions/categories/budgets/recurrence) to local-first + enqueue mutation.
  - Acceptance: UI returns success immediately when offline.
  - Status: Completed on March 2, 2026 in `src/data/local/database.ts` (`insertTransaction` now local-first + outbox enqueue) and `src/data/sync/sync.service.ts` (generic outbox push support for all sync tables).
- [x] `T5.3` Implement push sync processor from outbox to Supabase.
  - Acceptance: successful mutations are marked complete; failures increment retry + store error.
  - Status: Completed on March 2, 2026 in `src/data/sync/sync.service.ts` and `src/data/local/database.ts` (push worker marks completion/failure and tracks retries/errors).
- [x] `T5.4` Implement pull sync by `updated_at` checkpoint.
  - Acceptance: local DB updates from remote deltas without full refetch.
  - Status: Completed on March 2, 2026 in `src/data/sync/sync.service.ts` and `src/data/local/database.ts` (table-by-table pull using checkpoint `last_pulled_at` and row upserts).
- [x] `T5.5` Implement conflict policy (last-write-wins by `updated_at`).
  - Acceptance: deterministic merge outcomes for conflicting records.
  - Status: Completed on March 2, 2026 in `src/data/local/database.ts` (`ON CONFLICT ... WHERE excluded.updated_at >= local.updated_at` for deterministic LWW merges).
- [x] `T5.6` Wire sync triggers (foreground, reconnect, manual refresh).
  - Acceptance: sync attempts fire on all three trigger points.
  - Status: Completed on March 2, 2026 in `src/data/sync/use-sync-triggers.ts`, `app/_layout.tsx`, and key tab screens (`app/(tabs)/index.tsx`, `app/(tabs)/transactions.tsx`, `app/(tabs)/budgets.tsx`) with app foreground, reconnect polling, and pull-to-refresh trigger wiring.

## Phase 6: UX + Observability
- [ ] `T6.1` Add unobtrusive sync status indicator in key tabs.
  - Acceptance: user sees pending/syncing/error states.
- [ ] `T6.2` Add actionable retry UI for failed sync.
  - Acceptance: user can retry failed queue items manually.
- [ ] `T6.3` Centralize typed error mapping (`validation`, `network`, `auth`, `sync-conflict`, `unknown`).
  - Acceptance: no silent sync/auth failures.

## Phase 7: Validation and Tests
- [ ] `T7.1` Unit tests for merge/conflict and outbox retry logic.
  - Acceptance: passing tests cover success/failure/retry edge cases.
- [ ] `T7.2` Integration test: add transaction offline then sync.
  - Acceptance: local write immediate; remote reflected after reconnect.
- [ ] `T7.3` Integration test: edit/delete transaction then sync.
  - Acceptance: soft delete and updates propagate correctly.
- [ ] `T7.4` Integration test: category deletion sets `category_id = NULL`.
  - Acceptance: transactions remain intact and uncategorized fallback works.
- [ ] `T7.5` Auth isolation test for two users.
  - Acceptance: no cross-user data visibility in local sync result or remote queries.

## Suggested Execution Order
1. `T1.*`
2. `T2.*`
3. `T3.*`
4. `T4.*`
5. `T5.*`
6. `T6.*`
7. `T7.*`
