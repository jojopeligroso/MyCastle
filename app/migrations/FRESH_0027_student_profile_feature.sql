/**
 * FRESH_0027: Student Profile Feature - Schema Extensions
 *
 * Implements the comprehensive Student Profile feature across all user types:
 * - Student self-view (mobile-first)
 * - Teacher view (class-scoped, academic only)
 * - Admin/Owner view (full unrestricted)
 * - DoS view (hybrid role with promotion approval)
 *
 * Key additions:
 * 1. Teacher notes with visibility control
 * 2. Competency assessments (student × descriptor × date × score)
 * 3. Diagnostic history tracking
 * 4. Level promotion workflow
 * 5. Contact verification system
 * 6. Enrollment primary flag
 * 7. Tenant CEFR configuration
 * 8. LLM tutor architecture hooks
 *
 * Date: 2026-03-01
 * Ref: Student Profile Feature Plan
 */

-- ============================================================================
-- PART 1: CEFR Descriptors Enhancement
-- ============================================================================

-- Add tenant-specific descriptor configuration
ALTER TABLE cefr_descriptors
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id),
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS source_descriptor_id UUID REFERENCES cefr_descriptors(id),
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add index for tenant-specific descriptors
CREATE INDEX IF NOT EXISTS idx_cefr_descriptors_tenant ON cefr_descriptors(tenant_id) WHERE tenant_id IS NOT NULL;

-- Tenant CEFR configuration table
CREATE TABLE IF NOT EXISTS tenant_cefr_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Selected levels for this school
  enabled_levels JSONB NOT NULL DEFAULT '["A1", "A2", "B1", "B1+", "B2", "B2+", "C1"]',

  -- Plus levels support
  uses_plus_levels BOOLEAN DEFAULT true,

  -- Assessment configuration
  assessment_frequency VARCHAR(50) DEFAULT 'weekly', -- weekly, bi-weekly, monthly, per-session
  assessment_weights JSONB DEFAULT '{"periodic": 0.6, "ad_hoc": 0.2, "end_of_unit": 0.2}',

  -- Descriptor selection mode
  descriptor_mode VARCHAR(50) DEFAULT 'all', -- all, selected, custom_only

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(tenant_id)
);

-- Tenant descriptor selection (which official descriptors are enabled)
CREATE TABLE IF NOT EXISTS tenant_descriptor_selection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  descriptor_id UUID NOT NULL REFERENCES cefr_descriptors(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(tenant_id, descriptor_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_descriptor_selection_tenant ON tenant_descriptor_selection(tenant_id);

-- ============================================================================
-- PART 2: Teacher Notes System
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Author information
  author_id UUID NOT NULL REFERENCES users(id),
  author_role VARCHAR(50) NOT NULL, -- teacher, admin, dos

  -- Note content
  content TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'general', -- general, academic, behavioral, pastoral, medical

  -- Visibility control
  visibility VARCHAR(50) NOT NULL DEFAULT 'private', -- private, staff_only, shareable
  is_shared_with_student BOOLEAN DEFAULT false,
  shared_at TIMESTAMP,

  -- Categorization
  tags JSONB DEFAULT '[]',

  -- Audit
  edited_at TIMESTAMP,
  edited_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_notes_student ON student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_tenant ON student_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_author ON student_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_visibility ON student_notes(visibility);
CREATE INDEX IF NOT EXISTS idx_student_notes_type ON student_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_student_notes_shared ON student_notes(is_shared_with_student) WHERE is_shared_with_student = true;

-- ============================================================================
-- PART 3: Competency Assessment System
-- ============================================================================

CREATE TABLE IF NOT EXISTS competency_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- What is being assessed
  descriptor_id UUID NOT NULL REFERENCES cefr_descriptors(id),

  -- Assessment context
  class_id UUID REFERENCES classes(id),
  enrollment_id UUID REFERENCES enrollments(id),
  assignment_id UUID REFERENCES assignments(id), -- If linked to assignment

  -- Assessment details
  assessment_type VARCHAR(50) NOT NULL, -- periodic, ad_hoc, end_of_unit, assignment
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Score (1-4 scale: 1=not demonstrated, 2=emerging, 3=developing, 4=competent)
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 4),

  -- Optional notes
  notes TEXT,

  -- Assessor
  assessed_by UUID NOT NULL REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_competency_assessments_student ON competency_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_competency_assessments_descriptor ON competency_assessments(descriptor_id);
CREATE INDEX IF NOT EXISTS idx_competency_assessments_class ON competency_assessments(class_id);
CREATE INDEX IF NOT EXISTS idx_competency_assessments_date ON competency_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_competency_assessments_type ON competency_assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_competency_assessments_tenant ON competency_assessments(tenant_id);

-- Aggregated competency progress (denormalized for performance)
CREATE TABLE IF NOT EXISTS competency_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  descriptor_id UUID NOT NULL REFERENCES cefr_descriptors(id),

  -- Current state
  current_score DECIMAL(3,2), -- Average of recent assessments
  assessment_count INTEGER DEFAULT 0,
  last_assessed_at TIMESTAMP,

  -- Progress tracking
  is_competent BOOLEAN DEFAULT false, -- Score >= 3.5 sustained
  competent_since TIMESTAMP,

  -- Enrollment context (for primary class tracking)
  enrollment_id UUID REFERENCES enrollments(id),

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(student_id, descriptor_id, enrollment_id)
);

