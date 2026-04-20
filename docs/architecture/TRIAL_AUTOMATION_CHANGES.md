# Trial Automation Feature - Changes & Rollback Guide

**Date Added**: 2026-02-05
**Purpose**: Add automated handling and notifications for trial subscriptions

## Overview

This feature adds automation to the trial subscription system, including:
- Automatic detection of expiring trials
- Push notifications for trials ending soon
- Recording of expired trials in status history
- Integration with existing upcoming items view

---

## Files Changed

### 1. `src/services/database.ts`

**Location**: Lines 698-758 (added after `calculateNextBillingDate` function)

**Changes Added**:

#### New Function: `getExpiringTrials()`
```typescript
export async function getExpiringTrials(days: number = 7): Promise<ItemWithCategory[]> {
  // Queries trials ending within X days
  // Uses idx_items_trial_end_date index for performance
}
```

#### New Function: `handleExpiredTrials()`
```typescript
export async function handleExpiredTrials(): Promise<number> {
  // Transitions expired trials to cancelled
  // Records the automatic transition in item_status_history
  // Runs automatically on app load
}
```

#### Modified Function: `getUpcomingItems()`
**Lines Changed**: 637-658

**Before**:
```typescript
const filtered = items.filter((item) => {
  const activeDue = item.status === 'active' && isDueWithinDays(item.next_billing_date, days);
  const pausedUntil = item.paused_until;
  const pausedDue =
    item.status === 'paused' && pausedUntil ? isDueWithinDays(pausedUntil, days) : false;

  return (!type || item.item_type === type) && (activeDue || pausedDue);
});
```

**After**:
```typescript
const filtered = items.filter((item) => {
  const activeDue = item.status === 'active' && isDueWithinDays(item.next_billing_date, days);
  const pausedUntil = item.paused_until;
  const pausedDue =
    item.status === 'paused' && pausedUntil ? isDueWithinDays(pausedUntil, days) : false;
  const trialExpiring =
    item.status === 'trial' && item.trial_end_date
      ? isDueWithinDays(item.trial_end_date, days)
      : false;

  return (!type || item.item_type === type) && (activeDue || pausedDue || trialExpiring);
});
```

**Sorting logic also updated** to handle trial_end_date.

---

### 2. `src/services/notifications.ts`

**Location**: Lines 79-134 (added after `sendRenewalReminder` function)

**Changes Added**:

#### New Function: `sendTrialExpiringReminder()`
```typescript
export async function sendTrialExpiringReminder(
  item: ItemWithCategory,
  options?: { skipPermissionCheck?: boolean }
): Promise<void> {
  // Sends push notification for expiring trial
  // Shows days until expiration and conversion price
}
```

#### New Function: `checkAndNotifyExpiringTrials()`
```typescript
export async function checkAndNotifyExpiringTrials(
  items: ItemWithCategory[]
): Promise<void> {
  // Checks all items and sends notifications for expiring trials
  // Prevents duplicate notifications using localStorage
}
```

---

### 3. `src/App.tsx`

**Changes Made**:

#### Import Added (Line 24):
```typescript
// Before:
import {
  getItems,
  getCategories,
  createItem,
  updateItem,
  deleteItem,
  toggleItemActive,
  advancePastDueItems,
  resumePausedItems,
  executeStatusChange,
} from './services/database';

// After:
import {
  getItems,
  getCategories,
  createItem,
  updateItem,
  deleteItem,
  toggleItemActive,
  advancePastDueItems,
  resumePausedItems,
  handleExpiredTrials, // ← ADDED
  executeStatusChange,
} from './services/database';
```

#### Import Added (Line 29):
```typescript
// Before:
import { checkAndNotifyUpcomingRenewals } from './services/notifications';

// After:
import { checkAndNotifyUpcomingRenewals, checkAndNotifyExpiringTrials } from './services/notifications';
```

#### loadData Function Modified (Lines 72-86):
```typescript
// Before:
await Promise.all([
  advancePastDueItems(),
  resumePausedItems(),
]);

// ... later ...

checkAndNotifyUpcomingRenewals(itemsData).catch((notifyError) => {
  console.warn('Failed to send reminders:', notifyError);
});

// After:
await Promise.all([
  advancePastDueItems(),
  resumePausedItems(),
  handleExpiredTrials(), // ← ADDED
]);

// ... later ...

Promise.all([
  checkAndNotifyUpcomingRenewals(itemsData),
  checkAndNotifyExpiringTrials(itemsData), // ← ADDED
]).catch((notifyError) => {
  console.warn('Failed to send notifications:', notifyError);
});
```

---

## Database Changes

**No new migrations required** - all trial database structure already exists from:
- `supabase/migrations/20260127_add_trial_status.sql`

The automation uses existing fields:
- `items.status` (already has 'trial' enum value)
- `items.trial_end_date`
- `items.trial_started_at`
- `item_status_history` table

---

## How to Rollback (Return to Manual Tracking)

If you want to remove the automation and return to manual trial management:

### Step 1: Revert `src/services/database.ts`

**Remove these lines** (698-758):
```typescript
// ============ Trial Management ============

export async function getExpiringTrials(days: number = 7): Promise<ItemWithCategory[]> {
  // ... entire function ...
}

export async function handleExpiredTrials(): Promise<number> {
  // ... entire function ...
}
```

**Revert `getUpcomingItems()` function** (lines 637-658) to original version:
- Remove `trialExpiring` check from filter
- Remove trial_end_date handling from sorting logic

### Step 2: Revert `src/services/notifications.ts`

**Remove these lines** (79-134):
```typescript
export async function sendTrialExpiringReminder(
  // ... entire function ...
}

export async function checkAndNotifyExpiringTrials(
  // ... entire function ...
}
```

### Step 3: Revert `src/App.tsx`

**Remove imports**:
- Remove `handleExpiredTrials` from database imports
- Remove `checkAndNotifyExpiringTrials` from notifications imports

**Revert loadData function**:
- Remove `handleExpiredTrials()` from Promise.all array
- Change back to single notification call:
  ```typescript
  checkAndNotifyUpcomingRenewals(itemsData).catch((notifyError) => {
    console.warn('Failed to send reminders:', notifyError);
  });
  ```

### Step 4: Test

After reverting, verify:
- App still loads without errors
- Trials can still be created/edited manually
- No automatic notifications for trials
- Trial end dates still display in UI (this is not removed)

---

## What Will Still Work After Rollback

Even after rolling back automation, you'll still have:
- ✅ Trial status and UI display
- ✅ Manual trial creation and editing
- ✅ Trial end date field in database
- ✅ Manual conversion to active/cancel
- ✅ Trials included in spending calculations
- ✅ `idx_items_trial_end_date` index (harmless if unused)

---

## What You'll Lose After Rollback

- ❌ Automatic notifications for expiring trials
- ❌ Expiring trials in "upcoming items" view
- ❌ Automatic recording of expired trials in history
- ❌ Proactive trial management reminders

---

## Quick Rollback Command

If you want to use git to rollback:

```bash
# See what changed in these files
git diff src/services/database.ts
git diff src/services/notifications.ts
git diff src/App.tsx

# Rollback specific files (if committed)
git checkout HEAD~1 -- src/services/database.ts
git checkout HEAD~1 -- src/services/notifications.ts
git checkout HEAD~1 -- src/App.tsx
```

---

## Notes

- Database migrations (RLS, indexes, etc.) are separate from this feature
- Those migrations improve performance and should NOT be rolled back
- This rollback only removes trial automation, not the trial feature itself
- No data loss occurs from rollback - all trial data remains intact
