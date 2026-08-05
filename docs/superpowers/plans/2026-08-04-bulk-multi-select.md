# Bulk Multi-Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the toolbar-injected "Delete selected" button with a floating selection HUD that supports bulk pause/resume/cancel/reactivate/archive/category/delete across both grid and list views, backed by batched service calls that produce one refetch and one toast.

**Architecture:** All decision logic (eligibility, range selection, HUD layout, result summarisation) lives in pure TypeScript modules with colocated `node:test` tests. React components consume those modules and stay thin. Bulk delete is a genuine single-statement batch; bulk status changes are a `Promise.allSettled` fan-out over the existing per-item RPC, because `execute_item_status_change` derives its parameters from each item's own `start_date`, `billing_cycle`, and `next_billing_date`.

**Tech Stack:** React 19, TypeScript, Tailwind, framer-motion, Radix UI, Supabase JS, `node:test` via `bun test`.

**Spec:** `docs/superpowers/specs/2026-08-04-bulk-multi-select-design.md`

## Global Constraints

- Package manager is **bun**. Never `npm`/`yarn`/`pnpm`. Tests run with `bun test`.
- Tests use `node:test` + `node:assert/strict`, colocated as `*.test.ts` beside the module. There is **no** DOM testing library and **no** Supabase mocking — do not write React render tests or tests that call Supabase.
- Colors come from CSS custom properties only (`var(--text-primary)`, `var(--ring)`, …). Never hardcode a hex outside of what already exists in `src/index.css`.
- The selection ring is `var(--ring)` (`#22c55e` in both themes). No new color enters the system.
- Checkbox is always the existing `@/components/ui/checkbox` component — square, `size-4`, `rounded`, `border-2`. Never a circle.
- HUD action order is **fixed**: `pause · resume · cancel · reactivate · archive · category`. Actions may be omitted when ineligible, but never reordered relative to each other.
- Count labels appear on an action **only** when `eligibleCount < selectedCount`.
- Delete is always inline in the HUD and never collapses into the overflow menu.
- Run `bunx tsc --noEmit` before every commit. It must be clean.

---

### Task 1: Shared status-action eligibility map

Currently the status→action mapping is implicit in `ItemListActionsMenu`'s JSX conditionals. Extract it so the row menu and the HUD cannot drift.

**Files:**
- Create: `src/components/item-list/statusActions.ts`
- Test: `src/components/item-list/statusActions.test.ts`

**Interfaces:**
- Consumes: `ItemStatus`, `StatusChangeData` from `@/types`
- Produces: `STATUS_ACTION_SOURCES`, `BULK_ACTIONS`, `BulkStatusAction`, `isActionEligible(status, action)`, `partitionByEligibility(items, action)`

- [ ] **Step 1: Write the failing test**

Create `src/components/item-list/statusActions.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { ItemStatus } from '@/types';
import {
  BULK_ACTIONS,
  isActionEligible,
  partitionByEligibility,
  STATUS_ACTION_SOURCES,
} from './statusActions';

describe('statusActions', () => {
  test('maps every action to its legal source statuses', () => {
    assert.deepEqual(STATUS_ACTION_SOURCES.pause, ['active']);
    assert.deepEqual(STATUS_ACTION_SOURCES.resume, ['paused']);
    assert.deepEqual(STATUS_ACTION_SOURCES.cancel, ['active', 'paused', 'trial']);
    assert.deepEqual(STATUS_ACTION_SOURCES.reactivate, ['cancelled', 'archived']);
    assert.deepEqual(STATUS_ACTION_SOURCES.archive, ['cancelled']);
    assert.deepEqual(STATUS_ACTION_SOURCES.convert, ['trial']);
    assert.deepEqual(STATUS_ACTION_SOURCES.start_trial, ['active']);
    assert.deepEqual(STATUS_ACTION_SOURCES.edit_cancellation, ['cancelled']);
  });

  test('excludes per-item-judgement actions from the bulk set', () => {
    assert.deepEqual(BULK_ACTIONS, [
      'pause',
      'resume',
      'cancel',
      'reactivate',
      'archive',
    ]);
  });

  test('answers eligibility per status', () => {
    assert.equal(isActionEligible('active', 'pause'), true);
    assert.equal(isActionEligible('paused', 'pause'), false);
    assert.equal(isActionEligible('trial', 'cancel'), true);
    assert.equal(isActionEligible('archived', 'reactivate'), true);
    assert.equal(isActionEligible('active', 'archive'), false);
  });

  test('partitions a mixed selection into eligible and skipped', () => {
    const items: { id: string; status: ItemStatus }[] = [
      { id: 'a', status: 'active' },
      { id: 'b', status: 'active' },
      { id: 'c', status: 'paused' },
    ];

    const { eligible, skipped } = partitionByEligibility(items, 'pause');

    assert.deepEqual(eligible.map((item) => item.id), ['a', 'b']);
    assert.deepEqual(skipped.map((item) => item.id), ['c']);
  });

  test('partitions everything as eligible when all statuses qualify', () => {
    const items: { id: string; status: ItemStatus }[] = [
      { id: 'a', status: 'active' },
      { id: 'b', status: 'paused' },
      { id: 'c', status: 'trial' },
    ];

    const { eligible, skipped } = partitionByEligibility(items, 'cancel');

    assert.equal(eligible.length, 3);
    assert.equal(skipped.length, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/components/item-list/statusActions.test.ts`
Expected: FAIL — cannot resolve module `./statusActions`

- [ ] **Step 3: Write the implementation**

Create `src/components/item-list/statusActions.ts`:

```ts
import type { ItemStatus, StatusChangeData } from '@/types';

type StatusAction = StatusChangeData['action'];

/**
 * Single source of truth for which lifecycle actions are legal from which
 * status. Consumed by both ItemListActionsMenu (per-item) and the selection
 * HUD (bulk) so the two surfaces cannot drift.
 */
export const STATUS_ACTION_SOURCES: Record<StatusAction, readonly ItemStatus[]> = {
  pause: ['active'],
  resume: ['paused'],
  cancel: ['active', 'paused', 'trial'],
  reactivate: ['cancelled', 'archived'],
  archive: ['cancelled'],
  convert: ['trial'],
  start_trial: ['active'],
  edit_cancellation: ['cancelled'],
};

/**
 * Actions offered in bulk. convert, start_trial and edit_cancellation are
 * excluded: each needs a per-item date judgement that one shared value would
 * falsify.
 */
export const BULK_ACTIONS = [
  'pause',
  'resume',
  'cancel',
  'reactivate',
  'archive',
] as const;

export type BulkStatusAction = (typeof BULK_ACTIONS)[number];

export function isActionEligible(
  status: ItemStatus,
  action: StatusAction,
): boolean {
  return STATUS_ACTION_SOURCES[action].includes(status);
}

export function partitionByEligibility<T extends { status: ItemStatus }>(
  items: readonly T[],
  action: StatusAction,
): { eligible: T[]; skipped: T[] } {
  const eligible: T[] = [];
  const skipped: T[] = [];

  for (const item of items) {
    if (isActionEligible(item.status, action)) {
      eligible.push(item);
    } else {
      skipped.push(item);
    }
  }

  return { eligible, skipped };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/components/item-list/statusActions.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 5: Typecheck and commit**

```bash
bunx tsc --noEmit
git add src/components/item-list/statusActions.ts src/components/item-list/statusActions.test.ts
git commit -m "feat(item-list): extract shared status-action eligibility map"
```

---

### Task 2: Point the row menu at the shared map

Pure refactor. `ItemListActionsMenu` currently hardcodes `item.status === 'active'` style conditionals. Behaviour must not change.

**Files:**
- Modify: `src/components/item-list/ItemListActionsMenu.tsx:94-203`

**Interfaces:**
- Consumes: `isActionEligible` from Task 1
- Produces: nothing new

- [ ] **Step 1: Add the import**

In `src/components/item-list/ItemListActionsMenu.tsx`, add below the existing `@/types` import:

```tsx
import { isActionEligible } from './statusActions';
```

- [ ] **Step 2: Replace each status conditional**

Replace every `item.status === '<status>' && onStatusChange && (…)` guard with an eligibility check on the action it renders. The trial block at line 94 becomes:

```tsx
{isActionEligible(item.status, 'convert') && onStatusChange && (
  <>
    <DropdownMenuItem
      onClick={() => onStatusChange(item.id, 'convert')}
      className="gap-2.5 menu-item-success"
      style={{ letterSpacing: '-0.005em' }}
    >
      <Check className="w-4 h-4" />
      Convert to Paid
    </DropdownMenuItem>
  </>
)}