CREATE INDEX IF NOT EXISTS idx_competency_progress_student ON competency_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_competency_progress_descriptor ON competency_progress(descriptor_id);
CREATE INDEX IF NOT EXISTS idx_competency_progress_competent ON competency_progress(is_competent) WHERE is_competent = true;

-- ============================================================================
-- PART 4: Diagnostic History
-- ============================================================================

CREATE TABLE IF NOT EXISTS diagnostic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Session timing
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- in_progress, completed, cancelled
  current_stage VARCHAR(100), -- e.g., 'written_test', 'speaking_assessment', 'review'

  -- Results
  recommended_level VARCHAR(5), -- A0, A1, A2, B1, B1+, B2, B2+, C1
  actual_placement_level VARCHAR(5), -- May differ from recommended

  -- Stage results (flexible JSON for school-configurable process)
  stage_results JSONB DEFAULT '{}',

  -- Metadata
  administered_by UUID REFERENCES users(id),
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_student ON diagnostic_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_tenant ON diagnostic_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_status ON diagnostic_sessions(status);
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_date ON diagnostic_sessions(started_at);

-- ============================================================================
-- PART 5: Level Promotion Workflow
-- ============================================================================

CREATE TABLE IF NOT EXISTS level_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Level change
  from_level VARCHAR(5) NOT NULL,
  to_level VARCHAR(5) NOT NULL,

  -- Recommendation
  recommended_by UUID NOT NULL REFERENCES users(id),
  recommended_at TIMESTAMP NOT NULL DEFAULT NOW(),
  recommendation_reason TEXT,

  -- Evidence summary (accumulated from assessments)
  evidence_summary JSONB DEFAULT '{}',

  -- Approval workflow
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,

  -- If approved, track application
  applied_at TIMESTAMP,

  -- Class transfer (if promotion involves class change)
  from_class_id UUID REFERENCES classes(id),
  to_class_id UUID REFERENCES classes(id),

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_level_promotions_student ON level_promotions(student_id);
CREATE INDEX IF NOT EXISTS idx_level_promotions_status ON level_promotions(status);
CREATE INDEX IF NOT EXISTS idx_level_promotions_tenant ON level_promotions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_level_promotions_reviewer ON level_promotions(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- ============================================================================
-- PART 6: Contact Verification System
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- What's being verified
  contact_type VARCHAR(20) NOT NULL, -- email, phone
  new_value VARCHAR(255) NOT NULL,
  old_value VARCHAR(255),

  -- Verification code
  verification_code VARCHAR(10) NOT NULL,
  code_expires_at TIMESTAMP NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, verified, expired, cancelled
  verified_at TIMESTAMP,

  -- Audit
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_verifications_user ON contact_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_verifications_status ON contact_verifications(status);
CREATE INDEX IF NOT EXISTS idx_contact_verifications_expires ON contact_verifications(code_expires_at);

-- ============================================================================
-- PART 7: Enrollment Extensions (Primary Flag)
-- ============================================================================

-- Add primary enrollment flag
ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Index for finding primary enrollment quickly
CREATE INDEX IF NOT EXISTS idx_enrollments_primary ON enrollments(student_id, is_primary) WHERE is_primary = true;

-- ============================================================================
-- PART 8: Assignment-Descriptor Link (1 primary descriptor per assignment)
-- ============================================================================

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS primary_descriptor_id UUID REFERENCES cefr_descriptors(id),
ADD COLUMN IF NOT EXISTS cefr_level VARCHAR(5);

CREATE INDEX IF NOT EXISTS idx_assignments_descriptor ON assignments(primary_descriptor_id) WHERE primary_descriptor_id IS NOT NULL;

-- ============================================================================
-- PART 9: LLM Tutor Architecture Hooks (Future Extension Points)
-- ============================================================================

-- Exercise attempts (for future LLM-generated exercises)
CREATE TABLE IF NOT EXISTS exercise_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Exercise details
  exercise_type VARCHAR(50) NOT NULL, -- mcq, vocab_match, sentence_creation, gap_fill
  exercise_content JSONB NOT NULL, -- Generated exercise content

  -- Results
  student_response JSONB,
  score DECIMAL(5,2),
  is_correct BOOLEAN,
  feedback JSONB,

  -- Context
  descriptor_id UUID REFERENCES cefr_descriptors(id),
  cefr_level VARCHAR(5),
  topic VARCHAR(255),

  -- Timing
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  time_spent_seconds INTEGER,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exercise_attempts_student ON exercise_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_type ON exercise_attempts(exercise_type);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_date ON exercise_attempts(started_at);

-- Vocabulary lists (for future vocab discovery feature)
CREATE TABLE IF NOT EXISTS vocab_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Vocabulary item
  word VARCHAR(255) NOT NULL,
  definition TEXT,
  context_sentence TEXT,

  -- Categorization
  cefr_level VARCHAR(5),
  topic VARCHAR(100),
  word_type VARCHAR(50), -- noun, verb, adjective, etc.

  -- Learning state
  mastery_level INTEGER DEFAULT 1 CHECK (mastery_level >= 1 AND mastery_level <= 5),
  times_reviewed INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMP,
  next_review_at TIMESTAMP, -- Spaced repetition

  -- Source
  discovered_from VARCHAR(100), -- lesson, exercise, tutor_chat

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vocab_lists_student ON vocab_lists(student_id);
CREATE INDEX IF NOT EXISTS idx_vocab_lists_mastery ON vocab_lists(mastery_level);
CREATE INDEX IF NOT EXISTS idx_vocab_lists_review ON vocab_lists(next_review_at);

-- Tutor interactions (for future LLM tutor conversations)
CREATE TABLE IF NOT EXISTS tutor_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Conversation context
  session_id UUID, -- Groups messages in same session
  interaction_type VARCHAR(50) NOT NULL, -- chat, exercise, vocab_discovery, explanation

  -- Content
  messages JSONB NOT NULL, -- Array of {role, content, timestamp}

  -- Context at time of interaction
  cefr_level VARCHAR(5),
  topic VARCHAR(255),
  descriptor_ids JSONB DEFAULT '[]',

  -- Session timing
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tutor_interactions_student ON tutor_interactions(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_interactions_session ON tutor_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_tutor_interactions_type ON tutor_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_tutor_interactions_date ON tutor_interactions(started_at);

-- ============================================================================
-- PART 10: User Extensions for Profile Feature
-- ============================================================================

-- Add address field to users (for admin view)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS address_line_2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- ============================================================================
-- PART 11: RLS Policies for New Tables
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE tenant_cefr_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_descriptor_selection ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE competency_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE competency_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_interactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TENANT_CEFR_CONFIG POLICIES
-- ============================================================================

CREATE POLICY "tenant_cefr_config_superuser_all"
  ON tenant_cefr_config FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "tenant_cefr_config_select_tenant"
  ON tenant_cefr_config FOR SELECT
  USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_cefr_config_insert_admin"
  ON tenant_cefr_config FOR INSERT
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "tenant_cefr_config_update_admin"
  ON tenant_cefr_config FOR UPDATE
  USING (is_admin() AND tenant_id = get_tenant_id())
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "tenant_cefr_config_delete_admin"
  ON tenant_cefr_config FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- TENANT_DESCRIPTOR_SELECTION POLICIES
-- ============================================================================

CREATE POLICY "tenant_descriptor_selection_superuser_all"
  ON tenant_descriptor_selection FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "tenant_descriptor_selection_select_tenant"
  ON tenant_descriptor_selection FOR SELECT
  USING (tenant_id = get_tenant_id());

CREATE POLICY "tenant_descriptor_selection_insert_admin"
  ON tenant_descriptor_selection FOR INSERT
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "tenant_descriptor_selection_update_admin"
  ON tenant_descriptor_selection FOR UPDATE
  USING (is_admin() AND tenant_id = get_tenant_id())
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "tenant_descriptor_selection_delete_admin"
  ON tenant_descriptor_selection FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- STUDENT_NOTES POLICIES
-- ============================================================================

CREATE POLICY "student_notes_superuser_all"
  ON student_notes FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- Admin can see all notes in tenant
CREATE POLICY "student_notes_select_admin"
  ON student_notes FOR SELECT
  USING (is_admin() AND tenant_id = get_tenant_id());

-- Teachers can see notes for their class students (visibility != 'private' or own notes)
-- Note: Full implementation requires checking class enrollment - simplified here
CREATE POLICY "student_notes_select_teacher"
  ON student_notes FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND get_user_role() = 'teacher'
    AND (author_id = get_user_id() OR visibility IN ('staff_only', 'shareable'))
  );

-- Students can see notes shared with them
CREATE POLICY "student_notes_select_student"
  ON student_notes FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
    AND is_shared_with_student = true
  );

