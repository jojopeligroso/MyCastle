-- ================================================
-- ESL Learning Platform - Database Schema
-- Migration 006: Seed Test Data
-- ================================================

-- This file populates the database with realistic test data:
-- - 1 admin user
-- - 2 teacher users
-- - 5 student users
-- - 3 courses with lessons
-- - Enrollments
-- - Assignments and submissions
-- - Sample conversation data
-- - Content library items
-- - Announcements and feedback

-- ================================================
-- 1. SEED USERS
-- ================================================

-- Admin User
INSERT INTO users (id, email, role, full_name, is_active) VALUES
('a0000000-0000-0000-0000-000000000001', 'admin@eslplatform.edu', 'admin', 'System Administrator', true);

-- Teacher Users
INSERT INTO users (id, email, role, full_name, is_active) VALUES
('t0000000-0000-0000-0000-000000000001', 'sarah.johnson@eslplatform.edu', 'teacher', 'Sarah Johnson', true),
('t0000000-0000-0000-0000-000000000002', 'michael.chen@eslplatform.edu', 'teacher', 'Michael Chen', true);

-- Student Users
INSERT INTO users (id, email, role, full_name, is_active) VALUES
('s0000000-0000-0000-0000-000000000001', 'maria.garcia@student.edu', 'student', 'Maria Garcia', true),
('s0000000-0000-0000-0000-000000000002', 'ahmed.hassan@student.edu', 'student', 'Ahmed Hassan', true),
('s0000000-0000-0000-0000-000000000003', 'yuki.tanaka@student.edu', 'student', 'Yuki Tanaka', true),
('s0000000-0000-0000-0000-000000000004', 'emma.williams@student.edu', 'student', 'Emma Williams', true),
('s0000000-0000-0000-0000-000000000005', 'carlos.rodriguez@student.edu', 'student', 'Carlos Rodriguez', true);

-- ================================================
-- 2. SEED COURSES
-- ================================================

INSERT INTO courses (id, title, description, curriculum, grade_level, is_published, created_by) VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'English Grammar Fundamentals',
    'Master the basics of English grammar including parts of speech, sentence structure, and punctuation.',
    '{"objectives": ["Identify parts of speech", "Construct proper sentences", "Use punctuation correctly", "Understand verb tenses"], "standards": ["Common Core ELA"]}'::jsonb,
    'Beginner',
    true,
    't0000000-0000-0000-0000-000000000001'
),
(
    'c0000000-0000-0000-0000-000000000002',
    'Conversational English',
    'Develop practical speaking and listening skills for everyday conversations.',
    '{"objectives": ["Greet and introduce yourself", "Ask and answer questions", "Discuss daily activities", "Express opinions"], "standards": ["CEFR A2-B1"]}'::jsonb,
    'Intermediate',
    true,
    't0000000-0000-0000-0000-000000000001'
),
(
    'c0000000-0000-0000-0000-000000000003',
    'Academic Writing Skills',
    'Learn to write clear, structured essays and research papers.',
    '{"objectives": ["Write thesis statements", "Structure paragraphs", "Cite sources properly", "Edit and revise"], "standards": ["Academic Writing Standards"]}'::jsonb,
    'Advanced',
    true,
    't0000000-0000-0000-0000-000000000002'
);

-- ================================================
-- 3. SEED LESSONS
-- ================================================

-- Lessons for English Grammar Fundamentals
INSERT INTO lessons (id, course_id, title, content, "order", duration_minutes, learning_objectives) VALUES
(
    'l0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Introduction to Parts of Speech',
    '{"slides": [{"title": "What are Parts of Speech?", "content": "Parts of speech are categories of words..."}, {"title": "Nouns", "content": "A noun is a person, place, thing, or idea..."}], "exercises": ["Identify nouns in sentences", "Classify common vs proper nouns"]}'::jsonb,
    1,
    45,
    '["Define parts of speech", "Identify nouns in context"]'::jsonb
),
(
    'l0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'Verbs and Verb Tenses',
    '{"slides": [{"title": "Action Words", "content": "Verbs express action or state of being..."}, {"title": "Present Tense", "content": "Used for current actions..."}], "exercises": ["Conjugate regular verbs", "Identify verb tenses"]}'::jsonb,
    2,
    60,
    '["Identify verbs", "Use present, past, and future tenses correctly"]'::jsonb
),
(
    'l0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000001',
    'Sentence Structure Basics',
    '{"slides": [{"title": "Subject and Predicate", "content": "Every sentence needs a subject and predicate..."}, {"title": "Simple Sentences", "content": "A simple sentence has one independent clause..."}], "exercises": ["Build simple sentences", "Identify subject and predicate"]}'::jsonb,
    3,
    50,
    '["Construct simple sentences", "Identify sentence components"]'::jsonb
);

