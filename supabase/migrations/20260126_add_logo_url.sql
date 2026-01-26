-- Add logo_url column to items table for storing service logos
ALTER TABLE items ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;
