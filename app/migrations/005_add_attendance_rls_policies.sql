/**
 * Migration 005: RLS Policies for Attendance/Register
 * T-051: RLS Policies for RegisterEntry (8 points, Medium)
 *
 * Implements Row-Level Security policies for attendance table:
 * - Teachers can view/edit attendance for their assigned classes
 * - Students can view their own attendance records
 * - Admins have full access to all records in their tenant
 * - Tenant isolation enforced on all queries
 */

-- Enable RLS on attendance table
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS attendance_tenant_isolation ON attendance;
DROP POLICY IF EXISTS attendance_teacher_access ON attendance;
DROP POLICY IF EXISTS attendance_student_view ON attendance;
DROP POLICY IF EXISTS attendance_admin_full_access ON attendance;

-- Policy 1: Tenant Isolation (applies to all roles)
-- Ensures users only see records from their own tenant
CREATE POLICY attendance_tenant_isolation ON attendance
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Policy 2: Teacher Access (view + edit own classes)
-- Teachers can view and modify attendance for sessions in classes they teach
CREATE POLICY attendance_teacher_access ON attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      INNER JOIN classes c ON cs.class_id = c.id
      WHERE cs.id = attendance.class_session_id
        AND c.teacher_id = current_setting('app.current_user_id')::uuid
        AND c.tenant_id = current_setting('app.current_tenant_id')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      INNER JOIN classes c ON cs.class_id = c.id
      WHERE cs.id = attendance.class_session_id
        AND c.teacher_id = current_setting('app.current_user_id')::uuid
        AND c.tenant_id = current_setting('app.current_tenant_id')::uuid
    )
  );

-- Policy 3: Student View (read-only own records)
-- Students can view their own attendance records but cannot modify them
CREATE POLICY attendance_student_view ON attendance
  FOR SELECT
  TO authenticated
  USING (
    student_id = current_setting('app.current_user_id')::uuid
      AND tenant_id = current_setting('app.current_tenant_id')::uuid
  );

-- Policy 4: Admin Full Access
-- Admins can view and modify all attendance records in their tenant
CREATE POLICY attendance_admin_full_access ON attendance
  FOR ALL
  TO authenticated
  USING (
    current_setting('app.user_role', true) = 'admin'
      AND tenant_id = current_setting('app.current_tenant_id')::uuid
  )
  WITH CHECK (
    current_setting('app.user_role', true) = 'admin'
      AND tenant_id = current_setting('app.current_tenant_id')::uuid
  );

-- Indexes to support RLS policies (already exist, but adding for completeness)
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(class_session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance(tenant_id);

-- Add helpful comments
COMMENT ON POLICY attendance_tenant_isolation ON attendance IS
  'Ensures tenant isolation - users only see records from their own tenant';

COMMENT ON POLICY attendance_teacher_access ON attendance IS
  'Teachers can view and modify attendance for classes they teach';

COMMENT ON POLICY attendance_student_view ON attendance IS
  'Students can view their own attendance records (read-only)';

COMMENT ON POLICY attendance_admin_full_access ON attendance IS
  'Admins have full access to all attendance records in their tenant';

-- Verify policies were created successfully
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'attendance';

  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Expected at least 4 RLS policies on attendance table, found %', policy_count;
  END IF;

  RAISE NOTICE 'Successfully created % RLS policies for attendance table', policy_count;
END$$;
