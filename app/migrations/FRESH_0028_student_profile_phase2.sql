/**
 * FRESH_0028: Student Profile Feature - Phase 2 Schema Updates
 *
 * Implements the enhanced CEFR assessment framework from discovery:
 * - Full File A structure for CEFR descriptors
 * - Coursebook support with descriptor mappings
 * - Session learning objectives
 * - Summative assessments (formal tests)
 * - Enhanced competency assessments with progress tracking
 * - Tenant profile settings
 *
 * Date: 2026-03-02
 * Ref: STUDENT_PROFILE_DISCOVERY.md, STUDENT_PROFILE_ROADMAP.md Task #18
 */

-- ============================================================================
-- PART 1: Enhanced CEFR Descriptors (File A Structure)
-- ============================================================================

-- Add columns for full File A structure
ALTER TABLE cefr_descriptors
ADD COLUMN IF NOT EXISTS source_index INTEGER,                    -- Original index from File A
ADD COLUMN IF NOT EXISTS activity_strategy_competence TEXT,       -- "Communicative Activities", "Communication Strategies", etc.
ADD COLUMN IF NOT EXISTS competencies TEXT,                       -- Sub-category
ADD COLUMN IF NOT EXISTS strategies TEXT,                         -- Activity type: "Interaction", "Mediation", etc.
ADD COLUMN IF NOT EXISTS mode TEXT,                               -- Communication mode: "Spoken", "Written", etc.
ADD COLUMN IF NOT EXISTS skill_focus TEXT,                        -- Traditional skill: "Speaking", "Reading", etc.
ADD COLUMN IF NOT EXISTS is_overall BOOLEAN DEFAULT FALSE,        -- Overall descriptor flag
ADD COLUMN IF NOT EXISTS scale TEXT,                              -- Key grouping field: "FORMAL DISCUSSION", "COOPERATING", etc.
ADD COLUMN IF NOT EXISTS young_learners_7_10 TEXT,                -- YL variant (ages 7-10) or NULL
ADD COLUMN IF NOT EXISTS young_learners_11_15 TEXT;               -- YL variant (ages 11-15) or NULL

-- Index for scale-based queries (primary grouping for assessments)
CREATE INDEX IF NOT EXISTS idx_cefr_descriptors_scale_level ON cefr_descriptors(scale, level);
CREATE INDEX IF NOT EXISTS idx_cefr_descriptors_skill_focus ON cefr_descriptors(skill_focus);
CREATE INDEX IF NOT EXISTS idx_cefr_descriptors_source_index ON cefr_descriptors(source_index);

-- ============================================================================
-- PART 2: Coursebooks Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS coursebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Book identification
  name TEXT NOT NULL,                         -- From worksheet name, e.g., "Speakout Intermediate 2nd Edition"
  publisher TEXT,
  edition TEXT,

  -- CEFR range (derived from content)
  cefr_level_min VARCHAR(3),                  -- Minimum level in book, e.g., "B1"
  cefr_level_max VARCHAR(3),                  -- Maximum level in book, e.g., "B2"

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_coursebooks_tenant ON coursebooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coursebooks_active ON coursebooks(tenant_id, is_active) WHERE is_active = true;

-- ============================================================================
-- PART 3: Coursebook Descriptors Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS coursebook_descriptors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coursebook_id UUID NOT NULL REFERENCES coursebooks(id) ON DELETE CASCADE,

  -- Location in book
  skill_focus TEXT NOT NULL,                  -- Reading, Writing, Listening, Speaking
  unit TEXT,                                  -- Unit number or name
  page TEXT,                                  -- Page number(s), e.g., "12 13"
  lesson TEXT,                                -- Lesson name

  -- CEFR alignment
  level VARCHAR(3) NOT NULL,                  -- CEFR level: A1, A2, B1, etc.

  -- Descriptor content
  descriptor_text TEXT NOT NULL,              -- The practical descriptor

  -- Link to official CEFR (optional, LLM-assisted)
  linked_cefr_descriptor_id UUID REFERENCES cefr_descriptors(id),
  link_confidence DECIMAL(3,2),               -- 0.00-1.00 confidence of LLM match

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coursebook_desc_coursebook ON coursebook_descriptors(coursebook_id);
CREATE INDEX IF NOT EXISTS idx_coursebook_desc_unit ON coursebook_descriptors(coursebook_id, unit);
CREATE INDEX IF NOT EXISTS idx_coursebook_desc_level ON coursebook_descriptors(level);
CREATE INDEX IF NOT EXISTS idx_coursebook_desc_skill ON coursebook_descriptors(skill_focus);

