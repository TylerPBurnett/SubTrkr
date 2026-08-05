# Bulk multi-select for subscriptions and bills

**Date:** 2026-08-04
**Status:** Design — awaiting review

## Problem

Multi-select exists only in list view and can only delete. The delete affordance is a red 2px-bordered button injected into the toolbar's `ml-auto flex flex-wrap` row when a selection exists ([ItemList.tsx:166-191](../../../src/components/ItemList.tsx)), which:

- **Shifts the toolbar.** Checking one box injects ~200px of content, pushing `Add Subscription` left; at narrow widths `flex-wrap` drops it to a second line.
- **Competes with the primary CTA.** A red destructive button sits adjacent to the green Add gradient at equal visual weight.
- **Doesn't read as macOS.** Native apps either enable/disable stationary toolbar items or float a contextual bar; they don't materialise a bordered danger button.
- **Dead-ends.** Per-item pause/cancel/reactivate exist in the row menu; none are available in bulk.
- **Has no keyboard.** No ⌘A, ⇧-click ranges, ⌫, or Esc.
- **Silently drops selection.** Switching to grid wipes it ([useItemListState.ts:49-55](../../../src/components/item-list/useItemListState.ts)); grid has no selection at all.

There is also a live defect underneath the button. `handleBulkDeleteConfirm` calls:

```js
selectedVisibleItems.forEach((item) => { onDelete(item.id); });
```

`onDelete` is `handleDeleteItem`, which is `async` — `forEach` discards the promise. Deleting 8 items today fires 8 concurrent DELETEs, **8 full `reloadItems()` refetches**, and **8 stacked success toasts** ([App.tsx:225-234](../../../src/App.tsx)). Selection is cleared at [ItemList.tsx:122](../../../src/components/ItemList.tsx) regardless of whether any failed.

## Goals

1. Selection never moves the toolbar.
2. Multi-select works identically in grid and list, and survives switching between them.
3. Bulk actions cover the operations that already exist per-item.
4. One network round of work, one refetch, one toast — reporting what actually happened.
5. Full keyboard support with macOS conventions.

## Non-goals

- Undo/restore for bulk delete. Deletes are hard deletes; `archive` is the existing soft path. Out of scope.
- Bulk `convert`, `start_trial`, `edit_cancellation` — each needs per-item judgment that one shared date would falsify.
- Any change to the per-item row menu's behaviour.

## Selection model

Selection state stays in `useItemListState` as today (`Set<string>`), with three changes:

- **Remove the grid wipe** at lines 49-55. Selection persists across view switches.
- **Keep the prune-to-visible effect** at lines 119-139. When filters change, selection narrows to what's still on screen — correct, since actions operate on what you can see.
- **Add a range anchor.** `lastSelectedId: string | null`, set on every plain toggle, read by ⇧-click to select the inclusive span between anchor and target in current sort order.

## Selection affordance

**List view:** unchanged — the existing `Checkbox` column.

**Grid view:** the same `<Checkbox>` component ([checkbox.tsx](../../../src/components/ui/checkbox.tsx)) in a 16px square, positioned absolutely at the card's top-left on a small blurred backdrop chip (`rgba(--bg-base, .7)`, `blur(10px)`, 7px radius). It overlaps the ServiceLogo's upper-left corner because the top-right is occupied by the `⋯` menu.

- Hidden at rest; fades in on card hover.
- Once **any** item is selected, every card's checkbox becomes persistent so the set is visible at a glance.
- Selected cards get `box-shadow: 0 0 0 2px var(--ring)` (`#22c55e`, defined in both themes) and drop their border to transparent.
- Plain click on the card still opens the editor. ⌘-click toggles selection. ⇧-click extends a range.

## The selection HUD

Replaces the toolbar buttons entirely. The toolbar never changes when a selection exists.

**Layout:** `[N selected] │ [action] [action] [action] [⋯] │ [🗑 Delete] [✕]`

| Property | Value |
|---|---|
| Surface | `--bg-card` at 82% opacity + `backdrop-filter: blur(20px) saturate(180%)` |
| Edge | 1px `--border-strong` + `0 0 0 .5px rgba(255,255,255,.06)` hairline |
| Shadow | `0 16px 40px -8px rgba(0,0,0,.4)` light / `.75` dark |
| Radius / height | 12px / 44px |
| Position | sticky, 24px from viewport bottom, centred on the content column |
| Enter / exit | opacity + 8px rise, 180ms `--ease-out-expo`; suppressed under `prefers-reduced-motion` |
| Clearance | list container gains 76px bottom padding while active |

**Action order is fixed:** Pause · Resume · Cancel · Reactivate · Archive · Change Category. Ineligible actions (zero eligible items) are omitted, but the remaining ones never swap places relative to each other — order is stable, only presence varies.

**Overflow:** first three eligible actions render inline; the rest collapse into `⋯`. Below 560px viewport width, all of them collapse and only `[N selected] │ [⋯] │ [🗑] [✕]` remains. Delete never collapses.

**Count labels:** an action shows a bare label when every selected item is eligible (`Cancel`), and appends a count only when it applies to a subset (`Pause 2`). The number appears exactly when something is being skipped, so it carries information rather than being permanent chrome.

**Dismissal:** the `✕` or Esc clears the selection.

## Eligibility

The status→action map is currently implicit in `ItemListActionsMenu`'s JSX conditionals ([ItemListActionsMenu.tsx:94-203](../../../src/components/item-list/ItemListActionsMenu.tsx)). Extract it into `src/components/item-list/statusActions.ts` as a single exported map, and have **both** the row menu and the HUD consume it. This prevents the two surfaces from drifting.

