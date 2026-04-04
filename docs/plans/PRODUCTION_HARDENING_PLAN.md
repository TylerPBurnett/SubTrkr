# Production Hardening Plan

> Date: 2026-03-27
> Scope: Pre-production hardening for security, correctness, performance, and maintainability in the desktop app

---

## Summary

This plan turns the current repo sweep into an ordered pre-production execution path. The goal is to close the highest-risk safety and correctness gaps first, then reduce the broad reload and analytics costs that will keep growing with the app, and finally split the biggest concentration points so future features do not keep increasing fragility.

## Status Update

- Shared lifecycle writes now flow through the backend-owned `execute_item_status_change` RPC instead of a two-step client write path.
- Archive is enforced as `cancelled -> archived` across the shared backend contract and both clients.
- `edit_cancellation` now rewrites the authoritative cancellation event instead of appending a second cancelled transition.

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
- Reduce renderer trust by stopping `notification_channels.secret_value` from being returned to the client.
- Move notification secret creation, update, and lookup flows behind an Edge Function or backend-owned write path that returns only connection state or redacted metadata.
- Move Telegram verification and chat detection off the renderer if practical; at minimum, stop embedding the raw bot token in client-visible request URLs.

### Phase 2 - Data Integrity and Lifecycle Correctness

- Replace the two-step `items` update plus `item_status_history` insert with a transactional RPC or Postgres function.
- Route expired-trial cancellation through the same shared lifecycle write path.
- Restrict archive transitions to `cancelled -> archived` across desktop and iOS so archive stays a decluttering step, not a substitute for cancellation.
- Keep idempotent guards on status transitions so multi-device launch or repeated maintenance does not create partial failures.
- Re-review analytics assumptions that reconstruct history from status rows once the write path is centralized.

### Phase 3 - Performance Hardening

- Split `App.tsx` loading into table-specific invalidation instead of one global `loadData()`.
- Do not reload items or categories when only `payments` changes; analytics should own payment refresh.
- Move maintenance jobs off the hot load path so initial render is data fetch first, maintenance second.
- Scope analytics queries to the current data needs instead of fetching all payments and all status history on every `items` change.

### Phase 4 - Maintainability Follow-Through

- Extract `App` orchestration into focused hooks/modules: auth/bootstrap, realtime sync, maintenance jobs, layout state, and shortcuts.
- Split `database.ts` into smaller domains: lifecycle/status, items/categories, and payments/analytics helpers.
- Split `NotificationSettings`, `ItemForm`, and `ItemList` into smaller components/hooks with isolated responsibilities.
- Add lightweight automated coverage for status transitions, billing-date calculation, and analytics derivation.

## Verification

- `bunx tsc --noEmit`
- Manual: create/edit item across all billing cycles and confirm `next_billing_date` stays on the expected anchor
- Manual: pause/resume/cancel/reactivate/archive/trial flows and confirm history rows and analytics remain consistent
- Manual: connect/disconnect/test notification channels without exposing secrets back into UI payloads
- Manual: verify realtime updates no longer trigger unrelated reloads
- Manual: confirm version metadata matches in packaged desktop build and updater flow
- Add at least one automated regression path for status transitions and date recalculation before production

## Spawned Follow-Ups

- Update `docs/TASKS.md` with repo-owned hardening tasks and backend-owned blocked work.
- If notification secret handling requires shared backend coordination, create a dedicated backend ticket/plan through `docs/SUPABASE_BACKEND_WORKFLOW.md`.

## Recommendation

1. Land the billing-anchor fix and version alignment first.
2. Then harden secrets/CSP and move notification secret handling behind a safer boundary.
3. Then centralize status/history writes in a transactional backend path.
4. After that, reduce global reloads and analytics over-fetching.
5. Use the resulting boundaries to split the largest files before the next feature batch.
