-- Add 'trial' status to item_status enum
ALTER TYPE item_status ADD VALUE IF NOT EXISTS 'trial';

-- Add trial-specific columns to items table
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end_date DATE;

-- Create index on trial_end_date for filtering performance
CREATE INDEX IF NOT EXISTS idx_items_trial_end_date ON items(trial_end_date)
  WHERE status = 'trial';

-- Add column comments for documentation
COMMENT ON COLUMN items.trial_started_at IS 'Timestamp when trial status was set';
COMMENT ON COLUMN items.trial_end_date IS 'Date when trial ends (optional)';
