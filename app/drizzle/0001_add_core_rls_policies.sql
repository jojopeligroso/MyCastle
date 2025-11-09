-- Migration: Add Core RLS Policies
-- T-011: Implement RLS policies for tenant and role isolation
-- Ref: REQ-A-004, DESIGN §5.2

-- ============================================================================
-- PART 1: User Context Functions
-- ============================================================================

-- Function to set application-level user context
-- This should be called by the application after JWT verification
CREATE OR REPLACE FUNCTION set_user_context(
  p_user_id uuid,
  p_tenant_id uuid,
  p_role varchar
) RETURNS void AS $$
BEGIN
  -- Set session-level configuration variables
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, false);
  PERFORM set_config('app.current_role', p_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION current_user_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to get current tenant ID
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION current_user_role() RETURNS varchar AS $$
BEGIN
  RETURN current_setting('app.current_role', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 2: Enable RLS on All Tables
-- ============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: Tenants Table Policies
-- ============================================================================

-- Users can only see their own tenant
CREATE POLICY tenants_select_own_tenant ON tenants
  FOR SELECT
  USING (id = current_tenant_id());

-- Only admins can update tenant settings
CREATE POLICY tenants_update_admin ON tenants
  FOR UPDATE
  USING (
    id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- ============================================================================
-- PART 4: Users Table Policies
-- ============================================================================

-- Users can view users in their own tenant
CREATE POLICY users_select_own_tenant ON users
  FOR SELECT
  USING (tenant_id = current_tenant_id());

-- Admins can insert users in their tenant
CREATE POLICY users_insert_admin ON users
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- Admins can update users in their tenant
-- Users can update their own profile (limited fields via app layer)
CREATE POLICY users_update_admin_or_self ON users
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR id = current_user_id()
    )
  );

-- Admins can soft-delete users (via deleted_at)
CREATE POLICY users_delete_admin ON users
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- ============================================================================
-- PART 5: Classes Table Policies
-- ============================================================================

-- Teachers see their assigned classes
-- Students see classes they're enrolled in
-- Admins see all classes in tenant
CREATE POLICY classes_select_by_role ON classes
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      -- Admins see all
      current_user_role() = 'admin'
      -- Teachers see assigned classes
      OR (current_user_role() = 'teacher' AND teacher_id = current_user_id())
      -- Students see enrolled classes
      OR (
        current_user_role() = 'student'
        AND EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.class_id = classes.id
            AND e.student_id = current_user_id()
            AND e.status = 'active'
        )
      )
    )
  );

-- Admins can create classes
CREATE POLICY classes_insert_admin ON classes
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- Admins and assigned teachers can update classes
CREATE POLICY classes_update_admin_or_teacher ON classes
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR (current_user_role() = 'teacher' AND teacher_id = current_user_id())
    )
  );

-- Admins can delete classes
CREATE POLICY classes_delete_admin ON classes
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- ============================================================================
-- PART 6: Enrollments Table Policies
-- ============================================================================

-- Students see their own enrollments
-- Teachers see enrollments for their classes
-- Admins see all enrollments in tenant
CREATE POLICY enrollments_select_by_role ON enrollments
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR (current_user_role() = 'student' AND student_id = current_user_id())
      OR (
        current_user_role() = 'teacher'
        AND EXISTS (
          SELECT 1 FROM classes c
          WHERE c.id = enrollments.class_id
            AND c.teacher_id = current_user_id()
        )
      )
    )
  );

-- Admins can create enrollments
CREATE POLICY enrollments_insert_admin ON enrollments
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- Admins can update enrollments
CREATE POLICY enrollments_update_admin ON enrollments
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- Admins can delete enrollments
CREATE POLICY enrollments_delete_admin ON enrollments
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- ============================================================================
-- PART 7: Class Sessions Table Policies
-- ============================================================================

-- Same visibility as classes
CREATE POLICY class_sessions_select_by_role ON class_sessions
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = class_sessions.class_id
          AND (
            -- Teacher assigned to class
            (current_user_role() = 'teacher' AND c.teacher_id = current_user_id())
            -- Student enrolled in class
            OR (
              current_user_role() = 'student'
              AND EXISTS (
                SELECT 1 FROM enrollments e
                WHERE e.class_id = c.id
                  AND e.student_id = current_user_id()
                  AND e.status = 'active'
              )
            )
          )
      )
    )
  );

