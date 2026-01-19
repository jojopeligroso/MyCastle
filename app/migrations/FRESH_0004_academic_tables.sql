-- ============================================================================
-- MyCastle Fresh Schema Migration 0004
-- Academic Tables: Classes, Enrollments, Sessions, Attendance, Assignments
-- Date: 2026-01-19
-- Ref: app/src/db/schema/academic.ts
-- ============================================================================

-- NOTE: This migration creates academic tables in the correct dependency order.
-- Run this AFTER FRESH_0001, FRESH_0002, and FRESH_0003.

-- ============================================================================
-- PART 1: Classes
-- ============================================================================

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Class info
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50), -- e.g., "MATH-101", "ENG-A1"
  description TEXT,
  level VARCHAR(50), -- Beginner, Intermediate, Advanced, or CEFR levels
  subject VARCHAR(100),

  -- Capacity
  capacity INTEGER NOT NULL DEFAULT 20,
  enrolled_count INTEGER NOT NULL DEFAULT 0,

  -- Teacher assignment
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Schedule
  schedule_description VARCHAR(500), -- "Mon/Wed 10:00-11:00"
  start_date DATE NOT NULL,
  end_date DATE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_classes_tenant ON classes(tenant_id);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_status ON classes(status);
CREATE INDEX idx_classes_dates ON classes(start_date, end_date);

-- ============================================================================
-- PART 2: Enrollments
-- ============================================================================

CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_date DATE,

  -- Flexible duration fields
  expected_end_date DATE, -- Booked end date (can differ from class end_date)
  booked_weeks INTEGER, -- Number of weeks booked
  original_course_id UUID, -- Reference to course catalog (nullable)

  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),

  -- Amendment tracking
  extensions_count INTEGER DEFAULT 0, -- Number of extensions
  is_amended BOOLEAN DEFAULT FALSE, -- Whether enrollment has been modified

  -- Performance tracking
  attendance_rate DECIMAL(5, 2), -- 0.00 to 100.00
  current_grade VARCHAR(10), -- A+, B, etc.

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Unique active enrollment per student per class
CREATE UNIQUE INDEX idx_enrollments_student_class ON enrollments(student_id, class_id);
CREATE INDEX idx_enrollments_tenant ON enrollments(tenant_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_class ON enrollments(class_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- ============================================================================
-- PART 3: Enrollment Amendments
-- ============================================================================

CREATE TABLE enrollment_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,

  -- Amendment details
  amendment_type VARCHAR(50) NOT NULL CHECK (amendment_type IN ('extension', 'reduction', 'transfer', 'level_change', 'cancellation')),
  amendment_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Previous values (for audit trail)
  previous_end_date DATE,
  previous_weeks INTEGER,
  previous_class_id UUID REFERENCES classes(id),

  -- New values
  new_end_date DATE,
  new_weeks INTEGER,
  new_class_id UUID REFERENCES classes(id),

  -- Financial impact
  fee_adjustment DECIMAL(10, 2), -- Positive for fees, negative for refunds

  -- Reason and approval
  reason TEXT,
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enrollment_amendments_enrollment ON enrollment_amendments(enrollment_id);
CREATE INDEX idx_enrollment_amendments_tenant ON enrollment_amendments(tenant_id);
CREATE INDEX idx_enrollment_amendments_status ON enrollment_amendments(status);
CREATE INDEX idx_enrollment_amendments_type ON enrollment_amendments(amendment_type);
CREATE INDEX idx_enrollment_amendments_date ON enrollment_amendments(amendment_date);

-- ============================================================================
-- PART 4: Class Sessions
-- ============================================================================

CREATE TABLE class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  topic VARCHAR(500),
  notes TEXT,

  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_class_date ON class_sessions(class_id, session_date);
CREATE INDEX idx_sessions_tenant ON class_sessions(tenant_id);
CREATE INDEX idx_sessions_status ON class_sessions(status);
CREATE INDEX idx_sessions_date ON class_sessions(session_date);

-- ============================================================================
-- PART 5: Attendance
-- ============================================================================

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  status VARCHAR(50) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,

  recorded_by UUID REFERENCES users(id), -- Teacher/admin who recorded
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Hash-chain fields (for tamper detection)
  hash VARCHAR(64), -- SHA256(payload || previous_hash)
  previous_hash VARCHAR(64), -- Hash of previous record

  -- Edit tracking
  edited_at TIMESTAMP,
  edited_by UUID REFERENCES users(id),
  edit_count INTEGER DEFAULT 0,
  is_within_edit_window VARCHAR(10) DEFAULT 'true',

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Unique attendance record per session per student
CREATE UNIQUE INDEX idx_attendance_session_student ON attendance(class_session_id, student_id);
CREATE INDEX idx_attendance_tenant ON attendance(tenant_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_session ON attendance(class_session_id);
CREATE INDEX idx_attendance_hash ON attendance(hash);
CREATE INDEX idx_attendance_session_created ON attendance(class_session_id, created_at);
CREATE INDEX idx_attendance_status ON attendance(status);

-- ============================================================================
-- PART 6: Assignments
-- ============================================================================

CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('homework', 'quiz', 'exam', 'project')),

  assigned_date DATE NOT NULL,
  due_date DATE NOT NULL,

  max_score INTEGER, -- e.g., 100 points

  content JSONB, -- Assignment content (questions, etc.)
  attachments JSONB, -- File URLs

  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignments_tenant ON assignments(tenant_id);
CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
CREATE INDEX idx_assignments_status ON assignments(status);

-- ============================================================================
-- PART 7: Submissions
-- ============================================================================

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  content JSONB, -- Answers, text responses
  attachments JSONB, -- File URLs

  status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded')),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submissions_tenant ON submissions(tenant_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE UNIQUE INDEX idx_submissions_assignment_student ON submissions(assignment_id, student_id);

-- ============================================================================
-- PART 8: Grades
-- ============================================================================

CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  submission_id UUID NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,

  score DECIMAL(10, 2),
  grade VARCHAR(10), -- A+, B, etc.
  feedback TEXT,

  graded_by UUID REFERENCES users(id),
  graded_at TIMESTAMP NOT NULL DEFAULT NOW(),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grades_tenant ON grades(tenant_id);
CREATE INDEX idx_grades_submission ON grades(submission_id);
CREATE INDEX idx_grades_graded_by ON grades(graded_by);

-- ============================================================================
-- PART 9: Triggers
-- ============================================================================

-- Apply updated_at trigger to all new tables
CREATE TRIGGER trigger_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_enrollments_updated_at
  BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_enrollment_amendments_updated_at
  BEFORE UPDATE ON enrollment_amendments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_class_sessions_updated_at
  BEFORE UPDATE ON class_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_grades_updated_at
  BEFORE UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update enrollment count when enrollments change
CREATE OR REPLACE FUNCTION update_class_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate enrolled_count for the affected class
  UPDATE classes
  SET enrolled_count = (
    SELECT COUNT(*)
    FROM enrollments
    WHERE class_id = COALESCE(NEW.class_id, OLD.class_id)
      AND status = 'active'
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.class_id, OLD.class_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on enrollments INSERT/UPDATE/DELETE
CREATE TRIGGER trigger_update_class_enrollment_count
AFTER INSERT OR UPDATE OR DELETE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION update_class_enrollment_count();

-- ============================================================================
-- PART 10: Comments (Documentation)
-- ============================================================================

COMMENT ON TABLE classes IS 'Class definitions and schedules';
COMMENT ON TABLE enrollments IS 'Student enrollment in classes (many-to-many)';
COMMENT ON TABLE enrollment_amendments IS 'Tracks changes to enrollments (extensions, transfers, etc.)';
COMMENT ON TABLE class_sessions IS 'Individual class meeting times/lessons';
COMMENT ON TABLE attendance IS 'Attendance records for class sessions with tamper detection';
COMMENT ON TABLE assignments IS 'Homework, quizzes, projects assigned to classes';
COMMENT ON TABLE submissions IS 'Student work submissions';
COMMENT ON TABLE grades IS 'Grades for submitted assignments';

COMMENT ON COLUMN classes.enrolled_count IS 'Auto-calculated count of active enrollments';
COMMENT ON COLUMN enrollments.booked_weeks IS 'Number of weeks booked (can differ from course standard)';
COMMENT ON COLUMN enrollments.is_amended IS 'Whether enrollment has been modified post-creation';
COMMENT ON COLUMN attendance.hash IS 'SHA256 hash for tamper detection (hash chain)';
COMMENT ON COLUMN attendance.previous_hash IS 'Hash of previous attendance record (hash chain)';
COMMENT ON COLUMN attendance.is_within_edit_window IS 'Whether edit is within allowed window';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration FRESH_0004 completed successfully!';
  RAISE NOTICE 'Created tables: classes, enrollments, enrollment_amendments, class_sessions, attendance, assignments, submissions, grades';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run npm run db:generate to regenerate TypeScript types';
  RAISE NOTICE '2. Run FRESH_0005_system_tables.sql for audit_logs and other system tables';
  RAISE NOTICE '3. Test admin pages: /admin/classes, /admin/attendance, /admin/enrolments';
END $$;
