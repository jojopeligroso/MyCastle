-- Migration 0007: Student Registry Views
-- Database views for student management with metadata aggregation
-- Supports efficient querying for admin dashboard and compliance monitoring

-- ============================================================================
-- VIEW 1: Students with Metadata
-- Aggregates student info with enrollment, attendance, and compliance status
-- ============================================================================

CREATE OR REPLACE VIEW v_students_with_metadata AS
SELECT
  s.id,
  s.tenant_id,
  s.user_id,
  s.student_number,
  s.date_of_birth,
  s.nationality,
  s.passport_number,
  s.emergency_contact_name,
  s.emergency_contact_phone,
  s.visa_type,
  s.visa_number,
  s.visa_expiry_date,
  s.ilr_status,
  s.current_level,
  s.intake_date,
  s.expected_completion_date,
  s.status,
  s.tags,
  s.created_at,
  s.updated_at,

  -- User details
  u.name,
  u.email,
  u.phone,
  u.avatar_url,

  -- Current enrollments count
  COALESCE(
    (SELECT COUNT(*)
     FROM enrollments e
     WHERE e.student_id = s.user_id
       AND e.tenant_id = s.tenant_id
       AND e.status = 'active'
    ), 0
  ) AS active_enrollments_count,

  -- Overall attendance rate
  COALESCE(
    (SELECT AVG(e.attendance_rate)
     FROM enrollments e
     WHERE e.student_id = s.user_id
       AND e.tenant_id = s.tenant_id
       AND e.status = 'active'
    ), 0
  ) AS overall_attendance_rate,

  -- Days until visa expiry (for compliance alerts)
  CASE
    WHEN s.visa_expiry_date IS NOT NULL
    THEN s.visa_expiry_date - CURRENT_DATE
    ELSE NULL
  END AS days_until_visa_expiry,

  -- Visa status flag
  CASE
    WHEN s.ilr_status = TRUE THEN 'ilr'
    WHEN s.visa_expiry_date IS NULL THEN 'no_visa_recorded'
    WHEN s.visa_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN s.visa_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END AS visa_status,

  -- Document counts
  COALESCE(
    (SELECT COUNT(*)
     FROM student_documents sd
     WHERE sd.student_id = s.id
       AND sd.tenant_id = s.tenant_id
    ), 0
  ) AS total_documents,

  COALESCE(
    (SELECT COUNT(*)
     FROM student_documents sd
     WHERE sd.student_id = s.id
       AND sd.tenant_id = s.tenant_id
       AND sd.verified = TRUE
    ), 0
  ) AS verified_documents,

  -- Safeguarding flag (has safeguarding notes)
  COALESCE(
    (SELECT COUNT(*) > 0
     FROM student_notes sn
     WHERE sn.student_id = s.id
       AND sn.tenant_id = s.tenant_id
       AND sn.is_safeguarding = TRUE
    ), FALSE
  ) AS has_safeguarding_notes,

  -- Outstanding follow-ups
  COALESCE(
    (SELECT COUNT(*)
     FROM student_notes sn
     WHERE sn.student_id = s.id
       AND sn.tenant_id = s.tenant_id
       AND sn.requires_followup = TRUE
       AND sn.followup_completed = FALSE
    ), 0
  ) AS outstanding_followups

FROM students s
JOIN users u ON s.user_id = u.id
WHERE s.tenant_id::text = current_setting('app.current_tenant', TRUE);

COMMENT ON VIEW v_students_with_metadata IS 'Student profiles with aggregated enrollment, attendance, and compliance data';

-- ============================================================================
-- VIEW 2: Student Duplicate Candidates
-- Identifies potential duplicate student records for admin review
-- ============================================================================

CREATE OR REPLACE VIEW v_student_duplicate_candidates AS
SELECT
  s1.id AS student_1_id,
  s1.student_number AS student_1_number,
  u1.name AS student_1_name,
  u1.email AS student_1_email,
  s1.date_of_birth AS student_1_dob,
  s2.id AS student_2_id,
  s2.student_number AS student_2_number,
  u2.name AS student_2_name,
  u2.email AS student_2_email,
  s2.date_of_birth AS student_2_dob,
  s1.tenant_id,

  -- Similarity score (0-100)
  (
    -- Name similarity (50 points)
    CASE
      WHEN LOWER(u1.name) = LOWER(u2.name) THEN 50
      WHEN LOWER(u1.name) LIKE '%' || LOWER(u2.name) || '%' OR LOWER(u2.name) LIKE '%' || LOWER(u1.name) || '%' THEN 30
      ELSE 0
    END +
    -- Date of birth match (30 points)
    CASE
      WHEN s1.date_of_birth = s2.date_of_birth THEN 30
      ELSE 0
    END +
    -- Email similarity (20 points)
    CASE
      WHEN LOWER(u1.email) = LOWER(u2.email) THEN 20
      WHEN LOWER(u1.email) LIKE '%' || LOWER(SPLIT_PART(u2.email, '@', 1)) || '%' THEN 10
      ELSE 0
    END
  ) AS similarity_score,

  -- Match reasons
  ARRAY_REMOVE(ARRAY[
    CASE WHEN LOWER(u1.name) = LOWER(u2.name) THEN 'exact_name_match' ELSE NULL END,
    CASE WHEN s1.date_of_birth = s2.date_of_birth THEN 'dob_match' ELSE NULL END,
    CASE WHEN LOWER(u1.email) = LOWER(u2.email) THEN 'email_match' ELSE NULL END
  ], NULL) AS match_reasons

