-- ================================================
-- ESL Learning Platform - Database Schema
-- Migration 004: Create Row Level Security Policies
-- ================================================

-- This file defines RLS policies for three user roles:
-- 1. Students: Can only access their own data
-- 2. Teachers: Can access their courses and enrolled students
-- 3. Admins: Full access with some restrictions

-- Note: In Supabase, auth.uid() returns the authenticated user's UUID
-- and auth.jwt()->>'role' returns custom claims from JWT

-- ================================================
-- HELPER FUNCTION: Get current user's role
-- ================================================
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ================================================
-- USERS TABLE POLICIES
-- ================================================

-- Students can read their own user record
CREATE POLICY "students_read_own_profile" ON users
  FOR SELECT
  USING (auth.uid() = id AND role = 'student');

-- Teachers can read their own user record
CREATE POLICY "teachers_read_own_profile" ON users
  FOR SELECT
  USING (auth.uid() = id AND role = 'teacher');

-- Teachers can read student profiles in their courses
CREATE POLICY "teachers_read_students_in_courses" ON users
  FOR SELECT
  USING (
    role = 'student' AND
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.student_id = users.id
        AND c.created_by = auth.uid()
    )
  );

-- Admins can read all user records
CREATE POLICY "admins_read_all_users" ON users
  FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Users can update their own profile (limited fields)
CREATE POLICY "users_update_own_profile" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can insert and update any user
CREATE POLICY "admins_manage_users" ON users
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- ================================================
-- COURSES TABLE POLICIES
-- ================================================

-- Students can read published courses they're enrolled in
CREATE POLICY "students_read_enrolled_courses" ON courses
  FOR SELECT
  USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = courses.id
        AND enrollments.student_id = auth.uid()
        AND enrollments.status = 'active'
    )
  );

-- Teachers can read and manage their own courses
CREATE POLICY "teachers_manage_own_courses" ON courses
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Teachers can create new courses
CREATE POLICY "teachers_create_courses" ON courses
  FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) = 'teacher' AND created_by = auth.uid());

-- Admins can read and manage all courses
CREATE POLICY "admins_manage_all_courses" ON courses
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- ================================================
-- LESSONS TABLE POLICIES
-- ================================================

-- Students can read lessons from enrolled courses
CREATE POLICY "students_read_enrolled_lessons" ON lessons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE c.id = lessons.course_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
        AND c.is_published = true
    )
  );

-- Teachers can manage lessons in their courses
CREATE POLICY "teachers_manage_own_lessons" ON lessons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
        AND courses.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
        AND courses.created_by = auth.uid()
    )
  );

-- Admins can manage all lessons
CREATE POLICY "admins_manage_all_lessons" ON lessons
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- ================================================
-- ENROLLMENTS TABLE POLICIES
-- ================================================

-- Students can read their own enrollments
CREATE POLICY "students_read_own_enrollments" ON enrollments
  FOR SELECT
  USING (student_id = auth.uid());

-- Students can create their own enrollments (self-enroll)
CREATE POLICY "students_create_own_enrollments" ON enrollments
  FOR INSERT
  WITH CHECK (student_id = auth.uid() AND get_user_role(auth.uid()) = 'student');

-- Teachers can read enrollments for their courses
CREATE POLICY "teachers_read_course_enrollments" ON enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = enrollments.course_id
        AND courses.created_by = auth.uid()
    )
  );

-- Teachers can manage enrollments for their courses
CREATE POLICY "teachers_manage_course_enrollments" ON enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = enrollments.course_id
        AND courses.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = enrollments.course_id
        AND courses.created_by = auth.uid()
    )
  );

-- Admins can manage all enrollments
CREATE POLICY "admins_manage_all_enrollments" ON enrollments
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- ================================================
-- ASSIGNMENTS TABLE POLICIES
-- ================================================

-- Students can read assignments from enrolled courses
CREATE POLICY "students_read_enrolled_assignments" ON assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = assignments.course_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- Teachers can manage assignments for their courses
CREATE POLICY "teachers_manage_own_assignments" ON assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = assignments.course_id
        AND courses.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = assignments.course_id
        AND courses.created_by = auth.uid()
    )
  );

-- Admins can manage all assignments
CREATE POLICY "admins_manage_all_assignments" ON assignments
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- ================================================
-- SUBMISSIONS TABLE POLICIES
-- ================================================

-- Students can read and manage their own submissions
CREATE POLICY "students_manage_own_submissions" ON submissions
  FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Teachers can read submissions for their course assignments
CREATE POLICY "teachers_read_course_submissions" ON submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = submissions.assignment_id
        AND c.created_by = auth.uid()
    )
  );

