-- Migration: Add is_super_admin column to users table
-- Date: 2026-02-03
-- Purpose: Allow platform owner to access all tenant data

-- Add column with default false
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_is_super_admin ON users(is_super_admin)
WHERE is_super_admin = true;

-- Set super admin flag for platform owner
-- IMPORTANT: Update this email to match your actual email
UPDATE users
SET is_super_admin = true,
    updated_at = NOW()
WHERE email = 'eoinmaleoin@gmail.com';

-- Verify
SELECT email, is_super_admin, primary_role
FROM users
WHERE is_super_admin = true;
