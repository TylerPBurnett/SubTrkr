# SubTrkr Desktop Task Index

> Last updated: 2026-04-10
> Purpose: Track actionable work. `docs/ROADMAP.md` sets priorities, `docs/plans/` holds execution context, and this file is the concrete queue.

## Rules

- Every task should point back to one source doc.
- If a task needs more than a short note, create a plan in `docs/plans/` and keep the task row as the pointer to it.
- If plan execution spawns follow-up work, add it here immediately.
- When work is finished, update the source doc and move any finished plan into `docs/completed-plans/` if appropriate.

## Status Definitions

| Status | Meaning |
|---|---|
| Inbox | Captured, but not yet committed for near-term execution |
| Next | Approved for the next few sessions |
| Active | Currently being worked |
| Blocked | Waiting on another task, repo, or product decision |
| Done | Recently completed; keep only long enough to close the loop in docs |

## Next

| ID | Pri | Area | Task | Source | Note |
|---|---|---|---|---|---|
| TASK-002 | P1 | Desktop / Data Model | Trial pricing split | [docs/plans/TRIAL_PRICING_FOLLOW_UP.md](plans/TRIAL_PRICING_FOLLOW_UP.md) | Split free-trial pricing from post-trial pricing in schema usage, UI, and notifications |

## Inbox

| ID | Pri | Area | Task | Source | Note |
|---|---|---|---|---|---|
| TASK-003 | P2 | Notifications | Quiet hours | [docs/notifications/NOTIFICATION_IMPROVEMENTS.md](notifications/NOTIFICATION_IMPROVEMENTS.md) | Quality-of-life follow-up after timezone-aware delivery shipped |
| TASK-004 | P2 | Notifications | Smart annual subscription alerts | [docs/notifications/NOTIFICATION_IMPROVEMENTS.md](notifications/NOTIFICATION_IMPROVEMENTS.md) | Prevent surprise renewals on high-cost annual plans |
| TASK-005 | P2 | Notifications | Daily digest mode | [docs/notifications/NOTIFICATION_IMPROVEMENTS.md](notifications/NOTIFICATION_IMPROVEMENTS.md) | Consolidated delivery option for heavier notification users |
| TASK-009 | P2 | Desktop / Calendar | Calendar workspace view | [docs/plans/CALENDAR_VIEW_PLAN.md](plans/CALENDAR_VIEW_PLAN.md) | Dedicated sidebar calendar view with weekly, monthly, zoomed-out, and yearly scheduling lenses; planned as a frontend-first feature unless backend limits show up |
| TASK-010 | P3 | Desktop / UX | Modular dashboard & analytics | [docs/ROADMAP.md](ROADMAP.md) | Drag-to-reorder layout + per-user widget visibility toggles for dashboard and analytics; local-first persistence before Supabase sync |
| TASK-011 | P3 | Desktop / Updater | Update retry with backoff | [CHANGELOG.md](../CHANGELOG.md) | If automatic update check fails (network error), quietly retry after 30 min instead of requiring manual retry |
| TASK-012 | P3 | Desktop / Updater | Remind-me-later / snooze for updates | [CHANGELOG.md](../CHANGELOG.md) | Dismiss/snooze option on the update toast and expanded panel so users can defer without permanently ignoring |
| TASK-013 | P3 | Desktop / Updater | Show download size before install | [CHANGELOG.md](../CHANGELOG.md) | Display content length on the CTA button (e.g. "Download & install v1.2.2 (14 MB)") so users on slow connections can decide |
| TASK-014 | P3 | Desktop / Updater | Update panel visual polish pass | [CHANGELOG.md](../CHANGELOG.md) | Revisit expanded panel styling — user noted it may need further design refinement beyond the functional redesign |
| TASK-016 | P2 | Desktop / Analytics | Billing-date-accurate monthly trend model | [docs/plans/PRODUCTION_HARDENING_PLAN.md](plans/PRODUCTION_HARDENING_PLAN.md) | Follow-up after the hardening sweep to replace the current “active at any point in month” approximation with billing-occurrence-aware monthly trend logic |

## Active

| ID | Pri | Area | Task | Source | Note |
|---|---|---|---|---|---|
| TASK-008 | P1 | Desktop / Hardening | Production hardening sweep | [docs/plans/PRODUCTION_HARDENING_PLAN.md](plans/PRODUCTION_HARDENING_PLAN.md) | Active follow-up on branch regressions: reminder evaluation, category realtime invalidation, and CSP/logo compatibility |

## Blocked

| ID | Pri | Area | Task | Source | Note |
|---|---|---|---|---|---|
| TASK-001 | P1 | Backend / Desktop | Transactional status-change write path | [docs/completed-plans/2026-03-10-desktop-autopay-alignment-recommendations.md](completed-plans/2026-03-10-desktop-autopay-alignment-recommendations.md) | Shared schema/write-path hardening must be handled from the mobile repo; see `docs/SUPABASE_BACKEND_WORKFLOW.md` |

## Done

| ID | Pri | Area | Task | Source | Note |
|---|---|---|---|---|---|
| TASK-006 | P1 | Docs | Desktop docs workflow reorganization | [docs/README.md](README.md) | Completed 2026-03-25; desktop docs now use the same roadmap/task/active-plan/archive pattern as the mobile repo |
| TASK-007 | P1 | Desktop | Status-history / autopay alignment | [docs/completed-plans/2026-03-10-desktop-autopay-alignment-recommendations.md](completed-plans/2026-03-10-desktop-autopay-alignment-recommendations.md) | Implemented 2026-03-24; desktop now preserves cancelled items, excludes trials from projected spend, and exposes status-history timeline behavior |
| TASK-015 | P1 | Desktop / Updater | Update panel redesign + persistent indicator + auto-update pref + markdown notes | [CHANGELOG.md](../CHANGELOG.md) | Completed 2026-04-06; compact/expanded modes, nav badge, auto-update toggle, markdown release notes, one-click install toast, dev simulation mode |
