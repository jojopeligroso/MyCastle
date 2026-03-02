-- FRESH_0030_lesson_planner.sql
-- Adds DoS approval workflow and Speakout context to lesson_plans table
-- Ref: ESL Lesson Planner Implementation Plan

-- Add approval workflow columns
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20)
  DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending_approval', 'approved', 'rejected'));
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMP;
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS approval_comments TEXT;

-- Add Speakout context columns for RAG
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS speakout_book VARCHAR(255);
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS speakout_unit VARCHAR(50);
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS speakout_lesson VARCHAR(255);
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS teacher_intent VARCHAR(20)
  CHECK (teacher_intent IN ('follow', 'deviate', 'supplement'));

-- Add index for approval status queries
CREATE INDEX IF NOT EXISTS idx_plans_approval_status ON lesson_plans(approval_status);

-- Add comments for documentation
COMMENT ON COLUMN lesson_plans.approval_status IS 'DoS approval workflow status: draft, pending_approval, approved, rejected';
COMMENT ON COLUMN lesson_plans.submitted_for_approval_at IS 'Timestamp when lesson was submitted for DoS approval';
COMMENT ON COLUMN lesson_plans.approved_by IS 'User ID of DoS who approved/rejected the lesson';
COMMENT ON COLUMN lesson_plans.approved_at IS 'Timestamp when lesson was approved/rejected';
COMMENT ON COLUMN lesson_plans.approval_comments IS 'DoS feedback or comments on approval decision';
COMMENT ON COLUMN lesson_plans.speakout_book IS 'Speakout textbook used as RAG context (e.g., "Speakout Pre-intermediate 2nd edition")';
COMMENT ON COLUMN lesson_plans.speakout_unit IS 'Speakout unit reference (e.g., "Unit 1")';
COMMENT ON COLUMN lesson_plans.speakout_lesson IS 'Speakout lesson title (e.g., "Feeling good")';
COMMENT ON COLUMN lesson_plans.teacher_intent IS 'How teacher intends to use Speakout: follow, deviate, or supplement';
