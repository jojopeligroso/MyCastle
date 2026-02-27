-- ============================================================================
-- Migration: Align users table columns with Drizzle schema
-- Date: 2026-02-27
-- Purpose: Add 'role' and 'is_active' columns that the application expects
-- ============================================================================

-- Add 'role' column (maps from primary_role)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(50);

-- Populate role from primary_role
UPDATE users SET role = primary_role WHERE role IS NULL;

-- Set default and not null
ALTER TABLE users
ALTER COLUMN role SET DEFAULT 'student',
ALTER COLUMN role SET NOT NULL;

-- Add is_active boolean column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Populate is_active based on status
UPDATE users SET is_active = (status = 'active');

-- Create index on role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create index on is_active
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('role', 'is_active', 'primary_role', 'status')
ORDER BY column_name;

-- ============================================================================
-- Migration Complete
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration FRESH_0023 completed: role and is_active columns added to users table';
END $$;
