-- ============================================================================
-- Migration: Add student-specific columns to users table
-- Date: 2026-03-03
-- Purpose: Add level and visa columns to users table for students
--          These columns are nullable - only populated for users with role='student'
--          Visa fields only populated for visa students
-- ============================================================================

-- Add CEFR level tracking columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS current_level VARCHAR(2);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS initial_level VARCHAR(2);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS level_status VARCHAR(20);

-- Add visa columns (for visa students only)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS visa_type VARCHAR(50);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS visa_expiry DATE;

-- Add comments for documentation
COMMENT ON COLUMN users.current_level IS 'Current CEFR level (A1-C2). Only for students.';
COMMENT ON COLUMN users.initial_level IS 'Initial CEFR level at enrollment. Only for students.';
COMMENT ON COLUMN users.level_status IS 'Level status: confirmed, provisional, pending_approval. Only for students.';
COMMENT ON COLUMN users.visa_type IS 'Visa type (e.g., First Time, Renewal 1). Only for visa students.';
COMMENT ON COLUMN users.visa_expiry IS 'Visa expiry date. Only for visa students.';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_current_level ON users(current_level) WHERE current_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_visa_expiry ON users(visa_expiry) WHERE visa_expiry IS NOT NULL;

-- Migrate existing data from students table (if applicable)
UPDATE users u
SET
  visa_type = s.visa_type,
  visa_expiry = s.visa_expiry_date
FROM students s
WHERE s.user_id = u.id
  AND u.visa_type IS NULL
  AND s.visa_type IS NOT NULL;

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('current_level', 'initial_level', 'level_status', 'visa_type', 'visa_expiry')
ORDER BY column_name;

-- ============================================================================
-- Migration Complete
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration FRESH_0031 completed: student-specific columns added to users table';
END $$;
