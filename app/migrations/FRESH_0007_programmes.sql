-- ============================================================================
-- MyCastle Fresh Schema Migration 0007
-- Programmes and Programme Courses (Resolves courses table conflict)
-- Date: 2026-01-19
-- Ref: app/src/db/schema/programmes.ts
-- ============================================================================

-- IMPORTANT: This migration resolves the "courses" table naming conflict.
--
-- CONFLICT EXPLANATION:
-- - FRESH_0001 created a "courses" table for BOOKING/CATALOG purposes (course offerings for sale)
-- - programmes.ts schema defines another "courses" table for ACADEMIC purposes (courses within programmes)
--
-- RESOLUTION:
-- - Keep existing "courses" table from FRESH_0001 (booking catalog)
-- - Create "programmes" table for academic programmes
-- - Create "programme_courses" table for courses within programmes (RENAMED to avoid conflict)
-- - Update TypeScript schema to use "programme_courses" instead of "courses"

-- Run this AFTER FRESH_0001 through FRESH_0006.

-- ============================================================================
-- PART 1: Programmes
-- ============================================================================

CREATE TABLE programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Programme Info
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,

  -- CEFR Levels (array of strings stored as JSONB: ["A1", "A2", "B1", ...])
  levels JSONB NOT NULL DEFAULT '["A1", "A2", "B1", "B2", "C1", "C2"]',

  -- Duration
  duration_weeks INTEGER NOT NULL DEFAULT 12,
  hours_per_week INTEGER NOT NULL DEFAULT 15,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  -- Metadata (flexible storage for programme-specific data)
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP -- Soft delete
);

CREATE UNIQUE INDEX uk_programmes_tenant_code ON programmes(tenant_id, code);
CREATE INDEX idx_programmes_tenant ON programmes(tenant_id);
CREATE INDEX idx_programmes_status ON programmes(status);
CREATE INDEX idx_programmes_deleted ON programmes(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- PART 2: Programme Courses (RENAMED from "courses" to avoid conflict)
-- ============================================================================

CREATE TABLE programme_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,

  -- Course Info
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,

  -- CEFR Mapping (single level per course)
  cefr_level VARCHAR(2) NOT NULL CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),

  -- Syllabus
  syllabus_url VARCHAR(500),
  syllabus_version VARCHAR(20),

  -- Schedule
  hours_per_week INTEGER NOT NULL DEFAULT 15,
  duration_weeks INTEGER NOT NULL DEFAULT 12,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  -- Metadata (flexible storage for course-specific data)
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP -- Soft delete
);

CREATE UNIQUE INDEX uk_programme_courses_tenant_code ON programme_courses(tenant_id, code);
CREATE INDEX idx_programme_courses_tenant ON programme_courses(tenant_id);
CREATE INDEX idx_programme_courses_programme ON programme_courses(programme_id);
CREATE INDEX idx_programme_courses_cefr ON programme_courses(cefr_level);
CREATE INDEX idx_programme_courses_status ON programme_courses(status);
CREATE INDEX idx_programme_courses_deleted ON programme_courses(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- PART 3: Triggers
-- ============================================================================

CREATE TRIGGER trigger_programmes_updated_at
  BEFORE UPDATE ON programmes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_programme_courses_updated_at
  BEFORE UPDATE ON programme_courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PART 4: Comments (Documentation)
-- ============================================================================

COMMENT ON TABLE programmes IS 'Academic programmes offered by the school (e.g., General English, Business English, IELTS Prep)';
COMMENT ON TABLE programme_courses IS 'Individual courses within programmes (e.g., "General English - B1"). RENAMED from "courses" to avoid conflict with booking catalog courses table.';

COMMENT ON COLUMN programmes.levels IS 'JSONB array of CEFR levels offered in this programme';
COMMENT ON COLUMN programmes.duration_weeks IS 'Standard duration of the programme in weeks';
COMMENT ON COLUMN programme_courses.cefr_level IS 'Single CEFR level for this course (A1, A2, B1, B2, C1, C2)';
COMMENT ON COLUMN programme_courses.syllabus_url IS 'URL to syllabus document (e.g., Supabase Storage)';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration FRESH_0007 completed successfully!';
  RAISE NOTICE 'Created tables: programmes, programme_courses';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT - ACTION REQUIRED:';
  RAISE NOTICE '1. Update app/src/db/schema/programmes.ts:';
  RAISE NOTICE '   - Rename "courses" table to "programme_courses"';
  RAISE NOTICE '   - Update all references in academic.ts and other files';
  RAISE NOTICE '2. Search codebase for imports from programmes.ts and update';
  RAISE NOTICE '3. Run npm run db:generate to regenerate TypeScript types';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary of courses tables:';
  RAISE NOTICE '- courses (FRESH_0001): Booking/catalog courses for sale';
  RAISE NOTICE '- programme_courses (FRESH_0007): Academic courses within programmes';
END $$;