-- Lessons for Conversational English
INSERT INTO lessons (id, course_id, title, content, "order", duration_minutes, learning_objectives) VALUES
(
    'l0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000002',
    'Greetings and Introductions',
    '{"dialogues": [{"speakers": ["A", "B"], "lines": ["Hello! Im Sarah.", "Hi Sarah, Im Michael. Nice to meet you."]}], "phrases": ["Nice to meet you", "How are you?", "What do you do?"]}'::jsonb,
    1,
    40,
    '["Use common greetings", "Introduce yourself", "Ask basic questions"]'::jsonb
),
(
    'l0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000002',
    'Talking About Daily Routines',
    '{"dialogues": [{"topic": "Morning routine", "vocabulary": ["wake up", "brush teeth", "have breakfast"]}], "practice": ["Describe your morning", "Ask about someones day"]}'::jsonb,
    2,
    45,
    '["Describe daily activities", "Use time expressions", "Ask about routines"]'::jsonb
);

-- Lessons for Academic Writing Skills
INSERT INTO lessons (id, course_id, title, content, "order", duration_minutes, learning_objectives) VALUES
(
    'l0000000-0000-0000-0000-000000000006',
    'c0000000-0000-0000-0000-000000000003',
    'Crafting Thesis Statements',
    '{"examples": [{"weak": "This paper is about climate change.", "strong": "Human activities are the primary driver of recent climate change."}], "guidelines": ["Be specific", "Take a position", "Preview main points"]}'::jsonb,
    1,
    55,
    '["Write clear thesis statements", "Distinguish strong from weak theses"]'::jsonb
);

-- ================================================
-- 4. SEED ENROLLMENTS
-- ================================================

