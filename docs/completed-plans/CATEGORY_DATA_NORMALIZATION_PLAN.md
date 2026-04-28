# Category Data Normalization Plan

> Date: 2026-04-10
> Status: Completed 2026-04-28
> Scope: Remove frontend dependence on stale joined `item.category` snapshots and normalize category presentation around the live categories collection

---

## Summary

SubTrkr previously loaded items with a joined `category:categories(*)` payload and many UI surfaces read `item.category.name` / `item.category.color` directly. That coupling worked when the app broadly reloaded both items and categories together, but it became fragile once realtime invalidation became selective.

The desktop UI now resolves item-facing category display from the live `categories` collection by `category_id`. Category realtime events only need to reload categories; item rows, badges, logos, dashboard upcoming rows, analytics item lists, and category sorting no longer depend on stale joined `item.category` snapshots.

The earlier hardening patch reloaded items on category realtime events to restore correctness. This completed follow-up removes that requirement for migrated item-facing UI by no longer treating embedded category snapshots on items as the primary display source.

## Problem

- Item rows, cards, sorting, and analytics read category presentation data from `item.category`
- Category realtime events can update the standalone `categories` array without updating embedded category snapshots on already-loaded items
- The UI can split into two different truths: fresh category controls and stale item-facing category labels/colors
- Selective invalidation stays fragile as long as item presentation depends on joined category blobs

## Goal

- Make the live `categories` collection the source of truth for category display data
- Let items carry only relational identity (`category_id`) plus optional denormalized fallback data if truly needed
- Reduce the need to reload items when only category metadata changes
- Keep category sorting, badges, logos, and charts consistent across realtime updates

## Non-Goals

- Rewriting the full data access layer in one pass
- Removing joined category data from every query immediately if it still helps incremental migration
- Backend schema changes unless they become clearly necessary

## Implemented Direction

- Added a shared category lookup helper keyed by `category_id`
- Updated item-list sorting and rendering to resolve category display from the live category map
- Updated dashboard, analytics, and status-change dialog item-facing category display paths
- Changed category realtime invalidation to reload categories without also reloading items
- Kept the joined `item.category` payload as transitional compatibility data; it is no longer the display source for migrated item-facing UI

## Changed Touch Points

- `src/app/hooks/useAppDataSync.ts`
- `src/components/item-list/useItemListState.ts`
- `src/components/item-list/ItemListTableView.tsx`
- `src/components/item-list/ItemListGridView.tsx`
- `src/components/Dashboard.tsx`
- `src/components/Analytics.tsx`
- `src/components/StatusChangeDialog.tsx`
- `src/utils/categories.ts`
- `src/utils/categories.test.ts`

## Verification

- `bun test src/utils/categories.test.ts`
- `bun test`
- `bunx tsc --noEmit`
- `bun run build`
- `git diff --check`
- Branch smoke covered dashboard, subscriptions table/grid, bills grid, analytics, settings categories, and logo fallback behavior; unrelated notification-task console noise remains separate from this task.

## Source Material

- Hardening context and current regression tracking live in [docs/plans/PRODUCTION_HARDENING_PLAN.md](../plans/PRODUCTION_HARDENING_PLAN.md)

## Exit Criteria

- [x] Category rename/color changes propagate across migrated item-facing UI from the live `categories` state alone
- [x] Item list sorting no longer depends on stale `item.category` snapshots
- [x] Dashboard and analytics item-facing category visuals remain consistent after category-only realtime updates
- [x] The app no longer needs to reload items just to refresh category presentation metadata
