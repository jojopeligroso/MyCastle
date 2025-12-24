-- Migration 0005: Add Courses Table
-- Created: 2025-01-XX
-- Description: Creates the courses table for individual courses within programmes
-- Ref: DATABASE_SCHEMA_GAPS.md §2, Student Registry Implementation Plan

-- ============================================================================
-- COURSES TABLE
-- ============================================================================

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,

  -- Course Info
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,

  -- CEFR Mapping
  cefr_level VARCHAR(2) NOT NULL, -- A1, A2, B1, B2, C1, C2

  -- Syllabus
  syllabus_url VARCHAR(500),
  syllabus_version VARCHAR(20),

  -- Schedule
  hours_per_week INTEGER NOT NULL DEFAULT 15,
  duration_weeks INTEGER NOT NULL DEFAULT 12,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, archived

  -- Metadata (flexible storage for course-specific data)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP, -- Soft delete

  -- Constraints
  CONSTRAINT uk_courses_tenant_code UNIQUE(tenant_id, code),
  CONSTRAINT check_cefr_level CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_courses_tenant ON courses(tenant_id);
CREATE INDEX idx_courses_programme ON courses(programme_id);
CREATE INDEX idx_courses_cefr ON courses(cefr_level);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_deleted ON courses(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE courses IS 'Individual courses within academic programmes';
COMMENT ON COLUMN courses.cefr_level IS 'CEFR level this course is designed for';
COMMENT ON COLUMN courses.syllabus_url IS 'URL to syllabus document (PDF, Google Doc, etc.)';
COMMENT ON COLUMN courses.syllabus_version IS 'Version identifier for syllabus tracking';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view courses in their tenant
CREATE POLICY courses_select_tenant ON courses
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Only admins can create courses
CREATE POLICY courses_insert_admin ON courses
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') IN ('admin', 'super_admin')
  );

-- Only admins can update courses
CREATE POLICY courses_update_admin ON courses
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') IN ('admin', 'super_admin')
  );

-- Only admins can delete courses
CREATE POLICY courses_delete_admin ON courses
  FOR DELETE
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') IN ('admin', 'super_admin')
  );

-- ============================================================================
-- SAMPLE DATA (for testing and development)
-- ============================================================================

-- Create courses for each CEFR level within each programme
DO $$
DECLARE
  prog RECORD;
  level TEXT;
BEGIN
  -- Loop through all active programmes
  FOR prog IN SELECT id, tenant_id, code, name, duration_weeks, hours_per_week FROM programmes WHERE status = 'active'
  LOOP
    -- General English - all levels
    IF prog.code = 'GE' THEN
      FOREACH level IN ARRAY ARRAY['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
      LOOP
        INSERT INTO courses (tenant_id, programme_id, name, code, cefr_level, duration_weeks, hours_per_week, description)
        VALUES (
          prog.tenant_id,
          prog.id,
          prog.name || ' - ' || level,
          prog.code || '-' || level,
          level,
          prog.duration_weeks,
          prog.hours_per_week,
          'General English course designed for CEFR level ' || level
        );
      END LOOP;

    -- Business English - B1, B2, C1 only
    ELSIF prog.code = 'BE' THEN
      FOREACH level IN ARRAY ARRAY['B1', 'B2', 'C1']
      LOOP
        INSERT INTO courses (tenant_id, programme_id, name, code, cefr_level, duration_weeks, hours_per_week, description)
        VALUES (
          prog.tenant_id,
          prog.id,
          prog.name || ' - ' || level,
          prog.code || '-' || level,
          level,
          prog.duration_weeks,
          prog.hours_per_week,
          'Business English course for professionals at CEFR level ' || level
        );
      END LOOP;

    -- Exam Preparation - B1, B2, C1 only
    ELSIF prog.code = 'EXAM' THEN
      FOREACH level IN ARRAY ARRAY['B1', 'B2', 'C1']
      LOOP
        INSERT INTO courses (tenant_id, programme_id, name, code, cefr_level, duration_weeks, hours_per_week, description)
        VALUES (
          prog.tenant_id,
          prog.id,
          prog.name || ' - ' || level,
          prog.code || '-' || level,
          level,
          prog.duration_weeks,
          prog.hours_per_week,
          'Exam preparation (IELTS, Cambridge, TOEFL) for CEFR level ' || level
        );
      END LOOP;

    -- Academic English - B2, C1, C2 only
    ELSIF prog.code = 'AE' THEN
      FOREACH level IN ARRAY ARRAY['B2', 'C1', 'C2']
      LOOP
        INSERT INTO courses (tenant_id, programme_id, name, code, cefr_level, duration_weeks, hours_per_week, description)
        VALUES (
          prog.tenant_id,
          prog.id,
          prog.name || ' - ' || level,
          prog.code || '-' || level,
          level,
          prog.duration_weeks,
          prog.hours_per_week,
          'Academic English for university preparation at CEFR level ' || level
        );
      END LOOP;

    -- Intensive English - all levels
    ELSIF prog.code = 'IE' THEN
      FOREACH level IN ARRAY ARRAY['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
      LOOP
        INSERT INTO courses (tenant_id, programme_id, name, code, cefr_level, duration_weeks, hours_per_week, description)
        VALUES (
          prog.tenant_id,
          prog.id,
          prog.name || ' - ' || level,
          prog.code || '-' || level,
          level,
          prog.duration_weeks,
          prog.hours_per_week,
          'Intensive fast-track course for CEFR level ' || level
        );
      END LOOP;
    END IF;
  END LOOP;
END $$;