-- Teachers can grade (update) submissions for their course assignments
CREATE POLICY "teachers_grade_course_submissions" ON submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = submissions.assignment_id
        AND c.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = submissions.assignment_id
        AND c.created_by = auth.uid()
    )
  );

-- Admins can manage all submissions
CREATE POLICY "admins_manage_all_submissions" ON submissions
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- ================================================
-- STUDENT_PROGRESS TABLE POLICIES
-- ================================================

-- Students can read their own progress
CREATE POLICY "students_read_own_progress" ON student_progress
  FOR SELECT
  USING (student_id = auth.uid());

-- Students can update their own progress
CREATE POLICY "students_update_own_progress" ON student_progress
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "students_modify_own_progress" ON student_progress
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Teachers can read progress for students in their courses
CREATE POLICY "teachers_read_course_progress" ON student_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = student_progress.course_id
        AND courses.created_by = auth.uid()
    )
  );

-- Admins can read all progress
CREATE POLICY "admins_read_all_progress" ON student_progress
  FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- ================================================
-- CONVERSATION_SESSIONS TABLE POLICIES
-- ================================================

-- Users can manage their own conversation sessions
CREATE POLICY "users_manage_own_sessions" ON conversation_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can read all conversation sessions
CREATE POLICY "admins_read_all_sessions" ON conversation_sessions
  FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- ================================================
-- CONVERSATION_MESSAGES TABLE POLICIES
-- ================================================

-- Users can manage messages in their own sessions
CREATE POLICY "users_manage_own_messages" ON conversation_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversation_sessions
      WHERE conversation_sessions.id = conversation_messages.session_id
        AND conversation_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_sessions
      WHERE conversation_sessions.id = conversation_messages.session_id
        AND conversation_sessions.user_id = auth.uid()
    )
  );

-- Admins can read all messages
CREATE POLICY "admins_read_all_messages" ON conversation_messages
  FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- ================================================
-- CONTENT_LIBRARY TABLE POLICIES
-- ================================================

-- All users can read public content
CREATE POLICY "users_read_public_content" ON content_library
  FOR SELECT
  USING (is_public = true);

-- Students can read content for enrolled courses
CREATE POLICY "students_read_enrolled_content" ON content_library
  FOR SELECT
  USING (
    course_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = content_library.course_id
        AND enrollments.student_id = auth.uid()
        AND enrollments.status = 'active'
    )
  );

-- Teachers can manage their own content
CREATE POLICY "teachers_manage_own_content" ON content_library
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Teachers can read content for their courses
CREATE POLICY "teachers_read_course_content" ON content_library
  FOR SELECT
  USING (
    course_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = content_library.course_id
        AND courses.created_by = auth.uid()
    )
  );

-- Admins can manage all content
CREATE POLICY "admins_manage_all_content" ON content_library
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- ================================================
-- FEEDBACK TABLE POLICIES
-- ================================================

-- Users can manage their own feedback
CREATE POLICY "users_manage_own_feedback" ON feedback
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can read and manage all feedback
CREATE POLICY "admins_manage_all_feedback" ON feedback
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- ================================================
-- ANNOUNCEMENTS TABLE POLICIES
-- ================================================

-- Students can read announcements for their enrolled courses
CREATE POLICY "students_read_enrolled_announcements" ON announcements
  FOR SELECT
  USING (
    is_published = true AND (
      target_audience = 'all' OR
      (
        target_audience = 'course_students' AND
        course_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM enrollments
          WHERE enrollments.course_id = announcements.course_id
            AND enrollments.student_id = auth.uid()
            AND enrollments.status = 'active'
        )
      )
    )
  );

-- Teachers can manage announcements for their courses
CREATE POLICY "teachers_manage_course_announcements" ON announcements
  FOR ALL
  USING (
    author_id = auth.uid() OR
    (
      course_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM courses
        WHERE courses.id = announcements.course_id
          AND courses.created_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    author_id = auth.uid() AND
    (
      course_id IS NULL OR
      EXISTS (
        SELECT 1 FROM courses
        WHERE courses.id = announcements.course_id
          AND courses.created_by = auth.uid()
      )
    )
  );

-- Admins can manage all announcements
CREATE POLICY "admins_manage_all_announcements" ON announcements
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- ================================================
-- SYSTEM_LOGS TABLE POLICIES
-- ================================================

-- Only admins can read system logs
CREATE POLICY "admins_read_system_logs" ON system_logs
  FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- System can insert logs (service role)
-- Note: This will be handled by service role key, not RLS

-- ================================================
-- End of Migration 004
-- ================================================