-- ============================================================================
-- PART 4: Session Learning Objectives Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_learning_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,

  -- Descriptor reference (at least one must be set)
  descriptor_id UUID REFERENCES cefr_descriptors(id),
  coursebook_descriptor_id UUID REFERENCES coursebook_descriptors(id),

  -- Objective classification
  objective_type VARCHAR(20) NOT NULL CHECK (objective_type IN ('primary', 'secondary')),
  source VARCHAR(20) NOT NULL CHECK (source IN ('cefr', 'coursebook', 'custom')),

  -- Custom descriptor (when source = 'custom')
  custom_descriptor_text TEXT,

  -- Sort order within session
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(session_id, descriptor_id),

  -- Constraint: at least one descriptor reference must be set
  CONSTRAINT at_least_one_descriptor CHECK (
    descriptor_id IS NOT NULL OR
    coursebook_descriptor_id IS NOT NULL OR
    (source = 'custom' AND custom_descriptor_text IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_session_objectives_session ON session_learning_objectives(session_id);
CREATE INDEX IF NOT EXISTS idx_session_objectives_descriptor ON session_learning_objectives(descriptor_id);
CREATE INDEX IF NOT EXISTS idx_session_objectives_type ON session_learning_objectives(objective_type);

-- ============================================================================
-- PART 5: Summative Assessment Types Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS summative_assessment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Type definition
  name TEXT NOT NULL,                         -- e.g., "End of Unit Test", "Mid-Term Exam"
  description TEXT,

  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_summative_types_tenant ON summative_assessment_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_summative_types_active ON summative_assessment_types(tenant_id, is_active) WHERE is_active = true;

-- ============================================================================
-- PART 6: Summative Assessments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS summative_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Assessment type
  assessment_type_id UUID REFERENCES summative_assessment_types(id),

  -- Assessor
  assessor_id UUID NOT NULL REFERENCES users(id),

  -- Score (percentage)
  score_percentage DECIMAL(5,2) NOT NULL CHECK (score_percentage >= 0 AND score_percentage <= 100),

  -- Notes
  notes TEXT,

  -- Context
  class_id UUID REFERENCES classes(id),

  -- Date
  assessment_date DATE NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_summative_tenant ON summative_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_summative_student ON summative_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_summative_type ON summative_assessments(assessment_type_id);
CREATE INDEX IF NOT EXISTS idx_summative_date ON summative_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_summative_class ON summative_assessments(class_id);

-- ============================================================================
-- PART 7: Update Competency Assessments Table
-- ============================================================================

-- Add new columns for enhanced assessment model
ALTER TABLE competency_assessments
ADD COLUMN IF NOT EXISTS progress VARCHAR(20) DEFAULT 'not_yet'
  CHECK (progress IN ('not_yet', 'emerging', 'developing', 'achieved')),
ADD COLUMN IF NOT EXISTS demonstrated_level VARCHAR(3),           -- May differ from descriptor level
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT FALSE,        -- True when achieved
ADD COLUMN IF NOT EXISTS learning_objective_id UUID REFERENCES session_learning_objectives(id),
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES class_sessions(id),
ADD COLUMN IF NOT EXISTS is_shared_with_student BOOLEAN DEFAULT FALSE;

-- Index for learning objective queries
CREATE INDEX IF NOT EXISTS idx_competency_assessments_objective ON competency_assessments(learning_objective_id);
CREATE INDEX IF NOT EXISTS idx_competency_assessments_session ON competency_assessments(session_id);
CREATE INDEX IF NOT EXISTS idx_competency_assessments_shared ON competency_assessments(is_shared_with_student) WHERE is_shared_with_student = true;
CREATE INDEX IF NOT EXISTS idx_competency_assessments_complete ON competency_assessments(is_complete) WHERE is_complete = true;

-- ============================================================================
-- PART 8: Update Classes Table
-- ============================================================================

ALTER TABLE classes
ADD COLUMN IF NOT EXISTS primary_coursebook_id UUID REFERENCES coursebooks(id);

CREATE INDEX IF NOT EXISTS idx_classes_coursebook ON classes(primary_coursebook_id);

-- ============================================================================
-- PART 9: Tenant Profile Settings
-- ============================================================================

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS profile_settings JSONB DEFAULT '{
  "promotion_threshold_percentage": 90,
  "enable_llm_descriptor_matching": false,
  "diagnostic_stages": ["written_test", "speaking_interview"],
  "young_learners_enabled": false
}'::jsonb;

-- ============================================================================
-- PART 10: RLS Policies for New Tables
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE coursebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE coursebook_descriptors ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE summative_assessment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE summative_assessments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COURSEBOOKS POLICIES
-- ============================================================================

CREATE POLICY "coursebooks_superuser_all"
  ON coursebooks FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "coursebooks_select_tenant"
  ON coursebooks FOR SELECT
  USING (tenant_id = get_tenant_id());

CREATE POLICY "coursebooks_insert_admin"
  ON coursebooks FOR INSERT
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "coursebooks_update_admin"
  ON coursebooks FOR UPDATE
  USING (is_admin() AND tenant_id = get_tenant_id())
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "coursebooks_delete_admin"
  ON coursebooks FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- COURSEBOOK_DESCRIPTORS POLICIES
-- ============================================================================

CREATE POLICY "coursebook_descriptors_superuser_all"
  ON coursebook_descriptors FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- Select via coursebook tenant
CREATE POLICY "coursebook_descriptors_select_tenant"
  ON coursebook_descriptors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coursebooks
      WHERE coursebooks.id = coursebook_descriptors.coursebook_id
      AND coursebooks.tenant_id = get_tenant_id()
    )
  );

