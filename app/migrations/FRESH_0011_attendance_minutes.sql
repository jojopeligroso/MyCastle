-- ============================================================================
-- MyCastle Fresh Schema Migration 0011
-- Attendance Minutes Tracking: Late arrival and early departure tracking
-- Date: 2026-01-20
-- Ref: app/src/db/schema/academic.ts
-- ============================================================================

-- NOTE: This migration extends the attendance table to support:
-- 1. Numeric minutes tracking for late arrivals and early departures
-- 2. New 'late_absent' status (>16 minutes late = absent for attendance %, present for fire safety)
-- 3. Infrastructure for cumulative lateness policies (programme-specific configuration)
--
-- Run this AFTER FRESH_0010_rls_context_function.sql

-- ============================================================================
-- PART 1: Add Minutes Tracking Fields
-- ============================================================================

-- Add columns for tracking minutes late and left early
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS minutes_late INTEGER DEFAULT 0
    CHECK (minutes_late >= 0 AND minutes_late <= 89),
  ADD COLUMN IF NOT EXISTS minutes_left_early INTEGER DEFAULT 0
    CHECK (minutes_left_early >= 0 AND minutes_left_early <= 89);

-- Add comments to document the fields
COMMENT ON COLUMN attendance.minutes_late IS
  'Number of minutes the student arrived late (0-89). Max 89 because classes are max 90 minutes.';

COMMENT ON COLUMN attendance.minutes_left_early IS
  'Number of minutes the student left early (0-89). Max 89 because classes are max 90 minutes.';

-- Update status column comment to document late_absent status
COMMENT ON COLUMN attendance.status IS
  'Attendance status: present, absent, late, excused, late_absent.
   late_absent = student arrived >16 minutes late (present for fire safety register, absent for attendance rate calculation)';

-- ============================================================================
-- PART 2: Add Programme Link to Classes
-- ============================================================================

-- Add optional programme_id to classes table to support programme-specific policies
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS programme_id UUID
    REFERENCES programmes(id) ON DELETE SET NULL;

-- Create index for efficient programme lookups
CREATE INDEX IF NOT EXISTS idx_classes_programme
  ON classes(programme_id);

COMMENT ON COLUMN classes.programme_id IS
  'Optional link to programmes table. Used for programme-specific attendance policies and curriculum tracking.';

-- ============================================================================
-- PART 3: Create Index for Weekly Aggregation
-- ============================================================================

-- Index to support efficient weekly cumulative lateness queries
-- Enables fast lookups when calculating "total minutes late this week" per student
CREATE INDEX IF NOT EXISTS idx_attendance_student_date
  ON attendance(student_id, recorded_at);

COMMENT ON INDEX idx_attendance_student_date IS
  'Supports efficient weekly cumulative lateness queries grouped by student and date range';

-- ============================================================================
-- PART 4: Verification Queries
-- ============================================================================

-- Verify the migration applied correctly
DO $$
BEGIN
  -- Check that new columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'minutes_late'
  ) THEN
    RAISE EXCEPTION 'Migration failed: minutes_late column not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'minutes_left_early'
  ) THEN
    RAISE EXCEPTION 'Migration failed: minutes_left_early column not found';
  END IF;

  -- Check that classes.programme_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'programme_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: classes.programme_id column not found';
  END IF;

  -- Check that attendance index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'attendance' AND indexname = 'idx_attendance_student_date'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_attendance_student_date index not found';
  END IF;

  -- Check that classes index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'classes' AND indexname = 'idx_classes_programme'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_classes_programme index not found';
  END IF;

  RAISE NOTICE 'Migration FRESH_0011 applied successfully';
END $$;

-- ============================================================================
-- PART 5: Notes for Application Layer
-- ============================================================================

-- Programme Configuration (stored in programmes.metadata JSONB):
-- {
--   "cumulativeLatenessEnabled": boolean,     // Default: false
--   "latenessThresholdMinutes": number,       // Default: 15
--   "lateAbsentThresholdMinutes": number      // Default: 17
-- }
--
-- Business Rules:
-- 1. 0-16 minutes late: status='late', minutes_late=X
-- 2. >16 minutes late: status='late_absent', minutes_late=X
-- 3. Cumulative lateness = SUM(minutes_late + minutes_left_early) per week
-- 4. Week defined as: Monday 00:00 - Sunday 23:59 (calendar week)
-- 5. Absence equivalents = FLOOR(cumulative_minutes / threshold_minutes)
-- 6. late_absent records DO NOT count toward cumulative (student already marked absent)
--
-- Example Query (Weekly Cumulative for a Student):
--
-- SELECT
--   student_id,
--   SUM(minutes_late + minutes_left_early) as cumulative_minutes
-- FROM attendance
-- JOIN class_sessions ON class_sessions.id = attendance.class_session_id
-- WHERE
--   student_id = $1
--   AND class_id = $2
--   AND session_date >= DATE_TRUNC('week', $3::date)
--   AND session_date < DATE_TRUNC('week', $3::date) + INTERVAL '7 days'
--   AND status IN ('present', 'late', 'excused')  -- Exclude late_absent
-- GROUP BY student_id;

-- ============================================================================
-- End of Migration FRESH_0011
-- ============================================================================