-- Admins and assigned teachers can create sessions
CREATE POLICY class_sessions_insert_admin_or_teacher ON class_sessions
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = class_sessions.class_id
          AND c.teacher_id = current_user_id()
      )
    )
  );

-- Admins and assigned teachers can update sessions
CREATE POLICY class_sessions_update_admin_or_teacher ON class_sessions
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = class_sessions.class_id
          AND c.teacher_id = current_user_id()
      )
    )
  );

-- Admins can delete sessions
CREATE POLICY class_sessions_delete_admin ON class_sessions
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- ============================================================================
-- PART 8: Attendance Table Policies
-- ============================================================================

-- Students see their own attendance
-- Teachers see attendance for their sessions
-- Admins see all attendance in tenant
CREATE POLICY attendance_select_by_role ON attendance
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR (current_user_role() = 'student' AND student_id = current_user_id())
      OR (
        current_user_role() = 'teacher'
        AND EXISTS (
          SELECT 1 FROM class_sessions cs
          INNER JOIN classes c ON cs.class_id = c.id
          WHERE cs.id = attendance.class_session_id
            AND c.teacher_id = current_user_id()
        )
      )
    )
  );

-- Teachers can mark attendance for their sessions
-- Admins can mark any attendance
CREATE POLICY attendance_insert_teacher_or_admin ON attendance
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM class_sessions cs
        INNER JOIN classes c ON cs.class_id = c.id
        WHERE cs.id = attendance.class_session_id
          AND c.teacher_id = current_user_id()
      )
    )
  );

-- Teachers can update attendance for their sessions (within edit window)
-- Admins can update any attendance
CREATE POLICY attendance_update_teacher_or_admin ON attendance
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM class_sessions cs
        INNER JOIN classes c ON cs.class_id = c.id
        WHERE cs.id = attendance.class_session_id
          AND c.teacher_id = current_user_id()
      )
    )
  );

-- Only admins can delete attendance records
CREATE POLICY attendance_delete_admin ON attendance
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- ============================================================================
-- PART 9: Assignments Table Policies
-- ============================================================================

-- Students see assignments for enrolled classes
-- Teachers see assignments for their classes
-- Admins see all assignments in tenant
CREATE POLICY assignments_select_by_role ON assignments
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = assignments.class_id
          AND (
            (current_user_role() = 'teacher' AND c.teacher_id = current_user_id())
            OR (
              current_user_role() = 'student'
              AND EXISTS (
                SELECT 1 FROM enrollments e
                WHERE e.class_id = c.id
                  AND e.student_id = current_user_id()
                  AND e.status = 'active'
              )
            )
          )
      )
    )
  );

-- Teachers can create assignments for their classes
-- Admins can create any assignment
CREATE POLICY assignments_insert_teacher_or_admin ON assignments
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = assignments.class_id
          AND c.teacher_id = current_user_id()
      )
    )
  );

-- Teachers can update assignments for their classes
-- Admins can update any assignment
CREATE POLICY assignments_update_teacher_or_admin ON assignments
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = assignments.class_id
          AND c.teacher_id = current_user_id()
      )
    )
  );

-- Teachers can delete assignments for their classes
-- Admins can delete any assignment
CREATE POLICY assignments_delete_teacher_or_admin ON assignments
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = assignments.class_id
          AND c.teacher_id = current_user_id()
      )
    )
  );

-- ============================================================================
-- PART 10: Submissions Table Policies
-- ============================================================================

-- Students see their own submissions
-- Teachers see submissions for their classes
-- Admins see all submissions in tenant
CREATE POLICY submissions_select_by_role ON submissions
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR (current_user_role() = 'student' AND student_id = current_user_id())
      OR (
        current_user_role() = 'teacher'
        AND EXISTS (
          SELECT 1 FROM assignments a
          INNER JOIN classes c ON a.class_id = c.id
          WHERE a.id = submissions.assignment_id
            AND c.teacher_id = current_user_id()
        )
      )
    )
  );

-- Students can create their own submissions
CREATE POLICY submissions_insert_student ON submissions
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'student'
    AND student_id = current_user_id()
  );

-- Students can update their own submissions (before grading)
CREATE POLICY submissions_update_student ON submissions
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'student'
    AND student_id = current_user_id()
    AND status = 'submitted'
  );

-- Students can delete their own submissions (before grading)
CREATE POLICY submissions_delete_student ON submissions
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'student'
    AND student_id = current_user_id()
    AND status = 'submitted'
  );