-- Students enrolled in various courses
INSERT INTO enrollments (id, student_id, course_id, enrolled_at, status, progress_percentage) VALUES
-- Maria Garcia (3 courses)
('e0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '30 days', 'active', 66.67),
('e0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '20 days', 'active', 40.00),

-- Ahmed Hassan (2 courses)
('e0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '25 days', 'active', 33.33),
('e0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '15 days', 'active', 20.00),

-- Yuki Tanaka (2 courses)
('e0000000-0000-0000-0000-000000000005', 's0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '35 days', 'active', 80.00),
('e0000000-0000-0000-0000-000000000006', 's0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '10 days', 'active', 10.00),

-- Emma Williams (1 course, completed)
('e0000000-0000-0000-0000-000000000007', 's0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '60 days', 'completed', 100.00),

-- Carlos Rodriguez (1 course)
('e0000000-0000-0000-0000-000000000008', 's0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '5 days', 'active', 10.00);

-- ================================================
-- 5. SEED ASSIGNMENTS
-- ================================================

-- Assignment for Grammar Fundamentals Course
INSERT INTO assignments (id, course_id, lesson_id, title, description, type, questions, answer_key, max_score, due_date, created_by) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'l0000000-0000-0000-0000-000000000001',
    'Parts of Speech Quiz',
    'Identify the parts of speech in sentences.',
    'quiz',
    '[
        {"id": "q1", "type": "multiple_choice", "question": "What part of speech is the word \"quickly\"?", "options": ["noun", "verb", "adjective", "adverb"], "points": 2},
        {"id": "q2", "type": "multiple_choice", "question": "In the sentence \"The cat sleeps,\" what is \"cat\"?", "options": ["verb", "noun", "adjective", "adverb"], "points": 2},
        {"id": "q3", "type": "multiple_choice", "question": "What part of speech is \"beautiful\"?", "options": ["noun", "verb", "adjective", "adverb"], "points": 2}
    ]'::jsonb,
    '[
        {"id": "q1", "correct_answer": "adverb"},
        {"id": "q2", "correct_answer": "noun"},
        {"id": "q3", "correct_answer": "adjective"}
    ]'::jsonb,
    6,
    NOW() + INTERVAL '7 days',
    't0000000-0000-0000-0000-000000000001'
),
(
    'a0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'l0000000-0000-0000-0000-000000000002',
    'Verb Tense Practice',
    'Complete sentences using the correct verb tense.',
    'homework',
    '[
        {"id": "q1", "type": "short_answer", "question": "Complete: Yesterday, I ___ (go) to the store.", "points": 3},
        {"id": "q2", "type": "short_answer", "question": "Complete: Tomorrow, she ___ (visit) her grandmother.", "points": 3}
    ]'::jsonb,
    '[
        {"id": "q1", "sample_answer": "went"},
        {"id": "q2", "sample_answer": "will visit"}
    ]'::jsonb,
    6,
    NOW() + INTERVAL '14 days',
    't0000000-0000-0000-0000-000000000001'
),
(
    'a0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000002',
    'l0000000-0000-0000-0000-000000000004',
    'Introduction Dialogue Practice',
    'Record yourself introducing yourself in English.',
    'practice',
    '[
        {"id": "q1", "type": "recording", "question": "Introduce yourself: name, where youre from, and one hobby.", "points": 10}
    ]'::jsonb,
    '[]'::jsonb,
    10,
    NOW() + INTERVAL '5 days',
    't0000000-0000-0000-0000-000000000001'
);

-- ================================================
-- 6. SEED SUBMISSIONS
-- ================================================

-- Sample submissions from students
INSERT INTO submissions (id, assignment_id, student_id, answers, score, feedback, submitted_at, graded_at, graded_by) VALUES
(
    'sub00000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    's0000000-0000-0000-0000-000000000001',
    '[
        {"id": "q1", "answer": "adverb"},
        {"id": "q2", "answer": "noun"},
        {"id": "q3", "answer": "adjective"}
    ]'::jsonb,
    6.00,
    'Perfect score! Excellent understanding of parts of speech.',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 days',
    't0000000-0000-0000-0000-000000000001'
),
(
    'sub00000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    's0000000-0000-0000-0000-000000000002',
    '[
        {"id": "q1", "answer": "adjective"},
        {"id": "q2", "answer": "noun"},
        {"id": "q3", "answer": "adjective"}
    ]'::jsonb,
    4.00,
    'Good work! Remember that words ending in -ly are often adverbs.',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 days',
    't0000000-0000-0000-0000-000000000001'
),
(
    'sub00000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000002',
    's0000000-0000-0000-0000-000000000001',
    '[
        {"id": "q1", "answer": "went"},
        {"id": "q2", "answer": "will visit"}
    ]'::jsonb,
    6.00,
    'Excellent! You have a strong grasp of verb tenses.',
    NOW() - INTERVAL '1 day',
    NOW(),
    't0000000-0000-0000-0000-000000000001'
);

-- ================================================
-- 7. SEED STUDENT PROGRESS
-- ================================================

