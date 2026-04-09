# Production Hardening Plan

> Date: 2026-03-27
> Scope: Pre-production hardening for security, correctness, performance, and maintainability in the desktop app

---

## Summary

This plan turns the current repo sweep into an ordered pre-production execution path. The goal is to close the highest-risk safety and correctness gaps first, then reduce the broad reload and analytics costs that will keep growing with the app, and finally split the biggest concentration points so future features do not keep increasing fragility.

## Status Update

- Phase 0 repo-owned fixes are complete on the current desktop branch.
- Phase 1 trimmed scope is complete on the current desktop branch.
- Phase 2 is complete across the current desktop branch and shared backend contract.
- Phase 3 is complete on the current desktop branch.
- Shared lifecycle writes now flow through the backend-owned `execute_item_status_change` RPC instead of a two-step client write path.
- Archive is enforced as `cancelled -> archived` across the shared backend contract and both clients.
- `edit_cancellation` now rewrites the authoritative cancellation event instead of appending a second cancelled transition.
- Desktop audit did not find a remaining lifecycle corruption path, and the shared backend migration source of truth in the mobile repo confirms that `execute_item_status_change` locks the item row, validates transitions against the current status, and keeps the item update plus history write transactional.
- Trend analytics currently count an item toward a month if it was active at any point during that month. That is acceptable for now, but it remains an approximation rather than invoice-date-exact accounting.
- App realtime invalidation now reloads `items` and `categories` selectively instead of routing all table changes through one global reload path, and the app no longer performs app-shell reloads for `payments` changes.
- Initial data load now renders first and schedules maintenance afterward, instead of coupling maintenance work to every generic data reload.
- Dashboard and Analytics now scope status-history support queries to the tracked item set instead of downloading the full user history on every item refresh.
- Desktop `ItemForm` now recalculates billing changes from the form's `start_date` anchor instead of `today`, including service-driven billing-cycle changes.
- Version metadata is currently aligned across `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` at `1.2.2`.
- `docs/RELEASE_CAPTAIN_CHECKLIST.md` now includes a focused Phase 0 hardening regression pass for billing anchors, lifecycle flows, analytics, notifications, and updater checks.
- Tauri CSP is now enabled in `src-tauri/tauri.conf.json` and mirrored in Vite dev/preview headers for closer dev/prod parity.
- Routine notification channel reads no longer return `secret_value` to the renderer; the notification settings UI now derives connection state from the safe read model.
- Phase 4 maintainability splits are complete: `database.ts`, `App.tsx`, `ItemForm`, `ItemList`, and `NotificationSettings` are each decomposed into focused modules with isolated responsibilities. Automated coverage now guards lifecycle transitions, deterministic billing-date calculation, and analytics derivation across dedicated test files, all passing.

## Problem

- Notification secrets and auth/session data currently live too close to the renderer boundary.
- Lifecycle/status writes are not atomic with status-history writes.
- The app shell invalidates and reloads too broadly on realtime events.
- Analytics support data is fetched too aggressively.
- Billing-date edits can shift item cadence away from its original anchor.
- The biggest files are concentrated enough that future changes will keep getting harder to review and verify.

## Goals

- Remove or reduce renderer exposure for sensitive auth and notification data.
- Make status and history writes consistent and auditable.
- Cut unnecessary full-app and analytics reload work.
- Fix billing-date correctness before more user data accumulates.
- Create smaller ownership boundaries in the largest frontend and service files.
- Align release metadata and verification steps before the next production build.

## Non-Goals

- Shipping new end-user features.
- Running Supabase migrations or schema pushes from this repo.
- Full redesign of the existing desktop UI.
- Rewriting every large file in one pass.

## Implementation Notes

### Phase 0 - Immediate Repo-Owned Fixes

- Fix `ItemForm` billing-cycle recalculation so it uses the item's billing anchor (`start_date` or preserved recurrence anchor), not `today`.
- Align versions in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
- Add a focused regression checklist for edit item, status transitions, notifications, analytics, and updater metadata.

### Phase 1 - Security Boundary Hardening

- Re-enable a Tauri CSP that matches the current desktop capabilities.
- Reduce renderer trust by stopping routine notification channel reads from returning `notification_channels.secret_value` to the client.
- Introduce a safe notification-channel read shape or derived connection state for the renderer so setup state can be shown without exposing raw webhook URLs or bot tokens in normal UI reads.
- Defer moving notification setup flows behind an Edge Function or proxy layer unless the app's threat model changes or a shared hosted-notification architecture is introduced.
- Defer moving Telegram verification and chat detection off the renderer; for the current desktop architecture, direct user-owned token setup is acceptable once CSP and routine secret reads are tightened.

### Phase 2 - Data Integrity and Lifecycle Correctness

- Completed: replace the two-step `items` update plus `item_status_history` insert with the backend-owned `execute_item_status_change` RPC.
- Completed: route expired-trial cancellation through the same shared lifecycle write path.
- Completed: restrict archive transitions to `cancelled -> archived` across desktop and iOS so archive stays a decluttering step, not a substitute for cancellation.
- Completed on the desktop side: audit repeated maintenance runs and client-side timing edges; no remaining desktop write-path corruption issue was found.
- Completed: confirm the shared backend contract in the mobile repo's tracked migration history. The latest `execute_item_status_change` function serializes on `FOR UPDATE`, rejects invalid duplicate/racing transitions cleanly, and performs the item update plus history write in one transactional function body.
- Accepted analytics assumption: projected monthly trend treats an item as contributing to a month if it was active during any portion of that month.

