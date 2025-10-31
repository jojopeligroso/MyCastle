-- ================================================
-- ESL Learning Platform - Database Schema
-- Migration 005: Create Database Functions
-- ================================================

-- ================================================
-- 1. AUTO-UPDATE TIMESTAMP TRIGGER
-- ================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_library_updated_at
    BEFORE UPDATE ON content_library
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 2. UPDATE ENROLLMENT PROGRESS
-- ================================================

-- Function to calculate and update enrollment progress percentage
CREATE OR REPLACE FUNCTION update_enrollment_progress(
    p_student_id UUID,
    p_course_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
    total_lessons INTEGER;
    completed_lessons INTEGER;
    progress DECIMAL;
BEGIN
    -- Count total lessons in course
    SELECT COUNT(*) INTO total_lessons
    FROM lessons
    WHERE course_id = p_course_id;

    -- Count lessons mastered by student
    SELECT COUNT(DISTINCT lesson_id) INTO completed_lessons
    FROM student_progress
    WHERE student_id = p_student_id
        AND course_id = p_course_id
        AND lesson_id IS NOT NULL
        AND mastery_level = 'mastered';

    -- Calculate progress percentage
    IF total_lessons > 0 THEN
        progress := (completed_lessons::DECIMAL / total_lessons::DECIMAL) * 100;
    ELSE
        progress := 0;
    END IF;

    -- Update enrollment record
    UPDATE enrollments
    SET progress_percentage = progress
    WHERE student_id = p_student_id
        AND course_id = p_course_id;

    RETURN progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 3. AUTO-GRADE ASSIGNMENT
-- ================================================

-- Function to automatically grade multiple choice assignments
CREATE OR REPLACE FUNCTION auto_grade_submission(
    p_submission_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
    v_assignment_id UUID;
    v_questions JSONB;
    v_answer_key JSONB;
    v_student_answers JSONB;
    v_max_score INTEGER;
    v_earned_score DECIMAL := 0;
    v_question JSONB;
    v_i INTEGER;
BEGIN
    -- Get submission data
    SELECT assignment_id, answers INTO v_assignment_id, v_student_answers
    FROM submissions
    WHERE id = p_submission_id;

    -- Get assignment data
    SELECT questions, answer_key, max_score INTO v_questions, v_answer_key, v_max_score
    FROM assignments
    WHERE id = v_assignment_id;

    -- Grade each question
    FOR v_i IN 0..(jsonb_array_length(v_questions) - 1)
    LOOP
        v_question := v_questions->v_i;

        -- Only auto-grade multiple choice questions
        IF v_question->>'type' = 'multiple_choice' THEN
            IF (v_student_answers->v_i->>'answer') = (v_answer_key->v_i->>'correct_answer') THEN
                v_earned_score := v_earned_score + (v_question->>'points')::DECIMAL;
            END IF;
        END IF;
    END LOOP;

    -- Update submission with score
    UPDATE submissions
    SET score = v_earned_score,
        graded_at = NOW()
    WHERE id = p_submission_id;

    RETURN v_earned_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 4. GET COURSE STATISTICS
-- ================================================

-- Function to get comprehensive course statistics for teachers
CREATE OR REPLACE FUNCTION get_course_statistics(p_course_id UUID)
RETURNS TABLE (
    total_students INTEGER,
    active_students INTEGER,
    completed_students INTEGER,
    average_progress DECIMAL,
    total_assignments INTEGER,
    total_submissions INTEGER,
    average_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT e.student_id)::INTEGER AS total_students,
        COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.student_id END)::INTEGER AS active_students,
        COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.student_id END)::INTEGER AS completed_students,
        COALESCE(AVG(e.progress_percentage), 0)::DECIMAL AS average_progress,
        COUNT(DISTINCT a.id)::INTEGER AS total_assignments,
        COUNT(DISTINCT s.id)::INTEGER AS total_submissions,
        COALESCE(AVG(s.score), 0)::DECIMAL AS average_score
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN assignments a ON c.id = a.course_id
    LEFT JOIN submissions s ON a.id = s.assignment_id
    WHERE c.id = p_course_id
    GROUP BY c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 5. GET STUDENT PERFORMANCE SUMMARY
