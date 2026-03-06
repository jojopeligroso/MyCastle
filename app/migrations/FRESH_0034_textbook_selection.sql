-- FRESH_0034_textbook_selection.sql
-- Add active_textbooks column to tenants for textbook filtering
-- Date: 2026-03-06

-- =============================================================================
-- SCHEMA CHANGES
-- =============================================================================

-- Add active_textbooks column to tenants table
-- Stores array of active textbook names (from textbook_descriptors.book)
-- NULL means all textbooks are active (backwards compatible default)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS active_textbooks JSONB DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN tenants.active_textbooks IS
  'Array of active textbook names. NULL means all textbooks active. Empty array means no textbooks.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify column was added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'active_textbooks'
  ) THEN
    RAISE EXCEPTION 'Column active_textbooks was not created';
  END IF;

  RAISE NOTICE 'FRESH_0034: active_textbooks column added to tenants table';
END $$;