-- ============================================================================
-- PART 11: Grades Table Policies
-- ============================================================================

-- Students see their own grades
-- Teachers see grades for their classes
-- Admins see all grades in tenant
CREATE POLICY grades_select_by_role ON grades
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM submissions s
        WHERE s.id = grades.submission_id
          AND (
            (current_user_role() = 'student' AND s.student_id = current_user_id())
            OR (
              current_user_role() = 'teacher'
              AND EXISTS (
                SELECT 1 FROM assignments a
                INNER JOIN classes c ON a.class_id = c.id
                WHERE a.id = s.assignment_id
                  AND c.teacher_id = current_user_id()
              )
            )
          )
      )
    )
  );

-- Teachers can create grades for their classes
-- Admins can create any grade
CREATE POLICY grades_insert_teacher_or_admin ON grades
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM submissions s
        INNER JOIN assignments a ON s.assignment_id = a.id
        INNER JOIN classes c ON a.class_id = c.id
        WHERE s.id = grades.submission_id
          AND c.teacher_id = current_user_id()
      )
    )
  );

-- Teachers can update grades for their classes
-- Admins can update any grade
CREATE POLICY grades_update_teacher_or_admin ON grades
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM submissions s
        INNER JOIN assignments a ON s.assignment_id = a.id
        INNER JOIN classes c ON a.class_id = c.id
        WHERE s.id = grades.submission_id
          AND c.teacher_id = current_user_id()
      )
    )
  );

-- Only admins can delete grades
CREATE POLICY grades_delete_admin ON grades
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- ============================================================================
-- PART 12: Audit Logs Table Policies
-- ============================================================================

-- Only admins can view audit logs (for their tenant)
CREATE POLICY audit_logs_select_admin ON audit_logs
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- System can insert audit logs (no user-facing insert policy)
-- Audit logs are inserted via triggers or application code with elevated privileges

-- Audit logs are immutable (no update or delete)

-- ============================================================================
-- PART 13: Invoices Table Policies
-- ============================================================================

-- Students see their own invoices
-- Admins see all invoices in tenant
CREATE POLICY invoices_select_student_or_admin ON invoices
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR (current_user_role() = 'student' AND student_id = current_user_id())
    )
  );

-- Admins can create invoices
CREATE POLICY invoices_insert_admin ON invoices
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- Admins can update invoices
CREATE POLICY invoices_update_admin ON invoices
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- Admins can delete invoices
CREATE POLICY invoices_delete_admin ON invoices
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- ============================================================================
-- PART 14: Payments Table Policies
-- ============================================================================

-- Students see their own payments
-- Admins see all payments in tenant
CREATE POLICY payments_select_student_or_admin ON payments
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR (current_user_role() = 'student' AND student_id = current_user_id())
    )
  );

-- Admins can record payments
CREATE POLICY payments_insert_admin ON payments
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- Admins can update payments
CREATE POLICY payments_update_admin ON payments
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- Admins can delete payments
CREATE POLICY payments_delete_admin ON payments
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- ============================================================================
-- PART 15: Conversations Table Policies
-- ============================================================================

-- Users can only see their own conversations
CREATE POLICY conversations_select_own ON conversations
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND user_id = current_user_id()
  );

-- Users can create their own conversations
CREATE POLICY conversations_insert_own ON conversations
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_id = current_user_id()
  );

-- Users can update their own conversations
CREATE POLICY conversations_update_own ON conversations
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND user_id = current_user_id()
  );

-- Users can delete their own conversations
CREATE POLICY conversations_delete_own ON conversations
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_id = current_user_id()
  );

-- ============================================================================
-- PART 16: Exports Table Policies
-- ============================================================================

-- Admins see all exports in tenant
-- Users see their own requested exports
CREATE POLICY exports_select_admin_or_requester ON exports
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR requested_by = current_user_id()
    )
  );

-- Admins can create exports
CREATE POLICY exports_insert_admin ON exports
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- Admins can update exports
CREATE POLICY exports_update_admin ON exports
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- Admins can delete exports
CREATE POLICY exports_delete_admin ON exports
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- ============================================================================
-- PART 17: Grant Permissions to Application Role
-- ============================================================================

-- Note: Ensure your application connects with a dedicated database role
-- For example: CREATE ROLE mycastle_app;
-- Then grant necessary permissions:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mycastle_app;
-- GRANT EXECUTE ON FUNCTION set_user_context TO mycastle_app;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