-- ================================================

-- Function to get a student's performance summary for a course
CREATE OR REPLACE FUNCTION get_student_performance(
    p_student_id UUID,
    p_course_id UUID
)
RETURNS TABLE (
    course_title TEXT,
    progress_percentage DECIMAL,
    assignments_completed INTEGER,
    assignments_total INTEGER,
    average_score DECIMAL,
    mastered_topics INTEGER,
    struggling_topics INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.title AS course_title,
        COALESCE(e.progress_percentage, 0) AS progress_percentage,
        COUNT(DISTINCT s.id)::INTEGER AS assignments_completed,
        COUNT(DISTINCT a.id)::INTEGER AS assignments_total,
        COALESCE(AVG(s.score), 0)::DECIMAL AS average_score,
        COUNT(DISTINCT CASE WHEN sp.mastery_level = 'mastered' THEN sp.topic END)::INTEGER AS mastered_topics,
        COUNT(DISTINCT CASE WHEN sp.mastery_level = 'struggling' THEN sp.topic END)::INTEGER AS struggling_topics
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id AND e.student_id = p_student_id
    LEFT JOIN assignments a ON c.id = a.course_id
    LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = p_student_id
    LEFT JOIN student_progress sp ON c.id = sp.course_id AND sp.student_id = p_student_id
    WHERE c.id = p_course_id
    GROUP BY c.id, c.title, e.progress_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 6. LOG SYSTEM EVENT
-- ================================================

-- Function to easily log system events
CREATE OR REPLACE FUNCTION log_system_event(
    p_event_type TEXT,
    p_user_id UUID,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO system_logs (event_type, user_id, metadata)
    VALUES (p_event_type, p_user_id, p_metadata)
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 7. SEARCH CONTENT LIBRARY
-- ================================================

-- Function to search content library with text search
CREATE OR REPLACE FUNCTION search_content_library(
    p_search_term TEXT,
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content_type TEXT,
    tags TEXT[],
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cl.id,
        cl.title,
        cl.content_type,
        cl.tags,
        ts_rank(
            to_tsvector('english', cl.title || ' ' || COALESCE(cl.content::TEXT, '')),
            plainto_tsquery('english', p_search_term)
        ) AS relevance
    FROM content_library cl
    WHERE (
        cl.is_public = true
        OR cl.created_by = p_user_id
        OR EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = cl.course_id
                AND e.student_id = p_user_id
                AND e.status = 'active'
        )
    )
    AND (
        to_tsvector('english', cl.title || ' ' || COALESCE(cl.content::TEXT, ''))
        @@ plainto_tsquery('english', p_search_term)
    )
    ORDER BY relevance DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 8. GET UPCOMING ASSIGNMENTS
-- ================================================

-- Function to get upcoming assignments for a student
CREATE OR REPLACE FUNCTION get_upcoming_assignments(
    p_student_id UUID,
    p_days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE (
    assignment_id UUID,
    assignment_title TEXT,
    course_title TEXT,
    due_date TIMESTAMPTZ,
    max_score INTEGER,
    is_submitted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id AS assignment_id,
        a.title AS assignment_title,
        c.title AS course_title,
        a.due_date,
        a.max_score,
        EXISTS (
            SELECT 1 FROM submissions s
            WHERE s.assignment_id = a.id
                AND s.student_id = p_student_id
        ) AS is_submitted
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    JOIN enrollments e ON c.id = e.course_id
    WHERE e.student_id = p_student_id
        AND e.status = 'active'
        AND a.due_date IS NOT NULL
        AND a.due_date BETWEEN NOW() AND NOW() + (p_days_ahead || ' days')::INTERVAL
    ORDER BY a.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- End of Migration 005
-- ================================================
