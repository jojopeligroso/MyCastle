-- ============================================================================
-- MyCastle Fresh Schema Migration 0008
-- RLS Policies for Additional Tables (Academic, System, Curriculum, Programmes)
-- Date: 2026-01-19
-- Ref: FRESH_0002_rls_policies.sql (original RLS setup)
-- ============================================================================

-- This migration adds RLS policies for tables created in:
-- - FRESH_0004 (academic tables)
-- - FRESH_0005 (system tables)
-- - FRESH_0006 (curriculum tables)
-- - FRESH_0007 (programmes)

-- Run this AFTER FRESH_0001 through FRESH_0007.

-- ============================================================================
-- PART 1: Enable RLS on All New Tables
-- ============================================================================

-- Academic tables (FRESH_0004)
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- System tables (FRESH_0005)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Curriculum tables (FRESH_0006)
-- Note: cefr_descriptors is global (no tenant_id), so no RLS
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
-- Note: lesson_plan_materials is a join table, inherits security from parents

-- Programme tables (FRESH_0007)
ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_courses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Tenant Isolation Policies (SELECT)
-- ============================================================================

-- Academic tables
CREATE POLICY tenant_isolation_classes ON classes
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_enrollments ON enrollments
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_enrollment_amendments ON enrollment_amendments
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_class_sessions ON class_sessions
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_attendance ON attendance
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_assignments ON assignments
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_submissions ON submissions
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_grades ON grades
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- System tables
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid OR tenant_id IS NULL);

CREATE POLICY tenant_isolation_invoices ON invoices
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_conversations ON conversations
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_exports ON exports
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Curriculum tables
CREATE POLICY tenant_isolation_lesson_plans ON lesson_plans
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_materials ON materials
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Programme tables
CREATE POLICY tenant_isolation_programmes ON programmes
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_programme_courses ON programme_courses
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- PART 3: Tenant Isolation Policies (INSERT)
-- ============================================================================

-- Academic tables
CREATE POLICY tenant_insert_classes ON classes
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_insert_enrollments ON enrollments
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_insert_enrollment_amendments ON enrollment_amendments
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_insert_class_sessions ON class_sessions
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_insert_attendance ON attendance
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_insert_assignments ON assignments
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_insert_submissions ON submissions
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_insert_grades ON grades
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- System tables
CREATE POLICY tenant_insert_audit_logs ON audit_logs
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid OR tenant_id IS NULL);

CREATE POLICY tenant_insert_invoices ON invoices
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_insert_conversations ON conversations
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_insert_exports ON exports
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Curriculum tables
CREATE POLICY tenant_insert_lesson_plans ON lesson_plans
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_insert_materials ON materials
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Programme tables
CREATE POLICY tenant_insert_programmes ON programmes
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_insert_programme_courses ON programme_courses
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- PART 4: Special Policies for Specific Tables
-- ============================================================================

-- CEFR Descriptors: Global read-only data (no tenant_id)
-- Allow all authenticated users to read
CREATE POLICY cefr_descriptors_read ON cefr_descriptors
  FOR SELECT
  USING (true);

-- Only super_admin can insert/update CEFR descriptors
CREATE POLICY cefr_descriptors_write ON cefr_descriptors
  FOR ALL
  USING (current_setting('app.user_role', true) = 'super_admin')
  WITH CHECK (current_setting('app.user_role', true) = 'super_admin');

-- Audit Logs: Append-only (no UPDATE or DELETE)
-- Prevent updates to audit logs (immutable)
CREATE POLICY audit_logs_no_update ON audit_logs
  FOR UPDATE
  USING (false);

CREATE POLICY audit_logs_no_delete ON audit_logs
  FOR DELETE
  USING (false);

-- Attendance: Hash-chain immutability (limited edits)
-- Teachers can edit attendance within edit window
CREATE POLICY attendance_teacher_edit ON attendance
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    AND (
      current_setting('app.user_role', true) IN ('teacher', 'admin', 'super_admin')
    )
    AND (
      is_within_edit_window = 'true'
      OR current_setting('app.user_role', true) IN ('admin', 'super_admin')
    )
  );

-- Materials: Visibility-based access
-- Public materials can be read by anyone, tenant materials by tenant users
CREATE POLICY materials_visibility_read ON materials
  FOR SELECT
  USING (
    visibility = 'public'
    OR (visibility = 'tenant' AND tenant_id = current_setting('app.tenant_id', true)::uuid)
    OR (visibility = 'private' AND uploaded_by = current_setting('app.user_id', true)::uuid)
  );

-- ============================================================================
-- PART 5: Comments
-- ============================================================================

COMMENT ON POLICY tenant_isolation_classes ON classes IS 'Enforce tenant data isolation for classes';
COMMENT ON POLICY tenant_isolation_audit_logs ON audit_logs IS 'Allow tenant-specific and global audit logs';
COMMENT ON POLICY cefr_descriptors_read ON cefr_descriptors IS 'CEFR descriptors are global read-only data';
COMMENT ON POLICY audit_logs_no_update ON audit_logs IS 'Audit logs are immutable (no updates allowed)';
COMMENT ON POLICY audit_logs_no_delete ON audit_logs IS 'Audit logs are immutable (no deletes allowed)';
COMMENT ON POLICY attendance_teacher_edit ON attendance IS 'Teachers can edit attendance within edit window, admins always';
COMMENT ON POLICY materials_visibility_read ON materials IS 'Materials access based on visibility: public, tenant, or private';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration FRESH_0008 completed successfully!';
  RAISE NOTICE 'RLS policies created for:';
  RAISE NOTICE '- Academic tables (classes, enrollments, sessions, attendance, assignments, submissions, grades)';
  RAISE NOTICE '- System tables (audit_logs, invoices, conversations, exports)';
  RAISE NOTICE '- Curriculum tables (lesson_plans, materials, cefr_descriptors)';
  RAISE NOTICE '- Programme tables (programmes, programme_courses)';
  RAISE NOTICE '';
  RAISE NOTICE 'Special policies:';
  RAISE NOTICE '- CEFR descriptors: Global read-only';
  RAISE NOTICE '- Audit logs: Immutable (append-only)';
  RAISE NOTICE '- Attendance: Edit window enforcement';
  RAISE NOTICE '- Materials: Visibility-based access';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test RLS with different tenant contexts';
  RAISE NOTICE '2. Update database views (FRESH_0003) to use real data';
  RAISE NOTICE '3. Create seed data scripts';
END $$;
