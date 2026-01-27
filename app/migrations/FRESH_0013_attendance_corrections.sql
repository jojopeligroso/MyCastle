-- Migration: FRESH_0013_attendance_corrections.sql
-- Purpose: Add attendance_corrections table for tracking correction requests and approvals
-- Date: 2026-01-27
-- Ref: Task 1.4.3 - Implement Attendance Correction Flow

-- =====================================================================
-- Attendance Corrections Table
-- =====================================================================
-- Tracks attendance correction requests that require admin approval
-- Maintains audit trail of original → corrected values

CREATE TABLE IF NOT EXISTS attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- References
  attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  class_session_id UUID NOT NULL REFERENCES class_sessions(id),
  student_id UUID NOT NULL REFERENCES users(id),

  -- Original values (snapshot at time of correction request)
  original_status VARCHAR(50) NOT NULL,
  original_notes TEXT,
  original_minutes_late INTEGER DEFAULT 0,
  original_minutes_left_early INTEGER DEFAULT 0,

  -- Corrected values (what should be changed to)
  corrected_status VARCHAR(50) NOT NULL,
  corrected_notes TEXT,
  corrected_minutes_late INTEGER DEFAULT 0,
  corrected_minutes_left_early INTEGER DEFAULT 0,

  -- Request details
  reason TEXT NOT NULL, -- Why correction is needed
  requested_by UUID NOT NULL REFERENCES users(id), -- Teacher/admin who requested
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Review/approval details
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES users(id), -- Admin who reviewed
  reviewed_at TIMESTAMP,
  review_notes TEXT, -- Admin's notes on approval/rejection

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- Indexes
-- =====================================================================
CREATE INDEX idx_corrections_tenant ON attendance_corrections(tenant_id);
CREATE INDEX idx_corrections_attendance ON attendance_corrections(attendance_id);
CREATE INDEX idx_corrections_session ON attendance_corrections(class_session_id);
CREATE INDEX idx_corrections_student ON attendance_corrections(student_id);
CREATE INDEX idx_corrections_status ON attendance_corrections(status);
CREATE INDEX idx_corrections_requested_by ON attendance_corrections(requested_by);
CREATE INDEX idx_corrections_reviewed_by ON attendance_corrections(reviewed_by);

-- Composite index for pending corrections by session
CREATE INDEX idx_corrections_pending_session ON attendance_corrections(class_session_id, status)
  WHERE status = 'pending';

-- =====================================================================
-- RLS Policies
-- =====================================================================
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;

-- Admin full access within their tenant
CREATE POLICY admin_corrections_full_access ON attendance_corrections
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Teachers can view their own correction requests
CREATE POLICY teacher_corrections_own ON attendance_corrections
  FOR SELECT
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND requested_by = current_setting('app.user_id', true)::uuid
  );

-- Teachers can insert correction requests
CREATE POLICY teacher_corrections_insert ON attendance_corrections
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND requested_by = current_setting('app.user_id', true)::uuid
  );

-- =====================================================================
-- Comments
-- =====================================================================
COMMENT ON TABLE attendance_corrections IS 'Tracks attendance correction requests with admin approval workflow';
COMMENT ON COLUMN attendance_corrections.reason IS 'Explanation for why correction is needed (required)';
COMMENT ON COLUMN attendance_corrections.status IS 'Workflow status: pending, approved, rejected';
COMMENT ON COLUMN attendance_corrections.reviewed_by IS 'Admin who approved or rejected the correction';
