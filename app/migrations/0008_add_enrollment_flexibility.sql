-- Migration 0008: Add Enrollment Flexibility
-- Created: 2025-01-23
-- Description: Adds support for flexible enrollment durations and amendments
-- Ref: Student Registry - Business requirement for flexible course durations

-- ============================================================================
-- EXTEND ENROLLMENTS TABLE
-- ============================================================================

-- Add flexible duration fields
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS expected_end_date DATE;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS booked_weeks INTEGER;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS original_course_id UUID REFERENCES courses(id);

-- Add tracking fields
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS extensions_count INTEGER DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS is_amended BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN enrollments.expected_end_date IS 'Expected/booked end date for this enrollment (can differ from class end_date)';
COMMENT ON COLUMN enrollments.booked_weeks IS 'Number of weeks booked by student (can differ from course standard duration)';
COMMENT ON COLUMN enrollments.original_course_id IS 'Reference to the course this enrollment is based on';
COMMENT ON COLUMN enrollments.extensions_count IS 'Number of times enrollment has been extended';
COMMENT ON COLUMN enrollments.is_amended IS 'Whether enrollment has been modified from original booking';

-- ============================================================================
-- CREATE ENROLLMENT AMENDMENTS TABLE
-- ============================================================================

CREATE TABLE enrollment_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,

  -- Amendment details
  amendment_type VARCHAR(50) NOT NULL, -- extension, reduction, transfer, level_change
  amendment_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Previous values (for audit trail)
  previous_end_date DATE,
  previous_weeks INTEGER,
  previous_class_id UUID REFERENCES classes(id),

  -- New values
  new_end_date DATE,
  new_weeks INTEGER,
  new_class_id UUID REFERENCES classes(id),

  -- Financial impact
  fee_adjustment DECIMAL(10,2), -- Positive for additional fees, negative for refunds

  -- Reason and approval
  reason TEXT,
  requested_by UUID REFERENCES users(id), -- Who requested the amendment
  approved_by UUID REFERENCES users(id), -- Admin who approved
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  CONSTRAINT check_amendment_type CHECK (
    amendment_type IN ('extension', 'reduction', 'transfer', 'level_change', 'cancellation')
  )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_enrollment_amendments_enrollment ON enrollment_amendments(enrollment_id);
CREATE INDEX idx_enrollment_amendments_tenant ON enrollment_amendments(tenant_id);
CREATE INDEX idx_enrollment_amendments_status ON enrollment_amendments(status);
CREATE INDEX idx_enrollment_amendments_type ON enrollment_amendments(amendment_type);
CREATE INDEX idx_enrollment_amendments_date ON enrollment_amendments(amendment_date);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE enrollment_amendments ENABLE ROW LEVEL SECURITY;

-- Admins can view all amendments in their tenant
CREATE POLICY enrollment_amendments_select_admin ON enrollment_amendments
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') IN ('admin', 'super_admin')
  );

-- Students can view their own enrollment amendments
CREATE POLICY enrollment_amendments_select_student ON enrollment_amendments
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND enrollment_id IN (
      SELECT id FROM enrollments
      WHERE student_id = current_setting('app.current_user_id')::uuid
    )
  );

-- Only admins can create amendments
CREATE POLICY enrollment_amendments_insert_admin ON enrollment_amendments
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') IN ('admin', 'super_admin')
  );

-- Only admins can update amendments
CREATE POLICY enrollment_amendments_update_admin ON enrollment_amendments
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') IN ('admin', 'super_admin')
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update is_amended flag when amendment is approved
CREATE OR REPLACE FUNCTION update_enrollment_amended_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Update the enrollment
    UPDATE enrollments
    SET
      is_amended = TRUE,
      expected_end_date = COALESCE(NEW.new_end_date, expected_end_date),
      booked_weeks = COALESCE(NEW.new_weeks, booked_weeks),
      class_id = COALESCE(NEW.new_class_id, class_id),
      extensions_count = CASE
        WHEN NEW.amendment_type = 'extension' THEN extensions_count + 1
        ELSE extensions_count
      END,
      updated_at = NOW()
    WHERE id = NEW.enrollment_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrollment_amendment_approved
  AFTER UPDATE ON enrollment_amendments
  FOR EACH ROW
  EXECUTE FUNCTION update_enrollment_amended_status();

-- ============================================================================
-- DATA MIGRATION
-- ============================================================================

-- For existing enrollments, set expected_end_date based on class end_date
UPDATE enrollments e
SET
  expected_end_date = c.end_date,
  booked_weeks = EXTRACT(EPOCH FROM (c.end_date - c.start_date)) / (7 * 24 * 60 * 60)
FROM classes c
WHERE e.class_id = c.id
  AND e.expected_end_date IS NULL
  AND c.end_date IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE enrollment_amendments IS 'Tracks all amendments to enrollments (extensions, reductions, transfers)';
COMMENT ON COLUMN enrollment_amendments.amendment_type IS 'Type of change: extension (add weeks), reduction (remove weeks), transfer (change class), level_change (change CEFR level), cancellation';
COMMENT ON COLUMN enrollment_amendments.fee_adjustment IS 'Financial impact of amendment - positive for additional fees, negative for refunds';
COMMENT ON COLUMN enrollment_amendments.status IS 'Approval status: pending (awaiting approval), approved (applied), rejected (denied)';
