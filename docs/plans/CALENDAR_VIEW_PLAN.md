# Calendar View Plan

> Date: 2026-03-30
> Scope: Add a dedicated calendar workspace for recurring bills and subscriptions without introducing unnecessary backend complexity up front

---

## Summary

Add a calendar view to the main sidebar so SubTrkr can be used as a scheduling surface, not just a list and analytics app. The first implementation should stay clean and frontend-owned where possible: derive calendar occurrences from the current item model, render the workspace in multiple time scales, and avoid backend changes unless a concrete limitation appears.

## Problem

- The app can tell users what is due next, but it cannot show the full shape of recurring obligations across a week, month, or year.
- The current shell is list-centric, so there is no dedicated navigation target for planning around billing cadence.
- Without a scoped plan, a calendar feature could sprawl into premature backend work instead of starting from the data already available.

## Goals

- Add a `Calendar` sidebar destination that takes over the main content area.
- Support four viewing modes: weekly, monthly, zoomed-out, and yearly.
- Keep the first pass visually clean and easy to extend.
- Reuse existing item fields and status rules before considering schema or RPC changes.

## Non-Goals

- Reworking shared Supabase schema or write paths just to ship the first calendar view.
- Full drag-and-drop calendar editing in v1.
- External calendar sync or ICS export in the initial implementation.
- Replacing analytics trends with the calendar; both views should coexist.

## Implementation Notes

- App-shell work:
  - Extend the `View` union in [`/Users/tyler/Development/SubTrkr/src/App.tsx`](/Users/tyler/Development/SubTrkr/src/App.tsx) with a `calendar` route.
  - Add a sidebar item and keyboard shortcut slot for the new view.
  - Create a dedicated `CalendarView` component and lazy-load it like analytics/settings if bundle size starts to matter.
- Data/read-model work:
  - Build a small recurrence projection helper from the existing item model in [`/Users/tyler/Development/SubTrkr/src/types/index.ts`](/Users/tyler/Development/SubTrkr/src/types/index.ts) and [`/Users/tyler/Development/SubTrkr/src/utils/dates.ts`](/Users/tyler/Development/SubTrkr/src/utils/dates.ts).
  - Use `start_date`, `next_billing_date`, `billing_cycle`, `status`, `trial_end_date`, `paused_until`, `cancellation_date`, and `archived_at` to decide which occurrences are visible in a given range.
  - Keep the projection logic pure and shared across weekly/monthly/yearly layouts so view modes do not each invent their own recurrence math.
- Backend readiness:
  - The current backend looks sufficient for a read-only first pass because the item table already carries the schedule anchor, next due date, cycle, and lifecycle dates needed to project occurrences.
  - Backend work becomes justified only if the UI needs server-owned occurrence generation, synced calendar preferences, or query performance that cannot be handled from the current `items` payload cleanly.
- Clean-implementation guardrails:
  - Do not mix occurrence math into JSX-heavy view components.
  - Avoid coupling the first calendar release to the broader realtime reload cleanup; consume current item data first, then optimize invalidation if the calendar proves heavy.
  - Keep “zoomed-out” explicitly defined in the component API before building the layout so it does not become an ambiguous catch-all mode.

## Verification

- Manual: open the calendar view and switch across weekly, monthly, zoomed-out, and yearly modes without losing the active dataset.
- Manual: confirm active items appear on expected dates across all billing cycles.
- Manual: confirm paused, cancelled, archived, and trial items are either excluded or rendered intentionally according to the defined rules.
- Manual: verify sidebar navigation, empty states, and narrow-window behavior remain coherent.
- `bunx tsc --noEmit`

## Spawned Follow-Ups

- TASK-009 in `docs/TASKS.md` tracks this feature as an inbox item until it is ready for implementation.
- If calendar-specific backend support becomes necessary, add a shared-backend follow-up through `docs/SUPABASE_BACKEND_WORKFLOW.md` instead of changing Supabase schema from this repo.

## Recommendation

Finish the current hardening work first, then implement the calendar view as a frontend-first feature slice: route, recurrence helper, weekly view, then broader time-scale modes. That keeps the first release clean and avoids backend churn unless the UI proves it is actually needed.
