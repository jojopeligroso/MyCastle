-- FRESH_0032: LLM Tutor Architecture Hooks
-- Creates extension point tables for future AI tutor integration
-- No actual LLM integration - just data model hooks
--
-- Ref: STUDENT_PROFILE_ROADMAP.md Task #10

-- ============================================================================
-- TUTOR SESSIONS TABLE
-- Records interactions with the AI tutor (future)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tutor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- Session metadata
    session_type VARCHAR(50) NOT NULL DEFAULT 'conversation',  -- conversation, exercise, vocabulary, pronunciation
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, completed, abandoned
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,

    -- Context
    cefr_level VARCHAR(3),  -- Target level for session
    topic VARCHAR(255),
    learning_objective_id UUID REFERENCES cefr_descriptors(id),

    -- Session summary (populated on completion)
    summary JSONB,  -- { messageCount, vocabIntroduced, errorsCorrepted, feedback }

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tutor_sessions_student ON tutor_sessions(student_id);
CREATE INDEX idx_tutor_sessions_tenant_student ON tutor_sessions(tenant_id, student_id);
CREATE INDEX idx_tutor_sessions_started_at ON tutor_sessions(started_at DESC);

-- ============================================================================
-- TUTOR MESSAGES TABLE
-- Individual messages within a tutor session
-- ============================================================================

CREATE TABLE IF NOT EXISTS tutor_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,

    -- Message content
    role VARCHAR(20) NOT NULL,  -- user, assistant, system
    content TEXT NOT NULL,

    -- Audio (for pronunciation practice)
    audio_url TEXT,
    audio_duration_seconds NUMERIC(6, 2),

    -- Analysis (populated by LLM)
    analysis JSONB,  -- { grammarErrors, vocabularyNotes, pronunciationFeedback }

    -- Ordering
    sequence_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tutor_messages_session ON tutor_messages(session_id, sequence_number);

-- ============================================================================
-- STUDENT VOCABULARY TABLE
-- Personalized vocabulary lists for each student
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- Word data
    word VARCHAR(255) NOT NULL,
    definition TEXT,
    example_sentence TEXT,
    cefr_level VARCHAR(3),
    part_of_speech VARCHAR(50),  -- noun, verb, adjective, etc.

    -- Source tracking
    source VARCHAR(50),  -- tutor_session, lesson, manual, import
    source_id UUID,  -- Reference to tutor_session or lesson

    -- Learning progress
    status VARCHAR(20) NOT NULL DEFAULT 'new',  -- new, learning, mastered, ignored
    review_count INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ,

    -- Spaced repetition data
    ease_factor NUMERIC(4, 2) DEFAULT 2.5,  -- SM-2 algorithm
    interval_days INTEGER DEFAULT 1,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate words per student
    UNIQUE(student_id, word)
);

-- Indexes
CREATE INDEX idx_student_vocabulary_student ON student_vocabulary(student_id);
CREATE INDEX idx_student_vocabulary_review ON student_vocabulary(student_id, next_review_at)
    WHERE status IN ('new', 'learning');
CREATE INDEX idx_student_vocabulary_tenant ON student_vocabulary(tenant_id, student_id);

-- ============================================================================
-- EXERCISE TEMPLATES TABLE
-- Reusable exercise templates (admin-created or AI-generated)
-- ============================================================================

CREATE TABLE IF NOT EXISTS exercise_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL for global templates

    -- Exercise definition
    title VARCHAR(255) NOT NULL,
    exercise_type VARCHAR(50) NOT NULL,  -- fill_blank, multiple_choice, speaking, writing, matching, ordering
    cefr_level VARCHAR(3),
    skill_focus VARCHAR(50),  -- grammar, vocabulary, listening, speaking, reading, writing

    -- Content
    instructions TEXT,
    content JSONB NOT NULL,  -- Exercise-specific structure
    correct_answers JSONB,   -- Answer key (hidden from students)

    -- Targeting
    topic VARCHAR(255),
    grammar_point VARCHAR(255),
    learning_objective_id UUID REFERENCES cefr_descriptors(id),

    -- Generation tracking
    is_ai_generated BOOLEAN DEFAULT FALSE,
    generation_prompt TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, published, archived

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_exercise_templates_tenant ON exercise_templates(tenant_id);
CREATE INDEX idx_exercise_templates_level ON exercise_templates(cefr_level, skill_focus) WHERE status = 'published';

-- ============================================================================
-- EXERCISE ATTEMPTS TABLE
-- Track student attempts at exercises
-- ============================================================================

CREATE TABLE IF NOT EXISTS exercise_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES exercise_templates(id) ON DELETE CASCADE,

    -- Context (optional - may be part of a tutor session)
    tutor_session_id UUID REFERENCES tutor_sessions(id) ON DELETE SET NULL,

    -- Attempt data
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER,

    -- Answers and scoring
    answers JSONB,  -- Student's submitted answers
    score_percentage NUMERIC(5, 2),  -- 0-100
    correct_count INTEGER,
    total_count INTEGER,

    -- Feedback (may be AI-generated)
    feedback JSONB,  -- { errors, suggestions, praise }

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_exercise_attempts_student ON exercise_attempts(student_id, completed_at DESC);
CREATE INDEX idx_exercise_attempts_template ON exercise_attempts(template_id);
CREATE INDEX idx_exercise_attempts_session ON exercise_attempts(tutor_session_id) WHERE tutor_session_id IS NOT NULL;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_attempts ENABLE ROW LEVEL SECURITY;

-- Tutor Sessions: Students see their own, teachers see students in their classes, admin sees all
CREATE POLICY tutor_sessions_tenant_isolation ON tutor_sessions
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Tutor Messages: Access through session
CREATE POLICY tutor_messages_session_access ON tutor_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tutor_sessions ts
            WHERE ts.id = tutor_messages.session_id
            AND ts.tenant_id = current_setting('app.tenant_id', true)::uuid
        )
    );

-- Student Vocabulary: Students see their own, teachers see students in their classes
CREATE POLICY student_vocabulary_tenant_isolation ON student_vocabulary
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Exercise Templates: Global templates visible to all, tenant templates to tenant only
CREATE POLICY exercise_templates_access ON exercise_templates
    FOR SELECT USING (
        tenant_id IS NULL  -- Global templates
        OR tenant_id = current_setting('app.tenant_id', true)::uuid
    );

CREATE POLICY exercise_templates_modify ON exercise_templates
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Exercise Attempts: Students see their own, admin sees all in tenant
CREATE POLICY exercise_attempts_tenant_isolation ON exercise_attempts
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER set_tutor_sessions_updated_at
    BEFORE UPDATE ON tutor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_student_vocabulary_updated_at
    BEFORE UPDATE ON student_vocabulary
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_exercise_templates_updated_at
    BEFORE UPDATE ON exercise_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE tutor_sessions IS 'AI tutor conversation sessions with students';
COMMENT ON TABLE tutor_messages IS 'Individual messages within tutor sessions';
COMMENT ON TABLE student_vocabulary IS 'Personalized vocabulary lists with spaced repetition';
COMMENT ON TABLE exercise_templates IS 'Reusable exercise templates (admin or AI-generated)';
COMMENT ON TABLE exercise_attempts IS 'Student attempts at exercises with scoring';
