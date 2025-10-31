-- ================================================
-- ESL Learning Platform - Database Schema
-- Migration 002: Create Indexes for Performance
-- ================================================

-- ================================================
-- USERS TABLE INDEXES
-- ================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ================================================
-- COURSES TABLE INDEXES
-- ================================================
CREATE INDEX idx_courses_created_by ON courses(created_by);
CREATE INDEX idx_courses_is_published ON courses(is_published);
CREATE INDEX idx_courses_grade_level ON courses(grade_level);

-- ================================================
-- LESSONS TABLE INDEXES
-- ================================================
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_order ON lessons(course_id, "order");

-- ================================================
-- ENROLLMENTS TABLE INDEXES
-- ================================================
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_enrollments_student_course ON enrollments(student_id, course_id);

-- ================================================
-- ASSIGNMENTS TABLE INDEXES
-- ================================================
CREATE INDEX idx_assignments_course_id ON assignments(course_id);
CREATE INDEX idx_assignments_lesson_id ON assignments(lesson_id);
CREATE INDEX idx_assignments_created_by ON assignments(created_by);
CREATE INDEX idx_assignments_type ON assignments(type);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);

-- ================================================
-- SUBMISSIONS TABLE INDEXES
-- ================================================
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_submissions_graded_by ON submissions(graded_by);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);
CREATE INDEX idx_submissions_graded_at ON submissions(graded_at);
CREATE INDEX idx_submissions_student_assignment ON submissions(student_id, assignment_id);

-- ================================================
-- STUDENT_PROGRESS TABLE INDEXES
-- ================================================
CREATE INDEX idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX idx_student_progress_course_id ON student_progress(course_id);
CREATE INDEX idx_student_progress_lesson_id ON student_progress(lesson_id);
CREATE INDEX idx_student_progress_mastery_level ON student_progress(mastery_level);
CREATE INDEX idx_student_progress_last_activity ON student_progress(last_activity);
CREATE INDEX idx_student_progress_student_course ON student_progress(student_id, course_id);

-- ================================================
-- CONVERSATION_SESSIONS TABLE INDEXES
-- ================================================
CREATE INDEX idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX idx_conversation_sessions_role_context ON conversation_sessions(role_context);
CREATE INDEX idx_conversation_sessions_started_at ON conversation_sessions(started_at);

-- ================================================
-- CONVERSATION_MESSAGES TABLE INDEXES
-- ================================================
CREATE INDEX idx_conversation_messages_session_id ON conversation_messages(session_id);
CREATE INDEX idx_conversation_messages_role ON conversation_messages(role);
CREATE INDEX idx_conversation_messages_created_at ON conversation_messages(created_at);

-- ================================================
-- CONTENT_LIBRARY TABLE INDEXES
-- ================================================
CREATE INDEX idx_content_library_course_id ON content_library(course_id);
CREATE INDEX idx_content_library_created_by ON content_library(created_by);
CREATE INDEX idx_content_library_content_type ON content_library(content_type);
CREATE INDEX idx_content_library_is_public ON content_library(is_public);
CREATE INDEX idx_content_library_tags ON content_library USING GIN(tags);

-- ================================================
-- FEEDBACK TABLE INDEXES
-- ================================================
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_category ON feedback(category);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_priority ON feedback(priority);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);

-- ================================================
-- ANNOUNCEMENTS TABLE INDEXES
-- ================================================
CREATE INDEX idx_announcements_course_id ON announcements(course_id);
CREATE INDEX idx_announcements_author_id ON announcements(author_id);
CREATE INDEX idx_announcements_target_audience ON announcements(target_audience);
CREATE INDEX idx_announcements_is_published ON announcements(is_published);
CREATE INDEX idx_announcements_created_at ON announcements(created_at);

-- ================================================
-- SYSTEM_LOGS TABLE INDEXES
-- ================================================
CREATE INDEX idx_system_logs_event_type ON system_logs(event_type);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- GIN index for JSONB metadata searching
CREATE INDEX idx_system_logs_metadata ON system_logs USING GIN(metadata);

-- ================================================
-- End of Migration 002
-- ================================================