{isActionEligible(item.status, 'cancel') && onStatusChange && (
  <DropdownMenuItem
    onClick={() => onStatusChange(item.id, 'cancel')}
    className="gap-2.5 menu-item"
    style={{ color: 'var(--text-secondary)', letterSpacing: '-0.005em' }}
  >
    <XCircle className="w-4 h-4" />
    {item.status === 'trial' ? 'Cancel Trial' : 'Cancel'}
  </DropdownMenuItem>
)}
```

Apply the same treatment to `pause`, `start_trial`, `resume`, `reactivate`, `archive`, and `edit_cancellation`, each guarded by `isActionEligible(item.status, '<action>')`. Note that `cancel` now renders from a single block for all three of its source statuses, with only the label varying.

- [ ] **Step 3: Verify the menu is unchanged for every status**

Run: `bun run dev`, then for each of the five statuses confirm the row menu shows exactly the same items as before this task:

| Status | Expected items (besides Edit / Visit / History / Delete) |
|---|---|
| `active` | Pause, Cancel, Start Trial |
| `trial` | Convert to Paid, Cancel Trial |
| `paused` | Resume, Cancel |
| `cancelled` | Edit Cancel Date, Reactivate, Archive |
| `archived` | Reactivate |

- [ ] **Step 4: Typecheck and commit**

```bash
bunx tsc --noEmit
git add src/components/item-list/ItemListActionsMenu.tsx
git commit -m "refactor(item-list): drive row menu from the shared eligibility map"
```

---

### Task 3: Bulk result type and toast summarisation

**Files:**
- Create: `src/services/database/bulkResults.ts`
- Test: `src/services/database/bulkResults.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `BulkResult`, `emptyBulkResult()`, `summarizeBulkResult(result, copy)`, `BulkCopy`

- [ ] **Step 1: Write the failing test**

Create `src/services/database/bulkResults.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { emptyBulkResult, summarizeBulkResult } from './bulkResults';

const DELETE_COPY = {
  pastTense: 'Deleted',
  failedVerb: 'delete',
  singular: 'subscription',
  plural: 'subscriptions',
};

describe('summarizeBulkResult', () => {
  test('reports a clean success with the plural noun', () => {
    const summary = summarizeBulkResult(
      { succeeded: ['a', 'b', 'c'], failed: [], skipped: [] },
      DELETE_COPY,
    );

    assert.equal(summary.message, 'Deleted 3 subscriptions');
    assert.equal(summary.tone, 'success');
  });

  test('uses the singular noun for one item', () => {
    const summary = summarizeBulkResult(
      { succeeded: ['a'], failed: [], skipped: [] },
      DELETE_COPY,
    );

    assert.equal(summary.message, 'Deleted 1 subscription');
    assert.equal(summary.tone, 'success');
  });

  test('reports partial success as an error', () => {
    const summary = summarizeBulkResult(
      {
        succeeded: ['a', 'b'],
        failed: [{ id: 'c', error: 'boom' }],
        skipped: [],
      },
      DELETE_COPY,
    );

    assert.equal(summary.message, 'Deleted 2 — 1 failed');
    assert.equal(summary.tone, 'error');
  });

  test('reports total failure without a count', () => {
    const summary = summarizeBulkResult(
      {
        succeeded: [],
        failed: [{ id: 'a', error: 'boom' }, { id: 'b', error: 'boom' }],
        skipped: [],
      },
      DELETE_COPY,
    );

    assert.equal(summary.message, "Couldn't delete. Please try again.");
    assert.equal(summary.tone, 'error');
  });

  test('appends skipped items to the message', () => {
    const summary = summarizeBulkResult(
      { succeeded: ['a', 'b'], failed: [], skipped: ['c'] },
      DELETE_COPY,
    );

    assert.equal(summary.message, 'Deleted 2 subscriptions · 1 skipped');
    assert.equal(summary.tone, 'success');
  });

  test('returns a null summary when nothing was attempted', () => {
    assert.equal(summarizeBulkResult(emptyBulkResult(), DELETE_COPY), null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/services/database/bulkResults.test.ts`
Expected: FAIL — cannot resolve module `./bulkResults`

- [ ] **Step 3: Write the implementation**

Create `src/services/database/bulkResults.ts`:

