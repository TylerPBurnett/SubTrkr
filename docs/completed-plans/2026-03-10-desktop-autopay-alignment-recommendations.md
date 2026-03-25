# Desktop Autopay Alignment Recommendations

## Status Update

Completed on 2026-03-24:

- desktop no longer auto-archives cancelled items during maintenance
- trials are excluded from normalized spend and upcoming-charge calculations
- status-history parity is in: analytics reconstructs from lifecycle history, the history timeline is visible, and desktop covers `archive`, `start_trial`, and `edit_cancellation`

Remaining separate hardening:

- shared transactional status-change writes still belong to the backend-owned follow-up tracked from `/Users/tyler/Development/SubTrkr-mobile`

## Goal

Align the desktop app with the newer autopay-first product model now being established on mobile, while preserving the desktop app's stronger lifecycle-date handling.

The target product story should be:

- recurring schedules are tracked automatically while an item is active
- payment rows are optional confirmations, not the primary source of truth
- lifecycle effective dates control historical analytics and future schedule behavior
- cancelled items remain editable until the user explicitly archives them

## Keep From Desktop

These parts of the current desktop behavior are worth preserving and should become the shared baseline across both apps:

- keep retroactive effective dates for cancellation, resume, reactivate, and trial conversion
- keep recalculating `next_billing_date` from the effective activation date when an item becomes active again
- keep using effective cancellation timing in historical analytics instead of relying only on recorded timestamps

## Change In Desktop

### 1. Stop auto-archiving cancelled items

The current desktop app auto-archives cancelled items during maintenance and app startup. That conflicts with the product rule that users should be able to come back later and correct a cancellation date.

Recommendation:

- remove automatic archival of cancelled items
- keep archive as an explicit user action
- if maintenance still needs cleanup behavior later, only archive items after the product has a separate "locked history" concept

### 2. Remove trials from projected spend

Trials should not count as assumed recurring charges before conversion.

Recommendation:

- exclude `trial` items from normalized spend summaries and reconstructed monthly trends
- continue showing trial expirations in their own lifecycle surfaces if useful

### 3. Separate upcoming charges from lifecycle events

Desktop currently mixes recurring dues, paused auto-resume dates, and trial expirations in one upcoming feed.

Recommendation:

- keep recurring charges in the main upcoming-billing surface
- either separate lifecycle events into their own section or label them explicitly as non-charge events
- avoid presenting a trial expiry or auto-resume as if it were a bill

### 4. Clarify the role of payment logging

Desktop has payment service support, but the product direction should match mobile:

- payment logging remains available as optional confirmation
- recurring schedules should not depend on manual payment rows
- if desktop exposes payment logging in the UI later, it should be secondary, not a primary quick action

### 5. Write one shared lifecycle contract

The two apps are close enough now that a single written contract would reduce drift.

Recommendation:

- define shared rules for billing anchors, effective dates, trial handling, upcoming charges, and payment logging
- treat that contract as the product source of truth for both codebases

### 6. Close status-history parity gaps

The effective-date migration means desktop now persists richer lifecycle history, but desktop still lags mobile in how much of that history it actually uses.

Recommendation:

- update desktop analytics to reconstruct lifecycle state from status-history effective dates instead of only item-row heuristics
- add a visible desktop status history timeline so `action`, `effective_date`, `reason`, and notes are not write-only
- add desktop UI support for `archive`, `start_trial`, and `edit_cancellation` where those actions are part of the shared product contract

## Suggested Order

1. Remove desktop auto-archive for cancelled items.
2. Exclude trials from projected spend.
3. Close the status-history parity gaps.
4. Split or relabel upcoming lifecycle events.
5. Decide whether desktop needs a visible secondary `Log Payment` UI at all.
6. Capture the shared lifecycle contract in one cross-platform design note.

## Non-Goals

These do not need to be copied forward just for parity:

- exact desktop implementation quirks that conflict with autopay-first tracking
- payment-log-first messaging
- trial items counting as active spend before conversion
