/**
 * Migration 004: Add Row-Level Security (RLS) Policies
 * T-051: RLS Policies for RegisterEntry (5 points, Small)
 *
 * Teacher sees only their session registers
 * Admins see all registers in their tenant
 * Students see only their own attendance records
 */

-- Enable RLS on attendance table
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Policy 1: Teachers can view attendance for their own classes
CREATE POLICY teacher_view_own_class_attendance ON attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM class_sessions cs
      INNER JOIN classes c ON cs.class_id = c.id
      WHERE cs.id = attendance.class_session_id
        AND c.teacher_id = current_setting('app.current_user_id')::uuid
        AND c.tenant_id = attendance.tenant_id
    )
  );

-- Policy 2: Teachers can insert/update attendance for their own classes
CREATE POLICY teacher_modify_own_class_attendance ON attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM class_sessions cs
      INNER JOIN classes c ON cs.class_id = c.id
      WHERE cs.id = attendance.class_session_id
        AND c.teacher_id = current_setting('app.current_user_id')::uuid
        AND c.tenant_id = attendance.tenant_id
    )
  );

-- Policy 3: Admins can view all attendance in their tenant
CREATE POLICY admin_view_all_attendance ON attendance
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') = 'admin'
  );

-- Policy 4: Admins can modify all attendance in their tenant
CREATE POLICY admin_modify_all_attendance ON attendance
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') = 'admin'
  );

-- Policy 5: Students can view their own attendance
CREATE POLICY student_view_own_attendance ON attendance
  FOR SELECT
  USING (
    student_id = current_setting('app.current_user_id')::uuid
    AND tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') = 'student'
  );

-- Enable RLS on class_sessions table
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;

-- Policy 6: Teachers can view their own class sessions
CREATE POLICY teacher_view_own_sessions ON class_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM classes c
      WHERE c.id = class_sessions.class_id
        AND c.teacher_id = current_setting('app.current_user_id')::uuid
        AND c.tenant_id = class_sessions.tenant_id
    )
  );

-- Policy 7: Admins can view all sessions in their tenant
CREATE POLICY admin_view_all_sessions ON class_sessions
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') = 'admin'
  );

-- Enable RLS on classes table
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Policy 8: Teachers can view their own classes
CREATE POLICY teacher_view_own_classes ON classes
  FOR SELECT
  USING (
    teacher_id = current_setting('app.current_user_id')::uuid
    AND tenant_id = current_setting('app.current_tenant_id')::uuid
  );

-- Policy 9: Admins can view all classes in their tenant
CREATE POLICY admin_view_all_classes ON classes
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.current_user_role') = 'admin'
  );

-- Policy 10: Students can view classes they're enrolled in
CREATE POLICY student_view_enrolled_classes ON classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM enrollments e
      WHERE e.class_id = classes.id
        AND e.student_id = current_setting('app.current_user_id')::uuid
        AND e.status = 'active'
    )
    AND tenant_id = current_setting('app.current_tenant_id')::uuid
  );

-- Function to set current user context (called from application layer)
CREATE OR REPLACE FUNCTION set_user_context(user_id uuid, tenant_id uuid, user_role text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, false);
  PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
  PERFORM set_config('app.current_user_role', user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_user_context(uuid, uuid, text) TO authenticated;

-- Add helpful comments
COMMENT ON POLICY teacher_view_own_class_attendance ON attendance IS 'Teachers can only view attendance for their own classes';
COMMENT ON POLICY admin_view_all_attendance ON attendance IS 'Admins can view all attendance in their tenant';
COMMENT ON POLICY student_view_own_attendance ON attendance IS 'Students can only view their own attendance';
COMMENT ON FUNCTION set_user_context(uuid, uuid, text) IS 'Sets user context for RLS policies (called from app layer)';