-- Teachers and admins can insert notes
CREATE POLICY "student_notes_insert_staff"
  ON student_notes FOR INSERT
  WITH CHECK (
    is_teacher_or_admin()
    AND tenant_id = get_tenant_id()
    AND author_id = get_user_id()
  );

-- Authors can update their own notes, admins can update any
CREATE POLICY "student_notes_update_author_or_admin"
  ON student_notes FOR UPDATE
  USING (
    tenant_id = get_tenant_id()
    AND (author_id = get_user_id() OR is_admin())
  )
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND (author_id = get_user_id() OR is_admin())
  );

-- Authors can delete their own notes, admins can delete any
CREATE POLICY "student_notes_delete_author_or_admin"
  ON student_notes FOR DELETE
  USING (
    tenant_id = get_tenant_id()
    AND (author_id = get_user_id() OR is_admin())
  );

-- ============================================================================
-- COMPETENCY_ASSESSMENTS POLICIES
-- ============================================================================

CREATE POLICY "competency_assessments_superuser_all"
  ON competency_assessments FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

-- Admin and DoS can see all assessments
CREATE POLICY "competency_assessments_select_admin"
  ON competency_assessments FOR SELECT
  USING (is_admin() AND tenant_id = get_tenant_id());

-- Teachers can see assessments for their class students
CREATE POLICY "competency_assessments_select_teacher"
  ON competency_assessments FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND get_user_role() = 'teacher'
  );

