-- Migration: Add Status System for Pause/Cancel/Archive Functionality
-- Created: 2026-01-24

-- 1. Create status enum type
CREATE TYPE item_status AS ENUM ('active', 'paused', 'cancelled', 'archived');

-- 2. Add new columns to items table
ALTER TABLE items
  ADD COLUMN status item_status NOT NULL DEFAULT 'active',
  ADD COLUMN paused_at TIMESTAMPTZ,
  ADD COLUMN paused_until DATE,
  ADD COLUMN cancelled_at TIMESTAMPTZ,
  ADD COLUMN cancellation_date DATE,
  ADD COLUMN archived_at TIMESTAMPTZ;

-- 3. Create index for status column (for performance)
CREATE INDEX idx_items_status ON items(status);

-- 4. Create status history table for audit trail
CREATE TABLE item_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status item_status NOT NULL,
  reason TEXT,
  notes TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create index for status history queries
CREATE INDEX idx_item_status_history_item ON item_status_history(item_id);
CREATE INDEX idx_item_status_history_changed_at ON item_status_history(changed_at);

-- 6. Migrate existing data from is_active to status
UPDATE items
SET
  status = CASE
    WHEN is_active = true THEN 'active'::item_status
    ELSE 'paused'::item_status
  END,
  paused_at = CASE
    WHEN is_active = false THEN updated_at
    ELSE NULL
  END;

-- 7. Add RLS (Row Level Security) policies for item_status_history
ALTER TABLE item_status_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view status history for their own items
CREATE POLICY "Users can view their own item status history"
  ON item_status_history
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Policy: Users can insert status history for their own items
CREATE POLICY "Users can insert status history for their own items"
  ON item_status_history
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- Note: Keep is_active column temporarily for rollback safety
-- Will be dropped in a future migration after verification