```ts
export interface BulkResult {
  /** ids that were actually mutated */
  succeeded: string[];
  /** ids that were attempted and errored */
  failed: { id: string; error: string }[];
  /** ids that were selected but ineligible, so never attempted */
  skipped: string[];
}

export interface BulkCopy {
  /** "Deleted", "Paused", "Cancelled" */
  pastTense: string;
  /** bare verb used in the total-failure message: "delete", "pause" */
  failedVerb: string;
  singular: string;
  plural: string;
}

export interface BulkSummary {
  message: string;
  tone: 'success' | 'error';
}

export function emptyBulkResult(): BulkResult {
  return { succeeded: [], failed: [], skipped: [] };
}

export function summarizeBulkResult(
  result: BulkResult,
  copy: BulkCopy,
): BulkSummary | null {
  const successCount = result.succeeded.length;
  const failureCount = result.failed.length;
  const skippedCount = result.skipped.length;

  if (successCount === 0 && failureCount === 0 && skippedCount === 0) {
    return null;
  }

  const suffix = skippedCount > 0 ? ` · ${skippedCount} skipped` : '';

  if (successCount === 0 && failureCount > 0) {
    return {
      message: `Couldn't ${copy.failedVerb}. Please try again.${suffix}`,
      tone: 'error',
    };
  }

  if (failureCount > 0) {
    return {
      message: `${copy.pastTense} ${successCount} — ${failureCount} failed${suffix}`,
      tone: 'error',
    };
  }

  const noun = successCount === 1 ? copy.singular : copy.plural;

  return {
    message: `${copy.pastTense} ${successCount} ${noun}${suffix}`,
    tone: 'success',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/services/database/bulkResults.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 5: Typecheck and commit**

```bash
bunx tsc --noEmit
git add src/services/database/bulkResults.ts src/services/database/bulkResults.test.ts
git commit -m "feat(services): add bulk result type and toast summarisation"
```

---

### Task 4: Batch minimum effective date

`getMinimumEffectiveDate(item, action)` derives a floor from each item's own dates. For a batch the valid floor is the **maximum** across all eligible items, or one item's date would be invalid for another.

**Files:**
- Modify: `src/services/database/lifecycleHelpers.ts` (append after `getMinimumEffectiveDate`, which ends at line 163)
- Modify: `src/services/database/lifecycle.test.ts` (append a new `describe` block)

**Interfaces:**
- Consumes: `getMinimumEffectiveDate(item, action): string | null`
- Produces: `getBatchMinimumEffectiveDate(items, action): string | null`

- [ ] **Step 1: Write the failing test**

Append to `src/services/database/lifecycle.test.ts` (the file already defines a `buildItem` helper at line 10 — reuse it):

```ts
describe('getBatchMinimumEffectiveDate', () => {
  test('returns the latest floor across the batch', () => {
    const items = [
      buildItem({ id: 'a', start_date: '2025-01-10' }),
      buildItem({ id: 'b', start_date: '2025-06-01' }),
      buildItem({ id: 'c', start_date: '2024-03-20' }),
    ];

    assert.equal(getBatchMinimumEffectiveDate(items, 'cancel'), '2025-06-01');
  });

  test('ignores items with no floor', () => {
    const items = [
      buildItem({ id: 'a', start_date: '2025-01-10' }),
      buildItem({ id: 'b', start_date: '2025-02-10' }),
    ];

    assert.equal(getBatchMinimumEffectiveDate(items, 'cancel'), '2025-02-10');
  });

  test('returns null for an empty batch', () => {
    assert.equal(getBatchMinimumEffectiveDate([], 'cancel'), null);
  });

  test('accounts for paused_at when resuming', () => {
    const items = [
      buildItem({
        id: 'a',
        status: 'paused',
        start_date: '2025-01-10',
        paused_at: '2026-03-01T12:00:00Z',
      }),
      buildItem({
        id: 'b',
        status: 'paused',
        start_date: '2025-01-10',
        paused_at: '2026-05-04T12:00:00Z',
      }),
    ];

    assert.equal(getBatchMinimumEffectiveDate(items, 'resume'), '2026-05-04');
  });
});
```

Extend the existing import at the top of that file to include the new function:

```ts
import {
  buildExecuteStatusChangeRpcParams,
  calculateNextBillingDate,
  getBatchMinimumEffectiveDate,
  getTargetStatus,
} from './lifecycleHelpers';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/services/database/lifecycle.test.ts`
Expected: FAIL — `getBatchMinimumEffectiveDate is not a function`

- [ ] **Step 3: Write the implementation**

Append to `src/services/database/lifecycleHelpers.ts`:

```ts
/**
 * The floor for a batch is the latest of every member's individual floor —
 * anything earlier would be invalid for at least one item.
 */
export function getBatchMinimumEffectiveDate(
  items: readonly Item[],
  action: StatusChangeData['action'],
): string | null {
  let latest: string | null = null;

  for (const item of items) {
    const minimum = getMinimumEffectiveDate(item, action);
    if (minimum && (!latest || minimum > latest)) {
      latest = minimum;
    }
  }

  return latest;
}
```

Then add it to the re-export block in `src/services/database/lifecycle.ts` (lines 22-33), keeping the list alphabetical:

```ts
export {
  buildExecuteStatusChangeRpcParams,
  calculateNextBillingDate,
  getBatchMinimumEffectiveDate,
  getCanonicalStatusChangeAction,
  getMinimumEffectiveDate,
  // …remaining exports unchanged
} from './lifecycleHelpers';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/services/database/lifecycle.test.ts`
Expected: PASS — existing tests plus 4 new

- [ ] **Step 5: Typecheck and commit**

```bash
bunx tsc --noEmit
git add src/services/database/lifecycleHelpers.ts src/services/database/lifecycle.ts src/services/database/lifecycle.test.ts
git commit -m "feat(services): compute batch minimum effective date"
```

---

### Task 5: Batched delete

`deleteItem` is a plain statement with no per-item computation, so this batches into one round trip.

**Files:**
- Modify: `src/services/database/catalog.ts` (append after `deleteItem`, which ends at line 290)

**Interfaces:**
- Consumes: `BulkResult`, `emptyBulkResult` from Task 3
- Produces: `deleteItems(ids: string[]): Promise<BulkResult>`

- [ ] **Step 1: Add the import**

At the top of `src/services/database/catalog.ts`, alongside the existing imports:

```ts
import { emptyBulkResult, type BulkResult } from './bulkResults';
```

- [ ] **Step 2: Write the implementation**

Append to `src/services/database/catalog.ts`:

```ts
/**
 * Deletes many items in a single statement. `.select('id')` returns the rows
 * actually removed, so a partial result (RLS mismatch, already-deleted row) is
 * detectable rather than silently reported as success.
 */
export async function deleteItems(ids: string[]): Promise<BulkResult> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return emptyBulkResult();
  }

  const userId = await getUserId();
  const { data, error } = await supabase
    .from('items')
    .delete()
    .in('id', uniqueIds)
    .eq('user_id', userId)
    .select('id');

  if (error) {
    return {
      succeeded: [],
      failed: uniqueIds.map((id) => ({ id, error: error.message })),
      skipped: [],
    };
  }

  const deletedIds = new Set((data ?? []).map((row) => row.id as string));

  return {
    succeeded: uniqueIds.filter((id) => deletedIds.has(id)),
    failed: uniqueIds
      .filter((id) => !deletedIds.has(id))
      .map((id) => ({ id, error: 'Item not found' })),
    skipped: [],
  };
}
```

- [ ] **Step 3: Typecheck**

Run: `bunx tsc --noEmit`
Expected: clean

- [ ] **Step 4: Verify against the database manually**

Run `bun run dev`, sign in, and from the browser console confirm a two-id delete removes exactly two rows and returns both ids in `succeeded`. There is no Supabase mocking in this codebase, so this path is verified by hand rather than by unit test.

- [ ] **Step 5: Commit**

```bash
git add src/services/database/catalog.ts
git commit -m "feat(services): add batched deleteItems"
```

---

### Task 6: Fan-out bulk status change

`execute_item_status_change` computes its parameters from each item's own `start_date`, `billing_cycle`, and `next_billing_date`, so a single `.in()` update is impossible. This mirrors the `Promise.allSettled` pattern already used by `advancePastDueItems`, `resumePausedItems`, and `handleExpiredTrials` in the same file.

**Files:**
- Modify: `src/services/database/lifecycle.ts` (append after `executeStatusChange`, which ends at line 96)

**Interfaces:**
- Consumes: `executeStatusChange(itemId, data)`, `BulkResult`, `emptyBulkResult`
- Produces: `executeStatusChangeForItems(itemIds: string[], data: StatusChangeData): Promise<BulkResult>`

- [ ] **Step 1: Add the import**

At the top of `src/services/database/lifecycle.ts`:

```ts
import { emptyBulkResult, type BulkResult } from './bulkResults';
```

- [ ] **Step 2: Write the implementation**

Append after `executeStatusChange`:

```ts
/**
 * Applies one status change across many items. Each call remains individually
 * atomic server-side; the batching win is one refetch and one toast in the UI,
 * not fewer round trips.
 */
export async function executeStatusChangeForItems(
  itemIds: string[],
  data: StatusChangeData,
): Promise<BulkResult> {
  const uniqueIds = Array.from(new Set(itemIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return emptyBulkResult();
  }

  const results = await Promise.allSettled(
    uniqueIds.map((itemId) => executeStatusChange(itemId, data)),
  );

  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];

  results.forEach((result, index) => {
    const itemId = uniqueIds[index];
    if (result.status === 'fulfilled') {
      succeeded.push(itemId);
      return;
    }

    failed.push({
      id: itemId,
      error:
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
    });
  });

  if (failed.length > 0) {
    console.error(`Failed to apply ${data.action} to ${failed.length} item(s):`, failed);
  }

  return { succeeded, failed, skipped: [] };
}
```

- [ ] **Step 3: Typecheck**

Run: `bunx tsc --noEmit`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add src/services/database/lifecycle.ts
git commit -m "feat(services): add bulk status change fan-out"
```

---

### Task 7: Range selection and persistent selection state

**Files:**
- Create: `src/components/item-list/selectionRange.ts`
- Test: `src/components/item-list/selectionRange.test.ts`
- Modify: `src/components/item-list/useItemListState.ts:45-55` (remove grid wipe), `:185-207` (add anchor)

**Interfaces:**
- Consumes: nothing
- Produces: `resolveRangeSelection(orderedIds, anchorId, targetId): string[]`; `useItemListState` gains `handleSelectItemChange(itemId, checked, options?)` with `options.extendRange`

- [ ] **Step 1: Write the failing test**

Create `src/components/item-list/selectionRange.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { resolveRangeSelection } from './selectionRange';

const ORDER = ['a', 'b', 'c', 'd', 'e'];

describe('resolveRangeSelection', () => {
  test('returns the inclusive span between anchor and target', () => {
    assert.deepEqual(resolveRangeSelection(ORDER, 'b', 'd'), ['b', 'c', 'd']);
  });

  test('works when the target precedes the anchor', () => {
    assert.deepEqual(resolveRangeSelection(ORDER, 'd', 'b'), ['b', 'c', 'd']);
  });

  test('returns just the target when there is no anchor', () => {
    assert.deepEqual(resolveRangeSelection(ORDER, null, 'c'), ['c']);
  });

  test('returns just the target when the anchor is no longer visible', () => {
    assert.deepEqual(resolveRangeSelection(ORDER, 'zzz', 'c'), ['c']);
  });

  test('returns just the target when anchor and target match', () => {
    assert.deepEqual(resolveRangeSelection(ORDER, 'c', 'c'), ['c']);
  });

  test('returns an empty span when the target is not visible', () => {
    assert.deepEqual(resolveRangeSelection(ORDER, 'a', 'zzz'), []);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/components/item-list/selectionRange.test.ts`
Expected: FAIL — cannot resolve module `./selectionRange`

- [ ] **Step 3: Write the implementation**

Create `src/components/item-list/selectionRange.ts`:

```ts
/**
 * Resolves a shift-click into the inclusive span of ids between the anchor and
 * the target, in current sort order. Falls back to the target alone when the
 * anchor is missing or no longer visible.
 */
export function resolveRangeSelection(
  orderedIds: readonly string[],
  anchorId: string | null,
  targetId: string,
): string[] {
  const targetIndex = orderedIds.indexOf(targetId);
  if (targetIndex === -1) {
    return [];
  }

  const anchorIndex = anchorId ? orderedIds.indexOf(anchorId) : -1;
  if (anchorIndex === -1) {
    return [targetId];
  }

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);

  return orderedIds.slice(start, end + 1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/components/item-list/selectionRange.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 5: Remove the grid wipe**

In `src/components/item-list/useItemListState.ts`, delete the entire effect at lines 49-55:

```ts
// DELETE THIS BLOCK — selection now survives view switches
useEffect(() => {
  if (viewMode !== 'grid' || selectedItemIds.size === 0) {
    return;
  }

  setSelectedItemIds(new Set());
}, [selectedItemIds.size, viewMode]);
```

Leave the prune-to-visible effect at lines 119-139 untouched.

- [ ] **Step 6: Add the anchor and range-aware toggle**

Add alongside the `selectedItemIds` state declaration:

```ts
const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
```

Replace the returned `handleSelectItemChange` (lines 193-207) with:

```ts
handleSelectItemChange: (
  itemId: string,
  checked: boolean | 'indeterminate',
  options?: { extendRange?: boolean },
) => {
  const shouldSelect = checked === true || checked === 'indeterminate';

  if (options?.extendRange) {
    const orderedIds = sortedItems.map((item) => item.id);
    const span = resolveRangeSelection(orderedIds, lastSelectedId, itemId);

    setSelectedItemIds((previous) => {
      const nextSelectedIds = new Set(previous);
      span.forEach((id) => nextSelectedIds.add(id));
      return nextSelectedIds;
    });
    setLastSelectedId(itemId);
    return;
  }

  setSelectedItemIds((previous) => {
    const nextSelectedIds = new Set(previous);
    if (shouldSelect) {
      nextSelectedIds.add(itemId);
    } else {
      nextSelectedIds.delete(itemId);
    }

    return nextSelectedIds;
  });
  setLastSelectedId(itemId);
},
clearSelection: () => {
  setSelectedItemIds(new Set());
  setLastSelectedId(null);
},
```

Add the import at the top of the file:

```ts
import { resolveRangeSelection } from './selectionRange';
```

Add `lastSelectedId` and `clearSelection` to the returned object so consumers can read them.

- [ ] **Step 7: Verify selection survives the view switch**

Run `bun run dev`. Select two rows in list view, toggle to grid, toggle back. The two rows must still be selected.

- [ ] **Step 8: Typecheck and commit**

```bash
bunx tsc --noEmit
bun test
git add src/components/item-list/selectionRange.ts src/components/item-list/selectionRange.test.ts src/components/item-list/useItemListState.ts
git commit -m "feat(item-list): persist selection across views and add range selection"
```

---

### Task 8: HUD action layout logic

Decides which actions appear, in what order, which show counts, and which collapse into the overflow menu. Pure so it can be tested.

**Files:**
- Create: `src/components/item-list/hudActions.ts`
- Test: `src/components/item-list/hudActions.test.ts`

**Interfaces:**
- Consumes: `BULK_ACTIONS`, `partitionByEligibility` from Task 1
- Produces: `HudAction`, `HudActionDescriptor`, `HUD_ACTION_ORDER`, `buildHudActions(items, maxInline)`

- [ ] **Step 1: Write the failing test**

Create `src/components/item-list/hudActions.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { ItemStatus } from '@/types';
import { buildHudActions, HUD_ACTION_ORDER } from './hudActions';

function selection(...statuses: ItemStatus[]) {
  return statuses.map((status, index) => ({ id: `item-${index}`, status }));
}

describe('buildHudActions', () => {
  test('keeps a fixed order regardless of eligible counts', () => {
    assert.deepEqual(HUD_ACTION_ORDER, [
      'pause',
      'resume',
      'cancel',
      'reactivate',
      'archive',
      'category',
    ]);
  });

  test('omits counts when every selected item is eligible', () => {
    const { inline, overflow } = buildHudActions(
      selection('active', 'active', 'active'),
      3,
    );

    assert.deepEqual(
      inline.map((action) => [action.action, action.showCount]),
      [['pause', false], ['cancel', false], ['category', false]],
    );
    assert.equal(overflow.length, 0);
  });

  test('shows counts only on actions that skip something', () => {
    const { inline } = buildHudActions(
      selection('active', 'active', 'paused'),
      3,
    );

    const byAction = new Map(inline.map((action) => [action.action, action]));

    assert.equal(byAction.get('pause')?.eligibleCount, 2);
    assert.equal(byAction.get('pause')?.showCount, true);
    assert.equal(byAction.get('resume')?.eligibleCount, 1);
    assert.equal(byAction.get('resume')?.showCount, true);
    assert.equal(byAction.get('cancel')?.showCount, false);
  });

  test('collapses everything past maxInline into overflow', () => {
    const { inline, overflow } = buildHudActions(
      selection('active', 'active', 'cancelled', 'cancelled'),
      3,
    );

    assert.deepEqual(
      inline.map((action) => action.action),
      ['pause', 'cancel', 'reactivate'],
    );
    assert.deepEqual(
      overflow.map((action) => action.action),
      ['archive', 'category'],
    );
  });

  test('drops actions no selected item is eligible for', () => {
    const { inline, overflow } = buildHudActions(selection('archived'), 3);
    const present = [...inline, ...overflow].map((action) => action.action);

    assert.ok(!present.includes('pause'));
    assert.ok(!present.includes('archive'));
    assert.ok(present.includes('reactivate'));
  });

  test('collapses all actions when maxInline is zero', () => {
    const { inline, overflow } = buildHudActions(
      selection('active', 'active'),
      0,
    );

    assert.equal(inline.length, 0);
    assert.ok(overflow.length > 0);
  });

  test('always offers category regardless of status', () => {
    const { inline, overflow } = buildHudActions(selection('archived'), 3);
    const present = [...inline, ...overflow].map((action) => action.action);

    assert.ok(present.includes('category'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/components/item-list/hudActions.test.ts`
Expected: FAIL — cannot resolve module `./hudActions`

- [ ] **Step 3: Write the implementation**

Create `src/components/item-list/hudActions.ts`:

```ts
import type { ItemStatus } from '@/types';
import { partitionByEligibility, type BulkStatusAction } from './statusActions';

export type HudAction = BulkStatusAction | 'category';

/**
 * Fixed presentation order. Actions may be omitted when nothing is eligible,
 * but the ones that remain never swap places — reordering by count would make
 * the bar reshuffle under the cursor as the selection changes.
 */
export const HUD_ACTION_ORDER: readonly HudAction[] = [
  'pause',
  'resume',
  'cancel',
  'reactivate',
  'archive',
  'category',
];

export const HUD_ACTION_LABELS: Record<HudAction, string> = {
  pause: 'Pause',
  resume: 'Resume',
  cancel: 'Cancel',
  reactivate: 'Reactivate',
  archive: 'Archive',
  category: 'Category',
};

export interface HudActionDescriptor {
  action: HudAction;
  label: string;
  eligibleCount: number;
  /** ids the action will actually be applied to */
  eligibleIds: string[];
  /** ids selected but ineligible, reported in the confirmation */
  skippedIds: string[];
  /** true only when the action applies to a strict subset of the selection */
  showCount: boolean;
}

export function buildHudActions<T extends { id: string; status: ItemStatus }>(
  items: readonly T[],
  maxInline: number,
): { inline: HudActionDescriptor[]; overflow: HudActionDescriptor[] } {
  const selectedCount = items.length;
  const descriptors: HudActionDescriptor[] = [];

  for (const action of HUD_ACTION_ORDER) {
    if (action === 'category') {
      descriptors.push({
        action,
        label: HUD_ACTION_LABELS[action],
        eligibleCount: selectedCount,
        eligibleIds: items.map((item) => item.id),
        skippedIds: [],
        showCount: false,
      });
      continue;
    }

    const { eligible, skipped } = partitionByEligibility(items, action);
    if (eligible.length === 0) {
      continue;
    }

    descriptors.push({
      action,
      label: HUD_ACTION_LABELS[action],
      eligibleCount: eligible.length,
      eligibleIds: eligible.map((item) => item.id),
      skippedIds: skipped.map((item) => item.id),
      showCount: eligible.length < selectedCount,
    });
  }

  return {
    inline: descriptors.slice(0, Math.max(0, maxInline)),
    overflow: descriptors.slice(Math.max(0, maxInline)),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/components/item-list/hudActions.test.ts`
Expected: PASS — 7 tests

- [ ] **Step 5: Typecheck and commit**

```bash
bunx tsc --noEmit
git add src/components/item-list/hudActions.ts src/components/item-list/hudActions.test.ts
git commit -m "feat(item-list): add HUD action layout logic"
```

---

### Task 9: SelectionHUD component

**Files:**
- Create: `src/components/item-list/SelectionHUD.tsx`

**Interfaces:**
- Consumes: `buildHudActions`, `HudAction`, `HudActionDescriptor` from Task 8
- Produces: `<SelectionHUD items selectedCount onAction onDelete onDismiss />` where `onAction(descriptor)` fires for any non-delete action

- [ ] **Step 1: Write the component**

Create `src/components/item-list/SelectionHUD.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Tag,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ItemStatus } from '@/types';
import { buildHudActions, type HudAction, type HudActionDescriptor } from './hudActions';

const NARROW_QUERY = '(max-width: 560px)';
const MAX_INLINE_WIDE = 3;

const ACTION_ICONS: Record<HudAction, typeof Pause> = {
  pause: Pause,
  resume: Play,
  cancel: XCircle,
  reactivate: RotateCcw,
  archive: Archive,
  category: Tag,
};

interface SelectionHUDProps<T extends { id: string; status: ItemStatus }> {
  items: readonly T[];
  onAction: (descriptor: HudActionDescriptor) => void;
  onDelete: () => void;
  onDismiss: () => void;
}

function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(NARROW_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setIsNarrow(event.matches);
    query.addEventListener('change', handleChange);

    return () => query.removeEventListener('change', handleChange);
  }, []);

  return isNarrow;
}

function ActionButton({
  descriptor,
  onAction,
}: {
  descriptor: HudActionDescriptor;
  onAction: (descriptor: HudActionDescriptor) => void;
}) {
  const Icon = ACTION_ICONS[descriptor.action];

  return (
    <button
      type="button"
      onClick={() => onAction(descriptor)}
      className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors interactive-hover-bg"
      style={{ color: 'var(--text-secondary)' }}
    >
      <Icon className="w-3.5 h-3.5" />
      {descriptor.label}
      {descriptor.showCount ? (
        <span
          className="font-mono font-bold rounded px-1.5 py-px text-[10px]"
          style={{
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
          }}
        >
          {descriptor.eligibleCount}
        </span>
      ) : null}
    </button>
  );
}

export function SelectionHUD<T extends { id: string; status: ItemStatus }>({
  items,
  onAction,
  onDelete,
  onDismiss,
}: SelectionHUDProps<T>) {
  const isNarrow = useIsNarrow();
  const { inline, overflow } = buildHudActions(items, isNarrow ? 0 : MAX_INLINE_WIDE);
  const selectedCount = items.length;

  return (
    <AnimatePresence>
      {selectedCount > 0 ? (
        <motion.div
          className="sticky z-30 flex justify-center pointer-events-none"
          style={{ bottom: 24 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            role="toolbar"
            aria-label={`${selectedCount} selected`}
            className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg-card) 82%, transparent)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid var(--border-strong)',
              boxShadow:
                '0 16px 40px -8px rgba(0, 0, 0, 0.4), 0 0 0 0.5px rgba(255, 255, 255, 0.06)',
            }}
          >
            <span
              className="px-1.5 text-xs font-semibold whitespace-nowrap"
              style={{ color: 'var(--text-primary)' }}
            >
              {selectedCount} selected
            </span>

            <span
              aria-hidden
              className="w-px h-[18px] mx-0.5"
              style={{ backgroundColor: 'var(--border-strong)' }}
            />

            {inline.map((descriptor) => (
              <ActionButton
                key={descriptor.action}
                descriptor={descriptor}
                onAction={onAction}
              />
            ))}

            {overflow.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center h-7 px-2 rounded-md transition-colors interactive-hover-bg"
                    style={{ color: 'var(--text-secondary)' }}
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  side="top"
                  className="w-[190px]"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-strong)',
                  }}
                >
                  {overflow.map((descriptor) => {
                    const Icon = ACTION_ICONS[descriptor.action];

                    return (
                      <DropdownMenuItem
                        key={descriptor.action}
                        onClick={() => onAction(descriptor)}
                        className="gap-2.5 menu-item"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Icon className="w-4 h-4" />
                        {descriptor.label}
                        {descriptor.showCount ? (
                          <span className="ml-auto text-[10px] font-mono opacity-60">
                            {descriptor.eligibleCount}
                          </span>
                        ) : null}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <span
              aria-hidden
              className="w-px h-[18px] mx-0.5"
              style={{ backgroundColor: 'var(--border-strong)' }}
            />

            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors interactive-hover-danger"
              aria-label={`Delete ${selectedCount} selected`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isNarrow ? null : 'Delete'}
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="flex items-center h-7 px-1.5 rounded-md transition-colors interactive-hover-bg"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `bunx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add src/components/item-list/SelectionHUD.tsx
git commit -m "feat(item-list): add floating selection HUD"
```

---

### Task 10: Grid card selection

**Files:**
- Modify: `src/components/item-list/ItemListGridView.tsx`

**Interfaces:**
- Consumes: `handleSelectItemChange(itemId, checked, options)` from Task 7
- Produces: grid view now accepts `selectedItemIds`, `onSelectItemChange`, `hasSelection`

- [ ] **Step 1: Extend the props**

Add to `ItemListGridViewProps`:

```tsx
onSelectItemChange: (
  itemId: string,
  checked: boolean | 'indeterminate',
  options?: { extendRange?: boolean },
) => void;
selectedItemIds: Set<string>;
```

Destructure both in the component signature.

- [ ] **Step 2: Add the checkbox and selection ring**

Import at the top:

```tsx
import { Checkbox } from '@/components/ui/checkbox';
```

Inside the `items.map` callback, before the return, derive:

```tsx
const isSelected = selectedItemIds.has(item.id);
const hasSelection = selectedItemIds.size > 0;
```

Change the card's `style` to add the ring when selected, and its `onClick` to honour modifier keys:

```tsx
style={{
  filter:
    item.status === 'cancelled' || item.status === 'archived'
      ? 'grayscale(0.15)'
      : undefined,
  animationDelay: `${index * 0.05}s`,
  transition: 'all 0.2s var(--ease-out-expo)',
  boxShadow: isSelected ? '0 0 0 2px var(--ring)' : undefined,
  borderColor: isSelected ? 'transparent' : undefined,
}}
onClick={(event) => {
  if (event.metaKey || event.ctrlKey) {
    event.preventDefault();
    onSelectItemChange(item.id, !isSelected);
    return;
  }

  if (event.shiftKey) {
    event.preventDefault();
    onSelectItemChange(item.id, true, { extendRange: true });
    return;
  }

  onEdit(item);
}}
```

The existing `onMouseEnter` sets `boxShadow` imperatively — guard it so hover cannot erase the ring:

```tsx
onMouseEnter={(event) => {
  if (item.status === 'active' && !isSelected) {
    event.currentTarget.style.boxShadow =
      'var(--shadow-elevated), 0 10px 28px -10px rgba(0, 0, 0, 0.22)';
    event.currentTarget.style.transform = 'translateY(-2px)';
  }
}}
onMouseLeave={(event) => {
  event.currentTarget.style.boxShadow = isSelected ? '0 0 0 2px var(--ring)' : '';
  event.currentTarget.style.transform = '';
}}
```

As the first child inside the card, add the corner checkbox:

```tsx
<div
  className={`absolute top-2.5 left-2.5 z-10 p-[3px] rounded-[7px] transition-opacity ${
    hasSelection ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
  }`}
  style={{
    backgroundColor: 'color-mix(in srgb, var(--bg-base) 70%, transparent)',
    backdropFilter: 'blur(10px) saturate(160%)',
    WebkitBackdropFilter: 'blur(10px) saturate(160%)',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.4)',
  }}
  onClick={(event) => event.stopPropagation()}
>
  <Checkbox
    checked={isSelected}
    onCheckedChange={(checked) => onSelectItemChange(item.id, checked)}
    aria-label={`Select ${item.name}`}
  />
</div>
```

Add `relative` to the card's className so the absolute positioning anchors correctly:

```tsx
className={`stagger-item card group relative cursor-pointer ${STATUS_STYLES[item.status]}`}
```

- [ ] **Step 3: Verify by hand**

Run `bun run dev` in grid view:
- At rest, no checkbox is visible.
- Hovering a card fades one in at the top-left.
- Clicking the checkbox selects without opening the editor.
- Once one card is selected, every card's checkbox stays visible.
- Selected cards show a green ring that survives hovering on and off.
- ⌘-click toggles; ⇧-click extends; a plain click still opens the editor.

- [ ] **Step 4: Typecheck and commit**

```bash
bunx tsc --noEmit
git add src/components/item-list/ItemListGridView.tsx
git commit -m "feat(item-list): add grid card multi-select"
```

---

### Task 11: Shift-click ranges in table view

**Files:**
- Modify: `src/components/item-list/ItemListTableView.tsx:17-18` (prop type), `:124-131` (checkbox cell)

**Interfaces:**
- Consumes: `handleSelectItemChange(itemId, checked, options)`
- Produces: nothing new

- [ ] **Step 1: Widen the prop type**

```tsx
onSelectItemChange: (
  itemId: string,
  checked: boolean | 'indeterminate',
  options?: { extendRange?: boolean },
) => void;
```

- [ ] **Step 2: Handle shift on the checkbox cell**

Replace the checkbox `<td>` at line 124:

```tsx
<td
  className="pl-5 pr-3 py-4"
  onClick={(event) => event.stopPropagation()}
>
  <Checkbox
    checked={selectedItemIds.has(item.id)}
    onCheckedChange={(checked) => onSelectItemChange(item.id, checked)}
    aria-label={`Select ${item.name}`}
    onClick={(event) => {
      event.stopPropagation();
      if (event.shiftKey) {
        event.preventDefault();
        onSelectItemChange(item.id, true, { extendRange: true });
      }
    }}
  />
</td>
```

- [ ] **Step 3: Add row-level modifier handling**

The row's existing `onClick={() => onEdit(item)}` at line 112 becomes:

```tsx
onClick={(event) => {
  if (event.metaKey || event.ctrlKey) {
    event.preventDefault();
    onSelectItemChange(item.id, !selectedItemIds.has(item.id));
    return;
  }

  if (event.shiftKey) {
    event.preventDefault();
    onSelectItemChange(item.id, true, { extendRange: true });
    return;
  }

  onEdit(item);
}}
```

- [ ] **Step 4: Verify by hand**

In list view: click row 2's checkbox, then ⇧-click row 5's checkbox — rows 2 through 5 select. ⌘-click a row body toggles it without opening the editor.

- [ ] **Step 5: Typecheck and commit**

```bash
bunx tsc --noEmit
git add src/components/item-list/ItemListTableView.tsx
git commit -m "feat(item-list): support shift-click ranges in table view"
```

---

### Task 12: Selection keyboard shortcuts

**Files:**
- Create: `src/components/item-list/useSelectionKeyboard.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `useSelectionKeyboard({ enabled, onSelectAll, onClear, onDelete, hasSelection })`

- [ ] **Step 1: Write the hook**

Create `src/components/item-list/useSelectionKeyboard.ts`:

```ts
import { useEffect } from 'react';

interface UseSelectionKeyboardOptions {
  /** false while a dialog is open, so shortcuts never fire behind a modal */
  enabled: boolean;
  hasSelection: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onDelete: () => void;
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;

  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export function useSelectionKeyboard({
  enabled,
  hasSelection,
  onSelectAll,
  onClear,
  onDelete,
}: UseSelectionKeyboardOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEntry(event.target)) {
        return;
      }

      const isModified = event.metaKey || event.ctrlKey;

      if (isModified && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        onSelectAll();
        return;
      }

      if (!hasSelection) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onClear();
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        onDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, hasSelection, onClear, onDelete, onSelectAll]);
}
```

- [ ] **Step 2: Typecheck**

Run: `bunx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add src/components/item-list/useSelectionKeyboard.ts
git commit -m "feat(item-list): add selection keyboard shortcuts hook"
```

---

### Task 13: Bulk mode for StatusChangeDialog

**Files:**
- Modify: `src/components/StatusChangeDialog.tsx:9-14` (props), header copy, date floor

**Interfaces:**
- Consumes: `getBatchMinimumEffectiveDate` from Task 4
- Produces: `StatusChangeDialog` accepts optional `bulkItems: ItemWithCategory[]` and `skippedCount: number`

- [ ] **Step 1: Extend the props**

Add to `StatusChangeDialogProps`:

```tsx
/** When present the dialog is in bulk mode and `item` is the first of the batch. */
bulkItems?: ItemWithCategory[];
/** Selected items that are ineligible for this action, reported in the header. */
skippedCount?: number;
```

- [ ] **Step 2: Use the batch floor for date validation**

Wherever the dialog currently computes its minimum date from the single `item` (the `resumeMinimumDate` / `reactivateMinimumDate` values used at line 617 and the guards at lines 186-235), derive from the batch when in bulk mode:

```tsx
const effectiveItems = bulkItems && bulkItems.length > 0 ? bulkItems : [item];
const minimumEffectiveDate = getBatchMinimumEffectiveDate(effectiveItems, action);
```

Replace the per-item minimums with `minimumEffectiveDate` so a date valid for one item cannot be invalid for another in the same batch.

Add the import:

```tsx
import { getBatchMinimumEffectiveDate } from '@/services/database/lifecycle';
```

- [ ] **Step 3: State the scope in the header**

Where the dialog renders its title/description, add a bulk-mode line:

```tsx
{bulkItems && bulkItems.length > 1 ? (
  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
    Applies to {bulkItems.length}{' '}
    {bulkItems.length === 1 ? 'item' : 'items'}
    {skippedCount && skippedCount > 0
      ? ` — ${skippedCount} selected ${
          skippedCount === 1 ? 'item is' : 'items are'
        } not eligible and will be skipped.`
      : '.'}
  </p>
) : null}
```

- [ ] **Step 4: Verify by hand**

Select three items with mixed statuses, choose Pause from the HUD (wired in Task 14), and confirm the header reads "Applies to 2 items — 1 selected item is not eligible and will be skipped." Confirm the date picker rejects a date earlier than the latest `start_date` in the batch.

- [ ] **Step 5: Typecheck and commit**

```bash
bunx tsc --noEmit
git add src/components/StatusChangeDialog.tsx
git commit -m "feat(dialogs): add bulk mode to StatusChangeDialog"
```

---

### Task 14: Wire the HUD into ItemList and App

Removes the toolbar selection block — the root of the original problem — and connects everything.

**Files:**
- Modify: `src/App.tsx` (add bulk handlers, pass down)
- Modify: `src/components/ItemList.tsx:154-192` (remove toolbar block), `:126-127` (render HUD)

**Interfaces:**
- Consumes: `deleteItems`, `executeStatusChangeForItems`, `summarizeBulkResult`, `SelectionHUD`, `useSelectionKeyboard`
- Produces: `onBulkDelete(ids)`, `onBulkStatusChange(ids, data)` props on `ItemList`

- [ ] **Step 1: Add the App handlers**

In `src/App.tsx`, alongside `handleDeleteItem` at line 225:

```tsx
const handleBulkDelete = useCallback(
  async (ids: string[], labels: { singular: string; plural: string }) => {
    const result = await deleteItems(ids);
    await reloadItems();

    const summary = summarizeBulkResult(result, {
      pastTense: 'Deleted',
      failedVerb: 'delete',
      singular: labels.singular,
      plural: labels.plural,
    });

    if (summary) {
      if (summary.tone === 'success') {
        toast.success(summary.message);
      } else {
        toast.error(summary.message);
      }
    }

    return result;
  },
  [reloadItems],
);

const handleBulkStatusChange = useCallback(
  async (
    ids: string[],
    data: StatusChangeData,
    copy: { pastTense: string; failedVerb: string; singular: string; plural: string },
  ) => {
    const result = await executeStatusChangeForItems(ids, data);
    await reloadItems();

    const summary = summarizeBulkResult(result, copy);
    if (summary) {
      if (summary.tone === 'success') {
        toast.success(summary.message);
      } else {
        toast.error(summary.message);
      }
    }

    return result;
  },
  [reloadItems],
);
```

Add the imports:

```tsx
import { deleteItems, executeStatusChangeForItems } from '@/services/database';
import { summarizeBulkResult } from '@/services/database/bulkResults';
```

Verify both are re-exported from `src/services/database/index.ts`; add them to its export list if not.

Pass both to every `<ItemList>` render alongside the existing `onDeleteItem`.

- [ ] **Step 2: Delete the toolbar selection block**

In `src/components/ItemList.tsx`, remove lines 166-191 entirely — the `viewMode === 'list' && selectedCount > 0 && (…)` block containing the "N selected" pill and the "Delete selected" button. The `SearchFilterToolbar` children collapse back to just the Add button.

- [ ] **Step 3: Render the HUD**

Add after the closing `</SearchFilterToolbar>`:

```tsx
<SelectionHUD
  items={selectedVisibleItems}
  onAction={handleHudAction}
  onDelete={() => setBulkDeleteConfirmOpen(true)}
  onDismiss={clearSelection}
/>
```

Add the bottom clearance so the HUD can't cover the last row — change the wrapper at line 127 from `className="space-y-6"` to:

```tsx
<div className="space-y-6" style={{ paddingBottom: selectedCount > 0 ? 76 : 0 }}>
```

- [ ] **Step 4: Handle HUD actions**

Add to `ItemList`:

```tsx
const [bulkStatusAction, setBulkStatusAction] = useState<{
  action: StatusChangeData['action'];
  items: ItemWithCategory[];
  skippedCount: number;
} | null>(null);

const handleHudAction = (descriptor: HudActionDescriptor) => {
  if (descriptor.action === 'category') {
    setBulkCategoryOpen(true);
    return;
  }

  const eligibleItems = selectedVisibleItems.filter((item) =>
    descriptor.eligibleIds.includes(item.id),
  );

  setBulkStatusAction({
    action: descriptor.action,
    items: eligibleItems,
    skippedCount: descriptor.skippedIds.length,
  });
};
```

Render `StatusChangeDialog` in bulk mode when `bulkStatusAction` is set, passing `bulkItems={bulkStatusAction.items}` and `skippedCount={bulkStatusAction.skippedCount}`, with `onConfirm` calling `onBulkStatusChange(bulkStatusAction.items.map((item) => item.id), data, copy)` and then clearing only the succeeded ids from the selection.

- [ ] **Step 5: Fix the broken bulk delete**

Replace `handleBulkDeleteConfirm` (lines 113-124) with an awaited batch that clears only what succeeded:

```tsx
const handleBulkDeleteConfirm = async () => {
  if (selectedCount === 0) {
    setBulkDeleteConfirmOpen(false);
    return;
  }

  const result = await onBulkDelete(
    selectedVisibleItems.map((item) => item.id),
    { singular: labels.singular, plural: labels.plural },
  );

  setSelectedItemIds((previous) => {
    const nextSelectedIds = new Set(previous);
    result.succeeded.forEach((id) => nextSelectedIds.delete(id));
    return nextSelectedIds;
  });
  setBulkDeleteConfirmOpen(false);
};
```

- [ ] **Step 6: Wire the keyboard**

```tsx
useSelectionKeyboard({
  enabled: !deleteConfirm && !bulkDeleteConfirmOpen && !bulkStatusAction,
  hasSelection: selectedCount > 0,
  onSelectAll: () => handleSelectAllChange(true),
  onClear: clearSelection,
  onDelete: () => setBulkDeleteConfirmOpen(true),
});
```

- [ ] **Step 7: Confirm the original defect is gone**

Run `bun run dev`, select 5 items, delete them. Confirm in the Network tab **one** DELETE request and **one** items refetch, and **one** toast reading "Deleted 5 subscriptions". Before this task the same action produced 5 DELETEs, 5 refetches, and 5 toasts.

- [ ] **Step 8: Typecheck, test, commit**

```bash
bunx tsc --noEmit
bun test
git add src/App.tsx src/components/ItemList.tsx
git commit -m "feat(item-list): replace toolbar delete with selection HUD"
```

---

### Task 15: Manual verification pass

**Files:** none — verification only.

- [ ] **Step 1: Toolbar stability**

Select and deselect items in both views at 1440px and at 900px. The Add button must not move by a single pixel, and the toolbar must never wrap to a second line.

- [ ] **Step 2: HUD responsiveness**

Resize the window through 1440px, 800px, and 500px with 4 mixed-status items selected. Confirm:
- Above 560px: up to three inline actions plus `⋯`.
- Below 560px: only count, `⋯`, trash icon, and dismiss. The bar never wraps or overflows.

- [ ] **Step 3: Count labels**

- Select 3 active items → no counts anywhere.
- Select 2 active + 1 paused → `Pause 2`, `Resume 1`, and `Cancel` with no count.

- [ ] **Step 4: Themes and motion**

Check the HUD in light and dark. Enable Reduce Motion in System Settings → Accessibility → Display and confirm the HUD appears without the rise animation.

- [ ] **Step 5: Keyboard**

- ⌘A with focus in the list selects all visible; ⌘A with focus in the search field selects the search text instead.
- Esc clears the selection.
- ⌫ opens the bulk delete confirmation.
- Neither ⌫ nor Esc fires while a dialog is open.

- [ ] **Step 6: Partial failure**

With DevTools throttling set to Offline, attempt a bulk pause. Confirm one error toast, and that the selection is retained so the action can be retried.

- [ ] **Step 7: Commit any fixes**

```bash
bunx tsc --noEmit
bun test
git add -A
git commit -m "fix(item-list): manual verification fixes"
```

---

### Task 16: Bulk category change

The HUD dispatches `category` from Task 14, but the picker it opens is delivered here. **Between Task 14 and this task the Category action is inert** — it sets state nothing renders. Land this task before demoing.

**Files:**
- Modify: `src/services/database/catalog.ts` (append after `deleteItems`)
- Create: `src/components/item-list/BulkCategoryDialog.tsx`
- Modify: `src/components/ItemList.tsx` (render the dialog), `src/App.tsx` (handler)

**Interfaces:**
- Consumes: `BulkResult`, `emptyBulkResult`, `summarizeBulkResult`
- Produces: `updateItemsCategory(ids, categoryId): Promise<BulkResult>`; `<BulkCategoryDialog isOpen categories itemCount onConfirm onCancel />`

- [ ] **Step 1: Add the batched service call**

Append to `src/services/database/catalog.ts` — structurally identical to `deleteItems`:

```ts
/**
 * Reassigns many items to one category in a single statement. A null
 * categoryId clears the category.
 */
export async function updateItemsCategory(
  ids: string[],
  categoryId: string | null,
): Promise<BulkResult> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return emptyBulkResult();
  }

  const userId = await getUserId();
  const { data, error } = await supabase
    .from('items')
    .update({ category_id: categoryId })
    .in('id', uniqueIds)
    .eq('user_id', userId)
    .select('id');

  if (error) {
    return {
      succeeded: [],
      failed: uniqueIds.map((id) => ({ id, error: error.message })),
      skipped: [],
    };
  }

  const updatedIds = new Set((data ?? []).map((row) => row.id as string));

  return {
    succeeded: uniqueIds.filter((id) => updatedIds.has(id)),
    failed: uniqueIds
      .filter((id) => !updatedIds.has(id))
      .map((id) => ({ id, error: 'Item not found' })),
    skipped: [],
  };
}
```

- [ ] **Step 2: Write the picker dialog**

Create `src/components/item-list/BulkCategoryDialog.tsx`:

```tsx
import { useState } from 'react';
import type { Category } from '@/types';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface BulkCategoryDialogProps {
  isOpen: boolean;
  categories: Category[];
  itemCount: number;
  onConfirm: (categoryId: string | null) => void;
  onCancel: () => void;
}

export function BulkCategoryDialog({
  isOpen,
  categories,
  itemCount,
  onConfirm,
  onCancel,
}: BulkCategoryDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={`Change category for ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
      message="Pick the category to apply to every selected item."
      confirmLabel="Apply"
      cancelLabel="Cancel"
      onConfirm={() => onConfirm(selectedId)}
      onCancel={onCancel}
    >
      <div className="mt-3 max-h-64 overflow-y-auto flex flex-col gap-1">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setSelectedId(category.id)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors interactive-hover-bg"
            style={{
              backgroundColor:
                selectedId === category.id ? 'var(--bg-active)' : 'transparent',
              color: 'var(--text-primary)',
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: category.color }}
            />
            {category.name}
          </button>
        ))}
      </div>
    </ConfirmDialog>
  );
}
```

If `ConfirmDialog` does not accept children, render this markup in a plain Radix dialog matching `StatusChangeDialog`'s shell instead — check `src/components/ui/ConfirmDialog.tsx` first and follow whichever pattern it supports.

- [ ] **Step 3: Wire it up**

In `App.tsx`, add `handleBulkCategoryChange` following the exact shape of `handleBulkDelete` from Task 14, with copy `{ pastTense: 'Moved', failedVerb: 'update', singular, plural }`.

In `ItemList.tsx`, add `const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);` and render:

```tsx
<BulkCategoryDialog
  isOpen={bulkCategoryOpen}
  categories={filteredCategories}
  itemCount={selectedCount}
  onConfirm={async (categoryId) => {
    const result = await onBulkCategoryChange(
      selectedVisibleItems.map((item) => item.id),
      categoryId,
      { singular: labels.singular, plural: labels.plural },
    );
    setSelectedItemIds((previous) => {
      const nextSelectedIds = new Set(previous);
      result.succeeded.forEach((id) => nextSelectedIds.delete(id));
      return nextSelectedIds;
    });
    setBulkCategoryOpen(false);
  }}
  onCancel={() => setBulkCategoryOpen(false)}
