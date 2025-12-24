-- Migration 0004: Add Programmes Table
-- Created: 2025-01-XX
-- Description: Creates the programmes table for academic programme management
-- Ref: DATABASE_SCHEMA_GAPS.md §1, Student Registry Implementation Plan

-- ============================================================================
-- PROGRAMMES TABLE
-- ============================================================================

CREATE TABLE programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Programme Info
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,

  -- CEFR Levels supported by this programme (array stored as JSONB)
  levels JSONB NOT NULL DEFAULT '["A1", "A2", "B1", "B2", "C1", "C2"]'::jsonb,

  -- Duration
  duration_weeks INTEGER NOT NULL DEFAULT 12,
  hours_per_week INTEGER NOT NULL DEFAULT 15,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, archived

  -- Metadata (flexible storage for programme-specific data)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP, -- Soft delete

  -- Constraints
  CONSTRAINT uk_programmes_tenant_code UNIQUE(tenant_id, code)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_programmes_tenant ON programmes(tenant_id);
CREATE INDEX idx_programmes_status ON programmes(status);
CREATE INDEX idx_programmes_deleted ON programmes(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE programmes IS 'Academic programmes offered by the school';
COMMENT ON COLUMN programmes.levels IS 'Array of CEFR levels covered by this programme';
COMMENT ON COLUMN programmes.duration_weeks IS 'Standard programme duration in weeks';
COMMENT ON COLUMN programmes.hours_per_week IS 'Contact hours per week';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view programmes in their tenant
CREATE POLICY programmes_select_tenant ON programmes
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Only admins can create programmes
CREATE POLICY programmes_insert_admin ON programmes
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') IN ('admin', 'super_admin')
  );

-- Only admins can update programmes
CREATE POLICY programmes_update_admin ON programmes
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') IN ('admin', 'super_admin')
  );

-- Only admins can delete programmes (soft delete preferred)
CREATE POLICY programmes_delete_admin ON programmes
  FOR DELETE
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') IN ('admin', 'super_admin')
  );

-- ============================================================================
-- SAMPLE DATA (for testing and development)
-- ============================================================================

-- Insert sample programmes for the first tenant (adjust tenant_id as needed)
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get the first tenant ID (or create logic to get correct tenant)
  SELECT id INTO v_tenant_id FROM tenants ORDER BY created_at LIMIT 1;

  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO programmes (tenant_id, name, code, description, duration_weeks, hours_per_week, levels) VALUES
      (v_tenant_id, 'General English', 'GE', 'General English programme covering all CEFR levels from beginner to advanced', 12, 15, '["A1", "A2", "B1", "B2", "C1", "C2"]'::jsonb),
      (v_tenant_id, 'Business English', 'BE', 'Specialized Business English programme for professionals', 10, 12, '["B1", "B2", "C1"]'::jsonb),
      (v_tenant_id, 'Exam Preparation', 'EXAM', 'IELTS, Cambridge, and TOEFL exam preparation courses', 8, 20, '["B1", "B2", "C1"]'::jsonb),
      (v_tenant_id, 'Academic English', 'AE', 'English for Academic Purposes - university preparation', 12, 15, '["B2", "C1", "C2"]'::jsonb),
      (v_tenant_id, 'Intensive English', 'IE', 'Fast-track intensive programme', 6, 25, '["A1", "A2", "B1", "B2", "C1", "C2"]'::jsonb);
  END IF;
END $$;
