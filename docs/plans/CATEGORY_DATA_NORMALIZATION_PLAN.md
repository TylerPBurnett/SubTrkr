# Category Data Normalization Plan

> Date: 2026-04-10
> Status: Proposed follow-up after `TASK-008` hardening fixes
> Scope: Remove frontend dependence on stale joined `item.category` snapshots and normalize category presentation around the live categories collection

---

## Summary

SubTrkr currently loads items with a joined `category:categories(*)` payload and many UI surfaces read `item.category.name` / `item.category.color` directly. That coupling worked when the app broadly reloaded both items and categories together, but it breaks once realtime invalidation becomes selective.

The short-term hardening patch should reload items on category realtime events to restore correctness. The longer-term architecture should stop treating embedded category snapshots on items as the primary display source.

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

## Proposed Direction

- Introduce a shared category lookup map keyed by `category_id`
- Update item-list, dashboard, and analytics surfaces to resolve display name/color from the live category map first
- Treat `item.category` as transitional compatibility data rather than authoritative UI state
- Once consumers stop relying on embedded snapshots, consider simplifying `getItems()` to avoid unnecessary joined category payloads

## Likely Touch Points

- `src/app/hooks/useAppDataSync.ts`
- `src/components/item-list/useItemListState.ts`
- `src/components/item-list/ItemListTableView.tsx`
- `src/components/item-list/ItemListGridView.tsx`
- `src/components/Dashboard.tsx`
- `src/components/Analytics.tsx`
- `src/components/ui/ServiceLogo.tsx`

## Recommended Execution Order

1. Add a shared helper for resolving category display data from `categories` + `category_id`
2. Migrate item list sorting and rendering to the helper
3. Migrate dashboard and analytics item-facing category rendering
4. Verify realtime category rename/color changes without item reloads
5. Decide whether joined category payloads are still needed in `getItems()`

## Source Material

- Hardening context and current regression tracking live in [docs/plans/PRODUCTION_HARDENING_PLAN.md](PRODUCTION_HARDENING_PLAN.md)

## Exit Criteria

- Category rename/color changes propagate across the running app from the live `categories` state alone
- Item list sorting no longer depends on stale `item.category` snapshots
- Dashboard and analytics category visuals remain consistent after category-only realtime updates
- The app no longer needs to reload items just to refresh category presentation metadata