INSERT INTO student_progress (student_id, course_id, lesson_id, topic, mastery_level, attempts, last_activity, metadata) VALUES
-- Maria Garcia progress
('s0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'l0000000-0000-0000-0000-000000000001', 'Parts of Speech', 'mastered', 3, NOW() - INTERVAL '3 days', '{"time_spent_minutes": 60, "hints_used": 1}'::jsonb),
('s0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'l0000000-0000-0000-0000-000000000002', 'Verb Tenses', 'mastered', 2, NOW() - INTERVAL '1 day', '{"time_spent_minutes": 90, "hints_used": 0}'::jsonb),
('s0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'l0000000-0000-0000-0000-000000000003', 'Sentence Structure', 'learning', 1, NOW(), '{"time_spent_minutes": 30, "hints_used": 2}'::jsonb),

-- Ahmed Hassan progress
('s0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'l0000000-0000-0000-0000-000000000001', 'Parts of Speech', 'learning', 2, NOW() - INTERVAL '2 days', '{"time_spent_minutes": 45, "hints_used": 3}'::jsonb),

-- Yuki Tanaka progress
('s0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'l0000000-0000-0000-0000-000000000004', 'Greetings', 'mastered', 1, NOW() - INTERVAL '5 days', '{"time_spent_minutes": 40, "hints_used": 0}'::jsonb),
('s0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'l0000000-0000-0000-0000-000000000005', 'Daily Routines', 'mastered', 2, NOW() - INTERVAL '2 days', '{"time_spent_minutes": 50, "hints_used": 1}'::jsonb);

-- ================================================
-- 8. SEED CONVERSATION SESSIONS
-- ================================================

INSERT INTO conversation_sessions (id, user_id, role_context, started_at, ended_at, metadata) VALUES
(
    'cs000000-0000-0000-0000-000000000001',
    's0000000-0000-0000-0000-000000000001',
    'student',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour 45 minutes',
    '{"session_type": "homework_help", "course_context": "Grammar Fundamentals"}'::jsonb
),
(
    'cs000000-0000-0000-0000-000000000002',
    't0000000-0000-0000-0000-000000000001',
    'teacher',
    NOW() - INTERVAL '4 hours',
    NOW() - INTERVAL '3 hours 30 minutes',
    '{"session_type": "lesson_planning", "course_context": "Conversational English"}'::jsonb
);

-- ================================================
-- 9. SEED CONVERSATION MESSAGES
-- ================================================

INSERT INTO conversation_messages (session_id, role, content, metadata, created_at) VALUES
(
    'cs000000-0000-0000-0000-000000000001',
    'user',
    'Can you help me understand the difference between adjectives and adverbs?',
    '{"tokens_used": 15}'::jsonb,
    NOW() - INTERVAL '2 hours'
),
(
    'cs000000-0000-0000-0000-000000000001',
    'assistant',
    'Of course! Adjectives describe nouns (people, places, things), while adverbs describe verbs, adjectives, or other adverbs. For example, in \"The quick rabbit runs quickly,\" \"quick\" is an adjective describing the rabbit, and \"quickly\" is an adverb describing how the rabbit runs. Would you like some practice exercises?',
    '{"tokens_used": 85, "tool_calls": [{"tool": "searchCourseContent", "params": {"query": "adjectives adverbs"}}]}'::jsonb,
    NOW() - INTERVAL '2 hours' + INTERVAL '5 seconds'
),
(
    'cs000000-0000-0000-0000-000000000001',
    'user',
    'Yes, please!',
    '{"tokens_used": 5}'::jsonb,
    NOW() - INTERVAL '2 hours' + INTERVAL '30 seconds'
),
(
    'cs000000-0000-0000-0000-000000000001',
    'assistant',
    'Great! Here are some sentences. Identify whether the highlighted word is an adjective or adverb:\n1. The *happy* child played.\n2. She sings *beautifully*.\n3. He is a *careful* driver.\n4. They work *hard*.',
    '{"tokens_used": 70}'::jsonb,
    NOW() - INTERVAL '2 hours' + INTERVAL '35 seconds'
);

-- ================================================
-- 10. SEED CONTENT LIBRARY
-- ================================================

INSERT INTO content_library (id, title, content_type, content, tags, course_id, is_public, created_by) VALUES
(
    'cl000000-0000-0000-0000-000000000001',
    'Common Grammar Mistakes and How to Avoid Them',
    'reference',
    '{"sections": [{"title": "Subject-Verb Agreement", "content": "The subject and verb must agree in number..."}, {"title": "Comma Splices", "content": "Avoid joining two independent clauses with only a comma..."}]}'::jsonb,
    ARRAY['grammar', 'common-errors', 'reference'],
    'c0000000-0000-0000-0000-000000000001',
    true,
    't0000000-0000-0000-0000-000000000001'
),
(
    'cl000000-0000-0000-0000-000000000002',
    'Everyday Phrases for Conversation',
    'reference',
    '{"categories": [{"name": "Greetings", "phrases": ["How are you doing?", "Whats up?", "Long time no see!"]}, {"name": "Farewells", "phrases": ["See you later", "Take care", "Have a good one"]}]}'::jsonb,
    ARRAY['conversation', 'phrases', 'vocabulary'],
    'c0000000-0000-0000-0000-000000000002',
    true,
    't0000000-0000-0000-0000-000000000001'
),
(
    'cl000000-0000-0000-0000-000000000003',
    'Essay Structure Template',
    'lesson_plan',
    '{"structure": {"introduction": "Hook, background, thesis statement", "body_paragraphs": "Topic sentence, evidence, analysis, transition", "conclusion": "Restate thesis, summarize points, closing thought"}}'::jsonb,
    ARRAY['writing', 'essays', 'academic'],
    'c0000000-0000-0000-0000-000000000003',
    false,
    't0000000-0000-0000-0000-000000000002'
);

-- ================================================
-- 11. SEED FEEDBACK
-- ================================================

INSERT INTO feedback (id, user_id, category, subject, message, status, priority) VALUES
(
    'fb000000-0000-0000-0000-000000000001',
    's0000000-0000-0000-0000-000000000001',
    'feature_request',
    'Mobile App for Practice',
    'It would be great to have a mobile app so I can practice on the go. Maybe with offline mode for downloaded lessons?',
    'open',
    'medium'
),
(
    'fb000000-0000-0000-0000-000000000002',
    's0000000-0000-0000-0000-000000000003',
    'content_feedback',
    'More Listening Exercises',
    'I love the conversational English course, but Id like more audio exercises to practice listening comprehension.',
    'in_progress',
    'high'
),
(
    'fb000000-0000-0000-0000-000000000003',
    't0000000-0000-0000-0000-000000000001',
    'ai_response',
    'AI Assistant Suggestions',
    'The AI assistant sometimes provides answers that are too advanced for beginner students. Could there be a way to adjust the complexity based on the students level?',
    'resolved',
    'high'
);

-- ================================================
-- 12. SEED ANNOUNCEMENTS
-- ================================================

INSERT INTO announcements (id, course_id, author_id, title, message, target_audience, is_published) VALUES
(
    'an000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000001',
    'Welcome to English Grammar Fundamentals!',
    'Welcome to the course! Were excited to help you master English grammar. Remember to complete the assignments on time and dont hesitate to ask questions in your AI chat sessions. Good luck!',
    'course_students',
    true
),
(
    'an000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000001',
    'New Practice Exercises Available',
    'Ive added extra practice exercises to Lesson 2 (Verbs and Verb Tenses). These are optional but highly recommended for those who want more practice!',
    'course_students',
    true
),
(
    'an000000-0000-0000-0000-000000000003',
    NULL,
    'a0000000-0000-0000-0000-000000000001',
    'Platform Maintenance Scheduled',
    'Our platform will undergo scheduled maintenance this Saturday from 2-4 AM EST. During this time, the platform may be temporarily unavailable. Thank you for your patience!',
    'all',
    true
);

-- ================================================
-- 13. SEED SYSTEM LOGS
-- ================================================

INSERT INTO system_logs (event_type, user_id, metadata) VALUES
('user_login', 's0000000-0000-0000-0000-000000000001', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}'::jsonb),
('user_login', 't0000000-0000-0000-0000-000000000001', '{"ip_address": "192.168.1.101", "user_agent": "Mozilla/5.0"}'::jsonb),
('ai_query', 's0000000-0000-0000-0000-000000000001', '{"query": "grammar help", "response_time_ms": 450, "tokens_used": 100}'::jsonb),
('content_created', 't0000000-0000-0000-0000-000000000001', '{"content_type": "lesson", "course_id": "c0000000-0000-0000-0000-000000000001"}'::jsonb),
('assignment_submitted', 's0000000-0000-0000-0000-000000000001', '{"assignment_id": "a0000000-0000-0000-0000-000000000001", "submission_time_before_due": "4 days"}'::jsonb);

-- ================================================
-- End of Migration 006
-- ================================================

-- Display summary of seeded data
DO $$
DECLARE
    user_count INTEGER;
    course_count INTEGER;
    lesson_count INTEGER;
    enrollment_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO course_count FROM courses;
    SELECT COUNT(*) INTO lesson_count FROM lessons;
    SELECT COUNT(*) INTO enrollment_count FROM enrollments;

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Database seeded successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Users: %', user_count;
    RAISE NOTICE 'Courses: %', course_count;
    RAISE NOTICE 'Lessons: %', lesson_count;
    RAISE NOTICE 'Enrollments: %', enrollment_count;
    RAISE NOTICE '==============================================';
END $$;
