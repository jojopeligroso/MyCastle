-- ============================================================================
-- MyCastle Fresh Schema Migration 0006
-- Curriculum Tables: CEFR Descriptors, Lesson Plans, Materials
-- Date: 2026-01-19
-- Ref: app/src/db/schema/curriculum.ts
-- ============================================================================

-- NOTE: This migration creates curriculum and teaching resource tables.
-- Run this AFTER FRESH_0001, FRESH_0002, FRESH_0003, FRESH_0004, and FRESH_0005.

-- ============================================================================
-- PART 1: CEFR Descriptors
-- ============================================================================

CREATE TABLE cefr_descriptors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  level VARCHAR(2) NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  category VARCHAR(100) NOT NULL, -- e.g., "Reading", "Speaking", "Writing", "Listening"
  subcategory VARCHAR(100), -- e.g., "Overall reading comprehension", "Spoken interaction"

  descriptor_text TEXT NOT NULL, -- The actual CEFR descriptor content

  metadata JSONB DEFAULT '{}', -- Additional context, examples, references

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cefr_level ON cefr_descriptors(level);
CREATE INDEX idx_cefr_category ON cefr_descriptors(category);
CREATE INDEX idx_cefr_level_category ON cefr_descriptors(level, category);

-- ============================================================================
-- PART 2: Lesson Plans
-- ============================================================================

CREATE TABLE lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Association
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- CEFR alignment
  cefr_level VARCHAR(2) NOT NULL CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  descriptor_id UUID REFERENCES cefr_descriptors(id) ON DELETE SET NULL,

  -- Content
  title VARCHAR(255) NOT NULL,
  topic VARCHAR(255),
  duration_minutes VARCHAR(50), -- e.g., "60", "90", "45-60"

  -- Structured plan (JSON)
  json_plan JSONB NOT NULL, -- {objectives: [], activities: [], materials: [], timings: [], assessment: {}}

  -- Generation metadata (for AI-generated plans)
  is_ai_generated VARCHAR(10) DEFAULT 'false' CHECK (is_ai_generated IN ('true', 'false')),
  generation_prompt TEXT, -- For audit/reproducibility
  cache_key VARCHAR(64), -- SHA256 hash for deduplication

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_tenant ON lesson_plans(tenant_id);
CREATE INDEX idx_plans_class ON lesson_plans(class_id);
CREATE INDEX idx_plans_teacher ON lesson_plans(teacher_id);
CREATE INDEX idx_plans_cefr ON lesson_plans(cefr_level);
CREATE INDEX idx_plans_status ON lesson_plans(tenant_id, status);
CREATE INDEX idx_plans_cache_key ON lesson_plans(cache_key) WHERE cache_key IS NOT NULL;

-- ============================================================================
-- PART 3: Materials
-- ============================================================================

CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('document', 'video', 'audio', 'link', 'image', 'other')),

  -- Storage
  file_url VARCHAR(500), -- Supabase Storage path or external URL
  file_size VARCHAR(50), -- File size in bytes (stored as string)
  mime_type VARCHAR(100), -- e.g., "application/pdf", "video/mp4"

  -- Categorization
  cefr_level VARCHAR(2) CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')), -- Optional
  tags JSONB, -- Array of strings for searchability ["grammar", "vocabulary", "speaking"]
  subject VARCHAR(100), -- e.g., "General English", "Business English"

  -- Access control
  visibility VARCHAR(50) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'tenant', 'public')),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_materials_tenant ON materials(tenant_id);
CREATE INDEX idx_materials_cefr ON materials(cefr_level) WHERE cefr_level IS NOT NULL;
CREATE INDEX idx_materials_type ON materials(type);
CREATE INDEX idx_materials_visibility ON materials(tenant_id, visibility);
CREATE INDEX idx_materials_uploaded_by ON materials(uploaded_by);

-- ============================================================================
-- PART 4: Lesson Plan Materials (Join Table)
-- ============================================================================

CREATE TABLE lesson_plan_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lesson_plan_materials_plan ON lesson_plan_materials(lesson_plan_id);
CREATE INDEX idx_lesson_plan_materials_material ON lesson_plan_materials(material_id);
CREATE UNIQUE INDEX idx_lesson_plan_materials_unique ON lesson_plan_materials(lesson_plan_id, material_id);

-- ============================================================================
-- PART 5: Triggers
-- ============================================================================

-- Apply updated_at trigger to tables
CREATE TRIGGER trigger_cefr_descriptors_updated_at
  BEFORE UPDATE ON cefr_descriptors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_lesson_plans_updated_at
  BEFORE UPDATE ON lesson_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PART 6: Comments (Documentation)
-- ============================================================================

COMMENT ON TABLE cefr_descriptors IS 'Common European Framework of Reference (CEFR) level descriptors A1-C2';
COMMENT ON TABLE lesson_plans IS 'AI-generated and teacher-created lesson plans with CEFR alignment';
COMMENT ON TABLE materials IS 'Teaching materials and resources library';
COMMENT ON TABLE lesson_plan_materials IS 'Many-to-many join table linking lesson plans with materials';

COMMENT ON COLUMN cefr_descriptors.level IS 'CEFR level: A1, A2, B1, B2, C1, C2';
COMMENT ON COLUMN cefr_descriptors.category IS 'Skill category: Reading, Writing, Speaking, Listening, etc.';
COMMENT ON COLUMN lesson_plans.json_plan IS 'Structured lesson plan: objectives, activities, materials, timings, assessment';
COMMENT ON COLUMN lesson_plans.is_ai_generated IS 'Whether this plan was generated by AI (true/false as string)';
COMMENT ON COLUMN lesson_plans.cache_key IS 'SHA256 hash for deduplicating identical lesson plans';
COMMENT ON COLUMN materials.visibility IS 'Access level: private (teacher only), tenant (school-wide), public';
COMMENT ON COLUMN materials.tags IS 'JSONB array of tags for search/filtering';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration FRESH_0006 completed successfully!';
  RAISE NOTICE 'Created tables: cefr_descriptors, lesson_plans, materials, lesson_plan_materials';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run npm run db:generate to regenerate TypeScript types';
  RAISE NOTICE '2. Run npm run seed:cefr to populate CEFR descriptors (seed script available)';
  RAISE NOTICE '3. Create FRESH_0007_programmes.sql to resolve courses table conflict';
  RAISE NOTICE '4. Create FRESH_0008_rls_additional.sql for RLS policies on new tables';
END $$;
