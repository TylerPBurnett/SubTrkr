# SubTrkr Desktop Task Index

> Last updated: 2026-03-27
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
| TASK-008 | P1 | Desktop / Hardening | Production hardening sweep | [docs/plans/PRODUCTION_HARDENING_PLAN.md](plans/PRODUCTION_HARDENING_PLAN.md) | Repo-owned pre-production pass for safety, correctness, performance, and maintainability |
| TASK-002 | P1 | Desktop / Data Model | Trial pricing split | [docs/plans/TRIAL_PRICING_FOLLOW_UP.md](plans/TRIAL_PRICING_FOLLOW_UP.md) | Split free-trial pricing from post-trial pricing in schema usage, UI, and notifications |

## Inbox

| ID | Pri | Area | Task | Source | Note |
|---|---|---|---|---|---|
| TASK-003 | P2 | Notifications | Quiet hours | [docs/notifications/NOTIFICATION_IMPROVEMENTS.md](notifications/NOTIFICATION_IMPROVEMENTS.md) | Quality-of-life follow-up after timezone-aware delivery shipped |
| TASK-004 | P2 | Notifications | Smart annual subscription alerts | [docs/notifications/NOTIFICATION_IMPROVEMENTS.md](notifications/NOTIFICATION_IMPROVEMENTS.md) | Prevent surprise renewals on high-cost annual plans |
| TASK-005 | P2 | Notifications | Daily digest mode | [docs/notifications/NOTIFICATION_IMPROVEMENTS.md](notifications/NOTIFICATION_IMPROVEMENTS.md) | Consolidated delivery option for heavier notification users |

## Active

No active tasks right now.

## Blocked

| ID | Pri | Area | Task | Source | Note |
|---|---|---|---|---|---|
| TASK-001 | P1 | Backend / Desktop | Transactional status-change write path | [docs/completed-plans/2026-03-10-desktop-autopay-alignment-recommendations.md](completed-plans/2026-03-10-desktop-autopay-alignment-recommendations.md) | Shared schema/write-path hardening must be handled from the mobile repo; see `docs/SUPABASE_BACKEND_WORKFLOW.md` |

## Done

| ID | Pri | Area | Task | Source | Note |
|---|---|---|---|---|---|
| TASK-006 | P1 | Docs | Desktop docs workflow reorganization | [docs/README.md](README.md) | Completed 2026-03-25; desktop docs now use the same roadmap/task/active-plan/archive pattern as the mobile repo |
| TASK-007 | P1 | Desktop | Status-history / autopay alignment | [docs/completed-plans/2026-03-10-desktop-autopay-alignment-recommendations.md](completed-plans/2026-03-10-desktop-autopay-alignment-recommendations.md) | Implemented 2026-03-24; desktop now preserves cancelled items, excludes trials from projected spend, and exposes status-history timeline behavior |
