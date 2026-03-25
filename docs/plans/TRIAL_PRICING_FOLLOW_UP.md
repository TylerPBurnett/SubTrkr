# Trial Pricing Follow-Up

## Status
- Deferred follow-up after current form UX iteration.

## Why this exists
- Current schema stores a single `amount` for both trial and paid lifecycle states.
- This works with current guards, but it is not explicit for "free trial now, paid later at X".

## Planned refactor
1. Add explicit fields:
   - `trial_amount` (default `0`)
   - `paid_amount` (required for non-trial lifecycle or conversion flow)
2. Update service layer:
   - Write/read both values explicitly.
   - Keep conversion guard based on `paid_amount`.
3. Update UI:
   - Trial creation: free amount defaults to `0`.
   - Separate "After trial price" input for conversion-ready setup.
4. Update notifications:
   - Trial reminders reference paid price from `paid_amount`, not trial amount.
5. Data migration:
   - Backfill `paid_amount` from existing `amount`.
   - Backfill `trial_amount` to `0` unless explicit paid-trial cases are detected.

## Acceptance criteria
- Trial and paid pricing are represented separately in data and UI.
- Conversion from trial to active does not require overloaded interpretation of one field.
- Notifications and analytics use the correct value for each lifecycle stage.