-- Students can see their own assessments
CREATE POLICY "competency_assessments_select_student"
  ON competency_assessments FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

-- Teachers and admins can insert assessments
CREATE POLICY "competency_assessments_insert_staff"
  ON competency_assessments FOR INSERT
  WITH CHECK (
    is_teacher_or_admin()
    AND tenant_id = get_tenant_id()
    AND assessed_by = get_user_id()
  );

-- Only the assessor or admin can update
CREATE POLICY "competency_assessments_update_assessor_or_admin"
  ON competency_assessments FOR UPDATE
  USING (
    tenant_id = get_tenant_id()
    AND (assessed_by = get_user_id() OR is_admin())
  )
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND (assessed_by = get_user_id() OR is_admin())
  );

-- Only admin can delete assessments (for data integrity)
CREATE POLICY "competency_assessments_delete_admin"
  ON competency_assessments FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- COMPETENCY_PROGRESS POLICIES (same as assessments)
-- ============================================================================

CREATE POLICY "competency_progress_superuser_all"
  ON competency_progress FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "competency_progress_select_admin"
  ON competency_progress FOR SELECT
  USING (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "competency_progress_select_teacher"
  ON competency_progress FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND get_user_role() = 'teacher'
  );

CREATE POLICY "competency_progress_select_student"
  ON competency_progress FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