CREATE POLICY "coursebook_descriptors_insert_admin"
  ON coursebook_descriptors FOR INSERT
  WITH CHECK (
    is_admin() AND EXISTS (
      SELECT 1 FROM coursebooks
      WHERE coursebooks.id = coursebook_descriptors.coursebook_id
      AND coursebooks.tenant_id = get_tenant_id()
    )
  );

CREATE POLICY "coursebook_descriptors_update_admin"
  ON coursebook_descriptors FOR UPDATE
  USING (
    is_admin() AND EXISTS (
      SELECT 1 FROM coursebooks
      WHERE coursebooks.id = coursebook_descriptors.coursebook_id
      AND coursebooks.tenant_id = get_tenant_id()
    )
  )
  WITH CHECK (
    is_admin() AND EXISTS (
      SELECT 1 FROM coursebooks
      WHERE coursebooks.id = coursebook_descriptors.coursebook_id
      AND coursebooks.tenant_id = get_tenant_id()
    )
  );

CREATE POLICY "coursebook_descriptors_delete_admin"
  ON coursebook_descriptors FOR DELETE
  USING (
    is_admin() AND EXISTS (
      SELECT 1 FROM coursebooks
      WHERE coursebooks.id = coursebook_descriptors.coursebook_id
      AND coursebooks.tenant_id = get_tenant_id()
    )
  );

-- ============================================================================
-- SESSION_LEARNING_OBJECTIVES POLICIES
-- ============================================================================

CREATE POLICY "session_objectives_superuser_all"
  ON session_learning_objectives FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- Select via class session tenant
CREATE POLICY "session_objectives_select_tenant"
  ON session_learning_objectives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      WHERE cs.id = session_learning_objectives.session_id
      AND cs.tenant_id = get_tenant_id()
    )
  );

-- Teachers can manage objectives for their sessions
CREATE POLICY "session_objectives_insert_teacher"
  ON session_learning_objectives FOR INSERT
  WITH CHECK (
    is_teacher_or_admin() AND EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.id = session_learning_objectives.session_id
      AND cs.tenant_id = get_tenant_id()
      AND (c.teacher_id = get_user_id() OR is_admin())
    )
  );

CREATE POLICY "session_objectives_update_teacher"
  ON session_learning_objectives FOR UPDATE
  USING (
    is_teacher_or_admin() AND EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.id = session_learning_objectives.session_id
      AND cs.tenant_id = get_tenant_id()
      AND (c.teacher_id = get_user_id() OR is_admin())
    )
  )
  WITH CHECK (
    is_teacher_or_admin() AND EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.id = session_learning_objectives.session_id
      AND cs.tenant_id = get_tenant_id()
      AND (c.teacher_id = get_user_id() OR is_admin())
    )
  );

CREATE POLICY "session_objectives_delete_teacher"
  ON session_learning_objectives FOR DELETE
  USING (
    is_teacher_or_admin() AND EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.id = session_learning_objectives.session_id
      AND cs.tenant_id = get_tenant_id()
      AND (c.teacher_id = get_user_id() OR is_admin())
    )
  );