FROM students s1
JOIN users u1 ON s1.user_id = u1.id
JOIN students s2 ON s1.tenant_id = s2.tenant_id
JOIN users u2 ON s2.user_id = u2.id
WHERE
  s1.id < s2.id -- Avoid duplicate pairs and self-matches
  AND s1.tenant_id::text = current_setting('app.current_tenant', TRUE)
  AND (
    -- At least one strong match criterion
    LOWER(u1.name) = LOWER(u2.name)
    OR s1.date_of_birth = s2.date_of_birth
    OR LOWER(u1.email) = LOWER(u2.email)
  )
ORDER BY similarity_score DESC;

COMMENT ON VIEW v_student_duplicate_candidates IS 'Identifies potential duplicate student records based on name, DOB, and email';

-- ============================================================================
-- VIEW 3: Student Visa Status Summary
-- Compliance view for visa monitoring and reporting
-- ============================================================================

CREATE OR REPLACE VIEW v_student_visa_status AS
SELECT
  s.id,
  s.tenant_id,
  s.user_id,
  s.student_number,
  u.name,
  u.email,
  s.visa_type,
  s.visa_number,
  s.visa_expiry_date,
  s.ilr_status,
  s.nationality,
  s.status AS student_status,

  -- Days until visa expiry
  CASE
    WHEN s.visa_expiry_date IS NOT NULL
    THEN s.visa_expiry_date - CURRENT_DATE
    ELSE NULL
  END AS days_until_expiry,

  -- Visa status categorization
  CASE
    WHEN s.ilr_status = TRUE THEN 'ilr'
    WHEN s.visa_expiry_date IS NULL THEN 'no_visa_recorded'
    WHEN s.visa_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN s.visa_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    WHEN s.visa_expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'expiring_within_90_days'
    ELSE 'valid'
  END AS visa_status,

  -- Alert priority (1=critical, 2=warning, 3=info, null=no alert)
  CASE
    WHEN s.visa_expiry_date IS NOT NULL AND s.visa_expiry_date < CURRENT_DATE THEN 1
    WHEN s.visa_expiry_date IS NOT NULL AND s.visa_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 2
    WHEN s.visa_expiry_date IS NOT NULL AND s.visa_expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 3
    ELSE NULL
  END AS alert_priority,

  -- Current attendance rate (for compliance reporting)
  COALESCE(
    (SELECT AVG(e.attendance_rate)
     FROM enrollments e
     WHERE e.student_id = s.user_id
       AND e.tenant_id = s.tenant_id
       AND e.status = 'active'
    ), 0
  ) AS current_attendance_rate,

  -- Active enrollment count
  COALESCE(
    (SELECT COUNT(*)
     FROM enrollments e
     WHERE e.student_id = s.user_id
       AND e.tenant_id = s.tenant_id
       AND e.status = 'active'
    ), 0
  ) AS active_enrollments

FROM students s
JOIN users u ON s.user_id = u.id
WHERE s.tenant_id::text = current_setting('app.current_tenant', TRUE)
  AND s.status = 'active' -- Only active students
ORDER BY alert_priority ASC NULLS LAST, days_until_expiry ASC NULLS LAST;

COMMENT ON VIEW v_student_visa_status IS 'Visa compliance monitoring with alert prioritization for Stamp 2 students';

-- ============================================================================
-- VIEW 4: Student Course History
-- Complete academic history with enrollments and assessments
-- ============================================================================

CREATE OR REPLACE VIEW v_student_course_history AS
SELECT
  s.id AS student_id,
  s.tenant_id,
  s.user_id,
  u.name AS student_name,
  s.student_number,
  s.current_level,

  -- Enrollment details
  e.id AS enrollment_id,
  e.class_id,
  c.name AS class_name,
  c.code AS class_code,
  c.level AS class_level,
  c.subject AS class_subject,
  e.enrollment_date,
  e.completion_date,
  e.status AS enrollment_status,
  e.attendance_rate,
  e.current_grade,

  -- Teacher
  t.name AS teacher_name,

  -- Class dates
  c.start_date AS class_start_date,
  c.end_date AS class_end_date

FROM students s
JOIN users u ON s.user_id = u.id
LEFT JOIN enrollments e ON e.student_id = s.user_id AND e.tenant_id = s.tenant_id
LEFT JOIN classes c ON e.class_id = c.id AND c.tenant_id = s.tenant_id
LEFT JOIN users t ON c.teacher_id = t.id
WHERE s.tenant_id::text = current_setting('app.current_tenant', TRUE)
ORDER BY e.enrollment_date DESC NULLS LAST;

COMMENT ON VIEW v_student_course_history IS 'Complete student academic history with enrollments and class details';