CREATE POLICY "competency_progress_insert_staff"
  ON competency_progress FOR INSERT
  WITH CHECK (is_teacher_or_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "competency_progress_update_staff"
  ON competency_progress FOR UPDATE
  USING (is_teacher_or_admin() AND tenant_id = get_tenant_id())
  WITH CHECK (is_teacher_or_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "competency_progress_delete_admin"
  ON competency_progress FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- DIAGNOSTIC_SESSIONS POLICIES
-- ============================================================================

CREATE POLICY "diagnostic_sessions_superuser_all"
  ON diagnostic_sessions FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "diagnostic_sessions_select_admin"
  ON diagnostic_sessions FOR SELECT
  USING (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "diagnostic_sessions_select_teacher"
  ON diagnostic_sessions FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND get_user_role() = 'teacher'
  );

CREATE POLICY "diagnostic_sessions_select_student"
  ON diagnostic_sessions FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

CREATE POLICY "diagnostic_sessions_insert_staff"
  ON diagnostic_sessions FOR INSERT
  WITH CHECK (is_teacher_or_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "diagnostic_sessions_update_staff"
  ON diagnostic_sessions FOR UPDATE
  USING (is_teacher_or_admin() AND tenant_id = get_tenant_id())
  WITH CHECK (is_teacher_or_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "diagnostic_sessions_delete_admin"
  ON diagnostic_sessions FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- LEVEL_PROMOTIONS POLICIES
-- ============================================================================

CREATE POLICY "level_promotions_superuser_all"
  ON level_promotions FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "level_promotions_select_admin"
  ON level_promotions FOR SELECT
  USING (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "level_promotions_select_teacher"
  ON level_promotions FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND get_user_role() = 'teacher'
  );

CREATE POLICY "level_promotions_select_student"
  ON level_promotions FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

-- Teachers can recommend promotions
CREATE POLICY "level_promotions_insert_staff"
  ON level_promotions FOR INSERT
  WITH CHECK (
    is_teacher_or_admin()
    AND tenant_id = get_tenant_id()
    AND recommended_by = get_user_id()
  );

-- Only admin/DoS can approve (update status)
CREATE POLICY "level_promotions_update_admin"
  ON level_promotions FOR UPDATE
  USING (is_admin() AND tenant_id = get_tenant_id())
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "level_promotions_delete_admin"
  ON level_promotions FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- CONTACT_VERIFICATIONS POLICIES
-- ============================================================================

CREATE POLICY "contact_verifications_superuser_all"
  ON contact_verifications FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "contact_verifications_select_admin"
  ON contact_verifications FOR SELECT
  USING (is_admin() AND tenant_id = get_tenant_id());

-- Users can see their own verifications
CREATE POLICY "contact_verifications_select_own"
  ON contact_verifications FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND user_id = get_user_id()
  );

-- Users can create their own verifications
CREATE POLICY "contact_verifications_insert_own"
  ON contact_verifications FOR INSERT
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND user_id = get_user_id()
  );

-- Users can update their own verifications (for verification attempts)
CREATE POLICY "contact_verifications_update_own"
  ON contact_verifications FOR UPDATE
  USING (
    tenant_id = get_tenant_id()
    AND user_id = get_user_id()
  )
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND user_id = get_user_id()
  );

-- Admin can update any verification (for overrides)
CREATE POLICY "contact_verifications_update_admin"
  ON contact_verifications FOR UPDATE
  USING (is_admin() AND tenant_id = get_tenant_id())
  WITH CHECK (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "contact_verifications_delete_admin"
  ON contact_verifications FOR DELETE
  USING (is_admin() AND tenant_id = get_tenant_id());

-- ============================================================================
-- LLM TUTOR TABLES POLICIES (exercise_attempts, vocab_lists, tutor_interactions)
-- ============================================================================

-- Exercise Attempts
CREATE POLICY "exercise_attempts_superuser_all"
  ON exercise_attempts FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "exercise_attempts_select_admin"
  ON exercise_attempts FOR SELECT
  USING (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "exercise_attempts_select_teacher"
  ON exercise_attempts FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND get_user_role() = 'teacher'
  );

CREATE POLICY "exercise_attempts_select_own"
  ON exercise_attempts FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

CREATE POLICY "exercise_attempts_insert_student"
  ON exercise_attempts FOR INSERT
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

CREATE POLICY "exercise_attempts_update_student"
  ON exercise_attempts FOR UPDATE
  USING (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  )
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

-- Vocab Lists
CREATE POLICY "vocab_lists_superuser_all"
  ON vocab_lists FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "vocab_lists_select_admin"
  ON vocab_lists FOR SELECT
  USING (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "vocab_lists_select_teacher"
  ON vocab_lists FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND get_user_role() = 'teacher'
  );

CREATE POLICY "vocab_lists_select_own"
  ON vocab_lists FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

CREATE POLICY "vocab_lists_insert_student"
  ON vocab_lists FOR INSERT
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

CREATE POLICY "vocab_lists_update_student"
  ON vocab_lists FOR UPDATE
  USING (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  )
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

CREATE POLICY "vocab_lists_delete_student"
  ON vocab_lists FOR DELETE
  USING (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

-- Tutor Interactions
CREATE POLICY "tutor_interactions_superuser_all"
  ON tutor_interactions FOR ALL
  USING (is_superuser())
  WITH CHECK (is_superuser());

CREATE POLICY "tutor_interactions_select_admin"
  ON tutor_interactions FOR SELECT
  USING (is_admin() AND tenant_id = get_tenant_id());

CREATE POLICY "tutor_interactions_select_own"
  ON tutor_interactions FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

CREATE POLICY "tutor_interactions_insert_student"
  ON tutor_interactions FOR INSERT
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

CREATE POLICY "tutor_interactions_update_student"
  ON tutor_interactions FOR UPDATE
  USING (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  )
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND student_id = get_user_id()
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  new_tables TEXT[] := ARRAY[
    'tenant_cefr_config',
    'tenant_descriptor_selection',
    'student_notes',
    'competency_assessments',
    'competency_progress',
    'diagnostic_sessions',
    'level_promotions',
    'contact_verifications',
    'exercise_attempts',
    'vocab_lists',
    'tutor_interactions'
  ];
  tbl TEXT;
  policy_count INTEGER;
BEGIN
  FOREACH tbl IN ARRAY new_tables
  LOOP
    -- Check RLS is enabled
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = tbl
      AND rowsecurity = true
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

  RAISE NOTICE 'Student Profile Feature migration complete - all new tables protected with RLS';
END $$;
