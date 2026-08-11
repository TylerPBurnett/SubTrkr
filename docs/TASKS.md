# SubTrkr Desktop Task Index

> Last updated: 2026-08-11
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
| TASK-017 | P1 | Desktop / Notifications | Unify desktop reminder delivery with server outbox | [docs/plans/DESKTOP_NOTIFICATION_OUTBOX_PLAN.md](plans/DESKTOP_NOTIFICATION_OUTBOX_PLAN.md) | Follow-up architecture change after hardening: server schedules reminders, desktop client drains pending native deliveries |
| TASK-019 | P1 | Desktop / Security | Import and localize custom subscription logos | [docs/plans/CUSTOM_LOGO_IMPORT_PLAN.md](plans/CUSTOM_LOGO_IMPORT_PLAN.md) | Follow-up after hardening: keep CSP tight by importing custom logos into app-controlled storage instead of rendering arbitrary remote `logo_url` values directly |
| TASK-010 | P3 | Desktop / UX | Modular dashboard & analytics | [docs/ROADMAP.md](ROADMAP.md) | Drag-to-reorder layout + per-user widget visibility toggles for dashboard and analytics; local-first persistence before Supabase sync |
| TASK-011 | P3 | Desktop / Updater | Update retry with backoff | [CHANGELOG.md](../CHANGELOG.md) | If automatic update check fails (network error), quietly retry after 30 min instead of requiring manual retry |
| TASK-012 | P3 | Desktop / Updater | Remind-me-later / snooze for updates | [CHANGELOG.md](../CHANGELOG.md) | Dismiss/snooze option on the update toast and expanded panel so users can defer without permanently ignoring |
| TASK-013 | P3 | Desktop / Updater | Show download size before install | [CHANGELOG.md](../CHANGELOG.md) | Display content length on the CTA button (e.g. "Download & install v1.2.2 (14 MB)") so users on slow connections can decide |
| TASK-014 | P3 | Desktop / Updater | Update panel visual polish pass | [CHANGELOG.md](../CHANGELOG.md) | Revisit expanded panel styling — user noted it may need further design refinement beyond the functional redesign |
| TASK-016 | P2 | Desktop / Analytics | Billing-date-accurate monthly trend model | [docs/completed-plans/PRODUCTION_HARDENING_PLAN.md](completed-plans/PRODUCTION_HARDENING_PLAN.md) | Follow-up after the hardening sweep to replace the current “active at any point in month” approximation with billing-occurrence-aware monthly trend logic |
| TASK-022 | P2 | Desktop / Accessibility | `--text-muted` fails contrast in both themes | [docs/superpowers/2026-08-09-calendar-view-followups.md](superpowers/2026-08-09-calendar-view-followups.md) | Measured live: 2.18:1 light (#a3a3a3), 2.36:1 dark (#525252) at 11px, where AA needs 4.5:1 — neither theme clears even the 3:1 large-text floor. The token inverts across themes so it lands mid-grey against the wrong background both ways. ~145 usages; also feeds `--segmented-inactive-text` and `--settings-tab-inactive-text`. Token-level fix plus a regression sweep, not per-component. Related: overdue calendar day totals are 3.76:1 in light (`--accent-red` on white at 11px) |
| TASK-023 | P3 | Desktop / Calendar | Calendar view deferred follow-ups | [docs/superpowers/2026-08-09-calendar-view-followups.md](superpowers/2026-08-09-calendar-view-followups.md) | The triaged list left open after the calendar shipped: year-lens padding cells look empty but navigate to their real month, lens colour semantics disagree (week cards use brand green where month cells use the category colour for the same charge), `railFits` keys off `window.innerWidth` rather than main-panel width, duplicated selection `boxShadow`, unreachable `default` branches suppressing exhaustiveness checks, and the ⌘1–⌘6 renumbering having no automated test |
| TASK-024 | P3 | Desktop / UI | Popover overflows the viewport at short window heights | [src/components/ui/popover.tsx](../src/components/ui/popover.tsx) | At 800px viewport height the item form's trial-end DatePicker calendar extends 124px past the bottom and its lower rows become unreachable; collision avoidance neither flips it to `side="top"` nor shifts it. Fits at 1000px. Found while fixing the `pointer-events` bug in the same component — separate cause, separate fix |

## Active

| ID | Pri | Area | Task | Source | Note |
|---|---|---|---|---|---|
| TASK-020 | P0 | Desktop / Release | Prepare and ship v1.3.0 | [docs/plans/2026-06-19-v1.3.0-release-preparation.md](plans/2026-06-19-v1.3.0-release-preparation.md) | Release preparation is merged and pushed; publication is waiting at the explicit tag-confirmation gate. **Scope grew 2026-08-11:** the calendar workspace (TASK-009), the shared filter rework, and three item-form bug fixes merged into `main` after the release plan was written, so v1.3.0 now carries them. The item-form fixes are the ones worth calling out in release notes — every DatePicker in that form was inert, so no date could be set on any field in the shipped app |

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
| TASK-008 | P1 | Desktop / Hardening | Production hardening sweep | [docs/completed-plans/PRODUCTION_HARDENING_PLAN.md](completed-plans/PRODUCTION_HARDENING_PLAN.md) | Completed 2026-04-20; checks, smoke pass, notification testing, and branch closeout are done. Remaining work moved to TASK-016/TASK-017/TASK-018/TASK-019 |
| TASK-018 | P2 | Desktop / Data Flow | Normalize category display data away from joined item snapshots | [docs/completed-plans/CATEGORY_DATA_NORMALIZATION_PLAN.md](completed-plans/CATEGORY_DATA_NORMALIZATION_PLAN.md) | Completed 2026-04-28; item-facing category display now resolves from live category state, and category realtime events no longer need to reload items |
| TASK-021 | P2 | Desktop / UI | Frosty UI cleanup | [docs/completed-plans/2026-05-06-finish-ui-slop-cleanup.md](completed-plans/2026-05-06-finish-ui-slop-cleanup.md) | Completed 2026-06-19; system typography, neutral surfaces, reduced glow/gradient chrome, and accessible lifecycle buttons are ready for v1.3.0 |
| TASK-009 | P2 | Desktop / Calendar | Calendar workspace view | [docs/superpowers/plans/2026-08-09-calendar-view.md](superpowers/plans/2026-08-09-calendar-view.md) | Completed 2026-08-09; dedicated sidebar calendar view with week, month, and year lenses, a collapsible day inspector rail, a cash-flow strip, filters, and full keyboard navigation, built frontend-first on the existing item schedule fields with no backend changes |
