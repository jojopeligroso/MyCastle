-- ================================================
-- ESL Learning Platform - Database Schema
-- Migration 001: Create All Tables
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1. USERS TABLE
-- ================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE users IS 'Primary entity for all platform users (students, teachers, admins)';
COMMENT ON COLUMN users.role IS 'User role: student, teacher, or admin';

-- ================================================
-- 2. COURSES TABLE
-- ================================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    curriculum JSONB,
    grade_level TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE courses IS 'Courses available on the platform';
COMMENT ON COLUMN courses.curriculum IS 'Structured course objectives/standards in JSON format';

-- ================================================
-- 3. LESSONS TABLE
-- ================================================
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB,
    "order" INTEGER NOT NULL,
    duration_minutes INTEGER,
    learning_objectives JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE lessons IS 'Individual lessons within a course';
COMMENT ON COLUMN lessons.content IS 'Lesson materials, slides, etc. in JSON format';
COMMENT ON COLUMN lessons."order" IS 'Position/order of lesson in course';

-- ================================================
-- 4. ENROLLMENTS TABLE
-- ================================================
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
    progress_percentage DECIMAL(5, 2) DEFAULT 0.00,
    UNIQUE(student_id, course_id)
);

COMMENT ON TABLE enrollments IS 'Junction table linking students to courses';
COMMENT ON COLUMN enrollments.progress_percentage IS 'Course completion percentage (0.00 to 100.00)';

-- ================================================
-- 5. ASSIGNMENTS TABLE
-- ================================================
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('quiz', 'homework', 'exam', 'practice')),
    questions JSONB NOT NULL,
    answer_key JSONB,
    max_score INTEGER NOT NULL,
    due_date TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE assignments IS 'Assignments/quizzes for courses';
COMMENT ON COLUMN assignments.questions IS 'Array of question objects in JSON format';
COMMENT ON COLUMN assignments.answer_key IS 'Solutions in JSON format';

-- ================================================
-- 6. SUBMISSIONS TABLE
-- ================================================
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,
    score DECIMAL(5, 2),
    feedback TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(assignment_id, student_id)
);

COMMENT ON TABLE submissions IS 'Student submissions for assignments';
COMMENT ON COLUMN submissions.answers IS 'Student answers in JSON format';

-- ================================================
-- 7. STUDENT_PROGRESS TABLE
-- ================================================
CREATE TABLE student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    mastery_level TEXT NOT NULL DEFAULT 'not_started' CHECK (mastery_level IN ('not_started', 'struggling', 'learning', 'mastered')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

COMMENT ON TABLE student_progress IS 'Tracks student progress through course materials';
COMMENT ON COLUMN student_progress.metadata IS 'Additional tracking data (hints used, time spent, etc.)';

-- ================================================
-- 8. CONVERSATION_SESSIONS TABLE
-- ================================================
CREATE TABLE conversation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_context TEXT NOT NULL CHECK (role_context IN ('student', 'teacher', 'admin')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    metadata JSONB
);

COMMENT ON TABLE conversation_sessions IS 'AI chat sessions for each user';
COMMENT ON COLUMN conversation_sessions.role_context IS 'Which AI assistant (student, teacher, or admin)';

-- ================================================
-- 9. CONVERSATION_MESSAGES TABLE
-- ================================================
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE conversation_messages IS 'Individual messages in AI conversations';
COMMENT ON COLUMN conversation_messages.metadata IS 'Tool calls, context used, tokens, etc.';

-- ================================================
-- 10. CONTENT_LIBRARY TABLE
-- ================================================
CREATE TABLE content_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('textbook', 'reference', 'worksheet', 'lesson_plan', 'quiz_template')),
    content JSONB NOT NULL,
    tags TEXT[] DEFAULT '{}',
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE content_library IS 'Repository of teaching materials and reference content';
COMMENT ON COLUMN content_library.tags IS 'Array of tags for categorization';

-- ================================================
-- 11. FEEDBACK TABLE
-- ================================================
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('bug', 'feature_request', 'content_feedback', 'ai_response', 'other')),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE feedback IS 'User feedback and support tickets';

-- ================================================
-- 12. ANNOUNCEMENTS TABLE
-- ================================================
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'course_students', 'specific_users')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_published BOOLEAN NOT NULL DEFAULT false
);

COMMENT ON TABLE announcements IS 'Teacher/admin announcements to students';

-- ================================================
-- 13. SYSTEM_LOGS TABLE
-- ================================================
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE system_logs IS 'Platform usage and system activity logs';
COMMENT ON COLUMN system_logs.event_type IS 'Event type (e.g., ai_query, user_login, content_created)';

-- ================================================
-- End of Migration 001
-- ================================================