### Phase 3 - Performance Hardening

- Completed: split `App.tsx` realtime loading into table-specific invalidation instead of routing all changes through one global `loadData()`.
- Completed: stop reloading app-shell items and categories when only `payments` changes.
- Completed: move maintenance jobs off the hot load path so initial render is data fetch first, maintenance second.
- Completed: scope dashboard and analytics status-history queries to the tracked item set instead of downloading the full user history on every item refresh.

### Phase 4 - Maintainability Follow-Through

- Completed: extract `App` orchestration into focused hooks/modules (`useAppSession`, `useAppDataSync`, `useSidebarLayout`, `useGlobalShortcuts`, `useAppTheme`, `useAppUpdateNotifications`) plus `AppContent` and `AppSidebar` components. `App.tsx` reduced from ~1200 to ~415 lines.
- Completed: split `database.ts` into a thin barrel re-exporting from domain modules (`catalog.ts`, `lifecycle.ts`, `payments.ts`, `analytics.ts`, `shared.ts`). Pure math extracted to `billingMath.ts` and `lifecycleHelpers.ts` for testability without Supabase.
- Completed: split `NotificationSettings` into 8 focused modules (`ChannelLogo`, `NotificationChannelCard`, `NotificationLogPanel`, `NotificationPreferencesPanel`, `TelegramSetupFlow`, `WebhookSetupForm`, `useNotificationSettings`, `constants`).
- Completed: split `ItemForm` into 6 focused modules (`ItemFormPreviewCard`, `ItemFormPrimaryFields`, `ItemFormSecondaryFields`, `useItemFormState`, `types`, `constants`).
- Completed: split `ItemList` into 6 focused modules (`ItemListActionsMenu`, `ItemListGridView`, `ItemListStatusPill`, `ItemListTableView`, `useItemListState`, `constants`).
- Completed: add lightweight automated coverage — `analytics.test.ts` (4 tests: spending calc, category grouping, savings, upcoming items) and `lifecycle.test.ts` (5 tests: status transitions, RPC param building, billing-date anchoring, zero-dollar trial rejection, billing-date advancement).
- All 28 public database exports preserved through the barrel. No consumer import changes required. No circular dependencies. `bunx tsc --noEmit`, `bun test`, and `bun run build` all pass clean.

### Phase 4.5 - Test Coverage Follow-Through

- Completed: extract `getAnchoredNextBillingDate` from the inline closure in `useItemFormState` into a pure testable function in `item-form/billingHelpers.ts`. `getNextFutureBillingDate` now accepts an optional `referenceDate` for deterministic testing without changing production behavior, and `billingHelpers.test.ts` adds 9 exact-output tests covering the Phase 0 regression (anchor preservation across cycle changes, null/undefined fallback, future-date guarantee, weekly weekday anchoring, and cycle-specific monthly/quarterly/yearly stepping).
- Deferred: integration coverage for orchestration hooks (`useAppDataSync`, `useNotificationSettings`). These hooks are deeply coupled to React state and Supabase API calls. Meaningful tests require React Testing Library + a DOM environment, which is not currently in the project. The debounce/batching and startup sequencing logic is only verifiable through manual testing or by adding `@testing-library/react` as a dev dependency.
- Manual desktop smoke pass for auth deep links, realtime refresh, and notification setup — the main areas a code-only review cannot fully certify.

## Verification

- `bunx tsc --noEmit`
- Manual: create/edit item across all billing cycles and confirm `next_billing_date` stays on the expected anchor
- Manual: pause/resume/cancel/reactivate/archive/trial flows and confirm history rows and analytics remain consistent
- Manual: trigger duplicate maintenance scenarios where possible (app relaunch, repeated daily jobs, multi-device timing) and confirm the shared lifecycle RPC no-ops or cleanly rejects without inconsistent item/history state
- Manual: connect/disconnect/test notification channels without exposing secrets back into UI payloads
- Manual: validate CSP-sensitive flows including auth, realtime sync, Telegram setup, logo loading, and existing external `logo_url` images
- Manual: verify realtime updates no longer trigger unrelated reloads
- Manual: confirm version metadata matches in packaged desktop build and updater flow
- Automated regression coverage now exists for lifecycle transitions, billing-date recalculation, and analytics derivation; remaining confidence gaps are orchestration-hook integration coverage and the manual desktop smoke pass

## Spawned Follow-Ups

- Update `docs/TASKS.md` with repo-owned hardening tasks and backend-owned blocked work.
- If notification secret handling requires shared backend coordination, create a dedicated backend ticket/plan through `docs/SUPABASE_BACKEND_WORKFLOW.md`.

## Recommendation

1. Land the billing-anchor fix and version alignment first.
2. Then harden secrets/CSP and move notification secret handling behind a safer boundary.
3. Then centralize status/history writes in a transactional backend path.
4. After that, reduce global reloads and analytics over-fetching.
5. Use the resulting boundaries to split the largest files before the next feature batch.
6. Close the remaining Phase 4.5 gaps (orchestration hook integration tests and the manual desktop smoke pass) before shipping the next production build.
