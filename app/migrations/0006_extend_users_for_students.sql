-- Migration 0006: Extend Users Table for Student-Specific Fields
-- Created: 2025-01-XX
-- Description: Adds student-specific columns to users table (hybrid data model)
-- Ref: Student Registry Implementation Plan, User decision: hybrid approach

-- ============================================================================
-- ADD STUDENT-SPECIFIC COLUMNS
-- ============================================================================

-- CEFR Level Fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_level VARCHAR(2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS initial_level VARCHAR(2);

-- Level Status (confirmed, provisional, pending_approval)
-- - confirmed: Admin has verified the level
-- - provisional: Level assigned via diagnostic test, needs approval
-- - pending_approval: Awaiting Director of Studies approval
ALTER TABLE users ADD COLUMN IF NOT EXISTS level_status VARCHAR(20);

-- Visa Information (for international students)
ALTER TABLE users ADD COLUMN IF NOT EXISTS visa_type VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS visa_expiry DATE;

-- ============================================================================
-- ADD CONSTRAINTS
-- ============================================================================

-- CEFR level must be valid or NULL
ALTER TABLE users ADD CONSTRAINT check_current_level
  CHECK (current_level IS NULL OR current_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));

ALTER TABLE users ADD CONSTRAINT check_initial_level
  CHECK (initial_level IS NULL OR initial_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));

-- Level status must be valid or NULL
ALTER TABLE users ADD CONSTRAINT check_level_status
  CHECK (level_status IS NULL OR level_status IN ('confirmed', 'provisional', 'pending_approval'));

-- ============================================================================
-- ADD INDEXES
-- ============================================================================

-- Index for filtering students by current level
CREATE INDEX idx_users_current_level ON users(current_level) WHERE role = 'student';

-- Index for finding students with provisional levels (approval workflow)
CREATE INDEX idx_users_level_status ON users(level_status) WHERE role = 'student';

-- Index for visa expiry tracking (compliance)
CREATE INDEX idx_users_visa_expiry ON users(visa_expiry) WHERE role = 'student' AND visa_expiry IS NOT NULL;

-- Composite index for common student queries
CREATE INDEX idx_users_role_status ON users(role, status);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN users.current_level IS 'Student current CEFR level (A1-C2)';
COMMENT ON COLUMN users.initial_level IS 'Student initial CEFR level at enrollment (A1-C2)';
COMMENT ON COLUMN users.level_status IS 'Level approval status: confirmed (admin verified), provisional (diagnostic test), pending_approval (awaiting DOS)';
COMMENT ON COLUMN users.visa_type IS 'Student visa type (e.g., Tier 4, Student Visa)';
COMMENT ON COLUMN users.visa_expiry IS 'Student visa expiration date for compliance tracking';

-- ============================================================================
-- DATA MIGRATION
-- ============================================================================

-- Set default level_status to 'confirmed' for existing students who have a level
-- This ensures backward compatibility - existing students with levels are considered verified
UPDATE users
SET level_status = 'confirmed'
WHERE role = 'student'
  AND current_level IS NOT NULL
  AND level_status IS NULL;

-- ============================================================================
-- EXTENDED METADATA STRUCTURE DOCUMENTATION
-- ============================================================================

-- The metadata JSONB field on users table stores additional student data:
-- {
--   "nationality": "string",                    // Student's nationality
--   "date_of_birth": "YYYY-MM-DD",             // Date of birth
--   "emergency_contact": {                     // Emergency contact information
--     "name": "string",
--     "phone": "string",
--     "relationship": "string",
--     "email": "string"
--   },
--   "dietary_requirements": "string",          // Special dietary needs
--   "medical_conditions": "string",            // Medical information (encrypted in production)
--   "tags": ["string"],                        // Custom tags for categorization
--   "cohort": "string",                        // Cohort/batch identifier
--   "enrollment_date": "YYYY-MM-DD",          // Actual enrollment date
--   "notes": [                                 // Admin notes array
--     {
--       "date": "ISO8601",
--       "author_id": "uuid",
--       "content": "string",
--       "type": "general|safeguarding"         // Note classification
--     }
--   ],
--   "accommodation": {                         // Accommodation details
--     "type": "homestay|residence|private",
--     "start_date": "YYYY-MM-DD",
--     "end_date": "YYYY-MM-DD",
--     "provider": "string"
--   }
-- }