/>
```

Add `bulkCategoryOpen` to the `enabled` guard in the `useSelectionKeyboard` call from Task 14 Step 6.

- [ ] **Step 4: Verify by hand**

Select 3 items across different categories, pick Category from the HUD (it will be behind `⋯` when other actions are eligible), choose a category, apply. Confirm one toast reading "Moved 3 subscriptions" and that the category dot on each row updates after the single refetch.

- [ ] **Step 5: Typecheck, test, commit**

```bash
bunx tsc --noEmit
bun test
git add src/services/database/catalog.ts src/components/item-list/BulkCategoryDialog.tsx src/components/ItemList.tsx src/App.tsx
git commit -m "feat(item-list): add bulk category change"
```

---

## Self-Review Notes

**Spec coverage:** Selection model → Task 7. Grid affordance → Task 10. Table ranges → Task 11. HUD → Tasks 8, 9, 14. Eligibility → Tasks 1, 2. Bulk status changes → Tasks 4, 6, 13. Bulk delete → Tasks 5, 14. Bulk category → Task 16. Result reporting → Tasks 3, 14. Keyboard → Tasks 12, 14. Manual verification → Task 15.

**Ordering note:** Task 15 (manual verification) is written to run last, but Task 16 delivers the Category picker that Task 14 dispatches to. Either run 16 before 15, or accept that the Category action does nothing during the Task 15 pass.

**Spec items deliberately not implemented:** undo/restore for bulk delete, and bulk `convert` / `start_trial` / `edit_cancellation` — all listed as non-goals in the spec.