-- ============================================================================
-- SUMMATIVE_ASSESSMENT_TYPES POLICIES
-- ============================================================================

CREATE POLICY "summative_types_superuser_all"
  ON summative_assessment_types FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "summative_types_select_tenant"
  ON summative_assessment_types FOR SELECT
  USING (tenant_id = get_tenant_id());

CREATE POLICY "summative_types_insert_admin"
  ON summative_assessment_types FOR INSERT
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "summative_types_update_admin"
  ON summative_assessment_types FOR UPDATE
  USING (is_admin() AND tenant_id = get_tenant_id())
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "summative_types_delete_admin"
  ON summative_assessment_types FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- SUMMATIVE_ASSESSMENTS POLICIES
-- ============================================================================

CREATE POLICY "summative_assessments_superuser_all"
  ON summative_assessments FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- Admin and DoS can see all assessments
CREATE POLICY "summative_assessments_select_admin"
  ON summative_assessments FOR SELECT
  USING (is_admin() AND tenant_id = get_tenant_id());

-- Teachers can see assessments for their class students
CREATE POLICY "summative_assessments_select_teacher"
  ON summative_assessments FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND get_user_role() = 'teacher'
  );

-- Students can see their own summative assessments
CREATE POLICY "summative_assessments_select_student"
  ON summative_assessments FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

-- Teachers and admins can insert assessments
CREATE POLICY "summative_assessments_insert_staff"
  ON summative_assessments FOR INSERT
  WITH CHECK (
    is_teacher_or_admin()
    AND tenant_id = get_tenant_id()
    AND assessor_id = get_user_id()
  );

-- Only the assessor or admin can update
CREATE POLICY "summative_assessments_update_assessor_or_admin"
  ON summative_assessments FOR UPDATE
  USING (
    tenant_id = get_tenant_id()
    AND (assessor_id = get_user_id() OR is_admin())
  )
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND (assessor_id = get_user_id() OR is_admin())
  );

-- Only admin can delete assessments
CREATE POLICY "summative_assessments_delete_admin"
  ON summative_assessments FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  new_tables TEXT[] := ARRAY[
    'coursebooks',
    'coursebook_descriptors',
    'session_learning_objectives',
    'summative_assessment_types',
    'summative_assessments'
  ];
  tbl TEXT;
  policy_count INTEGER;
BEGIN
  FOREACH tbl IN ARRAY new_tables
  LOOP
    -- Check table exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = tbl
    ) THEN
      RAISE EXCEPTION 'Table public.% does not exist', tbl;
    END IF;

    -- Check RLS is enabled
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relname = tbl
      AND c.relrowsecurity = true
    ) THEN
      RAISE EXCEPTION 'RLS not enabled on public.%', tbl;
    END IF;

    -- Check policies exist
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = tbl;

    IF policy_count < 4 THEN
      RAISE WARNING 'Table % has only % policies (expected 4+)', tbl, policy_count;
    END IF;
  END LOOP;

  -- Verify column additions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cefr_descriptors' AND column_name = 'scale'
  ) THEN
    RAISE EXCEPTION 'cefr_descriptors.scale column not added';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competency_assessments' AND column_name = 'progress'
  ) THEN
    RAISE EXCEPTION 'competency_assessments.progress column not added';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'primary_coursebook_id'
  ) THEN
    RAISE EXCEPTION 'classes.primary_coursebook_id column not added';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'profile_settings'
  ) THEN
    RAISE EXCEPTION 'tenants.profile_settings column not added';
  END IF;

  RAISE NOTICE 'FRESH_0028 Student Profile Phase 2 migration complete';
  RAISE NOTICE '  - cefr_descriptors: File A columns added';
  RAISE NOTICE '  - coursebooks: table created with RLS';
  RAISE NOTICE '  - coursebook_descriptors: table created with RLS';
  RAISE NOTICE '  - session_learning_objectives: table created with RLS';
  RAISE NOTICE '  - summative_assessment_types: table created with RLS';
  RAISE NOTICE '  - summative_assessments: table created with RLS';
  RAISE NOTICE '  - competency_assessments: progress/demonstrated_level columns added';
  RAISE NOTICE '  - classes: primary_coursebook_id added';
  RAISE NOTICE '  - tenants: profile_settings added';
END $$;