| Action | Legal source statuses |
|---|---|
| `pause` | `active` |
| `resume` | `paused` |
| `cancel` | `active`, `paused`, `trial` |
| `reactivate` | `cancelled`, `archived` |
| `archive` | `cancelled` |
| Change Category | any |
| Delete | any |

Excluded from bulk: `convert`, `start_trial`, `edit_cancellation`.

A bulk action applies to the **eligible subset** of the selection. Ineligible items are skipped, never mutated, and always reported.

## Bulk status changes

### Dialog

`StatusChangeDialog` gains a bulk mode: it accepts `items: ItemWithCategory[]` instead of a single item. It collects **one** date (`pauseUntil` / `cancelledOn` / `resumedOn`) and applies it to the whole batch, reusing the existing validation at [StatusChangeDialog.tsx:186-235](../../../src/components/StatusChangeDialog.tsx). This keeps status history truthful — the same reason `edit_cancellation` exists as a separate action.

Two bulk-specific requirements:

1. **Header states the scope**: "Pause 2 of 3 selected — 1 is already paused and will be skipped."
2. **Minimum effective date is the maximum of the batch.** `getMinimumEffectiveDate` derives per-item from `start_date`; for a batch the valid floor is `max()` across all eligible items, or one item's date would be invalid for another.

### Service

`execute_item_status_change` is a per-item RPC whose params are computed from that item's own `start_date`, `billing_cycle`, and `next_billing_date` via `buildExecuteStatusChangeRpcParams` ([lifecycle.ts:95](../../../src/services/database/lifecycle.ts)). **A single `.in('id', ids)` update is not possible** — each item needs its own computed params, and pushing that computation into SQL would duplicate `lifecycleHelpers.ts` logic with real risk of divergence.

Add to `lifecycle.ts`:

```ts
export async function executeStatusChangeForItems(
  itemIds: string[],
  data: StatusChangeData,
): Promise<BulkResult>
```

A `Promise.allSettled` fan-out over the existing `executeStatusChange`. Each call remains individually atomic server-side. This matches the established pattern already used three times in this same file (`advancePastDueItems`, `resumePausedItems`, `handleExpiredTrials`).

The win is not fewer RPCs — it's **one refetch and one toast** instead of N.

## Bulk delete

`deleteItem` is a plain statement with no per-item computation ([catalog.ts:279](../../../src/services/database/catalog.ts)), so this one is a genuine single-statement batch. Add to `catalog.ts`:

```ts
export async function deleteItems(ids: string[]): Promise<BulkResult>
```

Implemented as `.delete().in('id', ids).eq('user_id', userId).select('id')`, returning the ids actually removed so partial success is detectable.

The confirm dialog remains, with the count in the title as today.

## Result reporting

```ts
interface BulkResult {
  succeeded: string[];
  failed: { id: string; error: string }[];
  skipped: string[];  // selected but ineligible
}
```

New handlers in `App.tsx` — `handleBulkDelete` and `handleBulkStatusChange` — each `await` the batch, call `reloadItems()` **once**, and emit **one** toast:

| Outcome | Toast |
|---|---|
| All succeeded | `Deleted 8 subscriptions` (success) |
| Partial | `Deleted 6 — 2 failed` (error) |
| All failed | `Couldn't delete. Please try again.` (error) |
| Some skipped | appended: `· 1 skipped` |

Selection is cleared **only for ids that actually succeeded**. Failures stay selected so the action can be retried.

## Keyboard

| Key | Behaviour |
|---|---|
| `⌘A` | Select all visible. Suppressed when focus is in the search input or any text field. |
| `⇧` click | Extend range from `lastSelectedId` in current sort order |
| `⌘` click | Toggle one without opening the editor |
| `⌫` / `⌘⌫` | Open bulk delete confirmation |
| `esc` | Clear selection, dismiss HUD |

Handlers bind at the list container, not `window`, and no-op when a dialog is open.

## Files

**New**
- `src/components/item-list/SelectionHUD.tsx`
- `src/components/item-list/statusActions.ts` — shared eligibility map
- `src/components/item-list/useSelectionKeyboard.ts`

**Modified**
- `ItemList.tsx` — remove toolbar selection block; render HUD; wire bulk handlers
- `ItemListGridView.tsx` — checkbox, ring, ⌘/⇧-click
- `ItemListTableView.tsx` — ⇧-click range support
- `useItemListState.ts` — remove grid wipe; add `lastSelectedId`
- `ItemListActionsMenu.tsx` — consume shared eligibility map
- `StatusChangeDialog.tsx` — bulk mode
- `catalog.ts` — `deleteItems`
- `lifecycle.ts` — `executeStatusChangeForItems`
- `App.tsx` — `handleBulkDelete`, `handleBulkStatusChange`

## Testing

- **Unit** — eligibility map: each status yields exactly the expected action set; mixed selections produce correct eligible/skipped partitions.
- **Unit** — range selection: anchor + target under each sort order and direction.
- **Unit** — `BulkResult` partition logic, including all-failed and partial cases.
- **Unit** — batch minimum effective date is the max across items.
- **Integration** — bulk delete of N items produces exactly one refetch and one toast (the current defect, asserted against).
- **Integration** — failures remain selected; successes are cleared.
- **Manual** — HUD at 1440px, 800px, and 500px width; light and dark; `prefers-reduced-motion`.

## Risks

- **HUD over a short list.** With 1-2 rows the HUD may sit close to the toolbar. Mitigation: it is sticky to the viewport bottom, not the list, so it stays put; verify at small window heights.
- **`⌘A` interception.** Must not break select-all inside the search field or any dialog. Covered by the focus guard.
- **Fan-out failure modes.** If 3 of 20 status changes fail, the batch is genuinely partial with no rollback. This is accepted and matches existing behaviour in `resumePausedItems`; the toast and retained selection make it visible and recoverable.
