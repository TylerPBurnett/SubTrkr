-- Enforce amount rules by item status at the database level.
-- Rule:
-- - Trial items can be free (amount = 0) or paid (amount > 0)
-- - Non-trial items must have amount > 0
-- - Negative amounts are never allowed

ALTER TABLE items
  DROP CONSTRAINT IF EXISTS items_amount_valid_for_status;

ALTER TABLE items
  ADD CONSTRAINT items_amount_valid_for_status
  CHECK (
    amount >= 0
    AND (
      status = 'trial'::item_status
      OR amount > 0
    )
  );
