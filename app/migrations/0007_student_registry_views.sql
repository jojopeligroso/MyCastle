-- Migration 0007: Student Registry Database Views
-- Created: 2025-01-XX
-- Description: Creates database views for efficient student data retrieval
-- Ref: ADMIN_IMPLEMENTATION_TODO.md §Page 3, Student Registry Implementation Plan

-- ============================================================================
-- VIEW 1: v_students_with_metadata
-- Purpose: Enriched student data with enrollment, attendance, and financial aggregates
-- Used by: Main student registry page, filters, reports
-- ============================================================================

CREATE OR REPLACE VIEW v_students_with_metadata AS
SELECT
  -- Core student fields
  u.id,
  u.tenant_id,
  u.email,
  u.name,
  u.phone,
  u.avatar_url,
  u.status,

  -- CEFR fields
  u.current_level,
  u.initial_level,
  u.level_status,

  -- Visa fields
  u.visa_type,
  u.visa_expiry,

  -- Metadata and preferences
  u.metadata,
  u.preferences,

  -- Timestamps
  u.created_at,
  u.updated_at,
  u.last_login,

  -- ===== ENROLLMENT METRICS =====
  -- Count of active enrollments
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS active_enrollments,

  -- Count of completed enrollments
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'completed') AS completed_enrollments,

  -- Total enrollments (all statuses)
  COUNT(DISTINCT e.id) AS total_enrollments,

  -- ===== ATTENDANCE METRICS =====
  -- Count of present attendance records
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'present') AS attendance_present,

  -- Count of all attendance records
  COUNT(DISTINCT a.id) AS attendance_total,

  -- Attendance rate (percentage)
  CASE
    WHEN COUNT(DISTINCT a.id) > 0
    THEN ROUND((COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'present')::NUMERIC / COUNT(DISTINCT a.id)) * 100, 2)
    ELSE NULL
  END AS attendance_rate,

  -- ===== FINANCIAL METRICS =====
  -- Outstanding balance (pending + overdue invoices)
  COALESCE(SUM(i.amount) FILTER (WHERE i.status IN ('pending', 'overdue')), 0) AS outstanding_balance,

  -- Total amount paid
  COALESCE(SUM(p.amount), 0) AS total_paid,

  -- Total invoiced amount
  COALESCE(SUM(i.amount), 0) AS total_invoiced,

  -- ===== DATE TRACKING =====
  -- Most recent enrollment date
  MAX(e.enrollment_date) AS last_enrollment_date,

  -- Most recent class session attended
  MAX(cs.start_time) FILTER (WHERE a.status = 'present') AS last_attendance_date,

  -- ===== COMPLIANCE FLAGS =====
  -- Visa expiring within 30 days
  CASE
    WHEN u.visa_expiry IS NOT NULL AND u.visa_expiry < CURRENT_DATE + INTERVAL '30 days'
    THEN true
    ELSE false
  END AS visa_expiring_soon,

  -- Visa already expired
  CASE
    WHEN u.visa_expiry IS NOT NULL AND u.visa_expiry < CURRENT_DATE
    THEN true
    ELSE false
  END AS visa_expired,

  -- At-risk attendance (below 75%)
  CASE
    WHEN COUNT(DISTINCT a.id) > 0
      AND (COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'present')::NUMERIC / COUNT(DISTINCT a.id)) < 0.75
    THEN true
    ELSE false
  END AS at_risk_attendance,

  -- Has outstanding balance
  CASE
    WHEN COALESCE(SUM(i.amount) FILTER (WHERE i.status IN ('pending', 'overdue')), 0) > 0
    THEN true
    ELSE false
  END AS has_outstanding_balance

FROM users u

-- Left joins to preserve students with no records
LEFT JOIN enrollments e ON e.student_id = u.id AND e.deleted_at IS NULL
LEFT JOIN attendance a ON a.student_id = u.id
LEFT JOIN class_sessions cs ON cs.id = a.class_session_id
LEFT JOIN invoices i ON i.student_id = u.id AND i.deleted_at IS NULL
LEFT JOIN payments p ON p.student_id = u.id AND p.deleted_at IS NULL

WHERE u.role = 'student'
  AND u.deleted_at IS NULL

GROUP BY u.id

ORDER BY u.created_at DESC;

-- ============================================================================
-- VIEW 2: v_student_duplicate_candidates
-- Purpose: Identifies potential duplicate student records for merging
-- Used by: Duplicate detection workflow, data quality reports
-- ============================================================================

CREATE OR REPLACE VIEW v_student_duplicate_candidates AS
WITH student_similarities AS (
  SELECT
    u1.id AS student1_id,
    u1.name AS student1_name,
    u1.email AS student1_email,
    u1.created_at AS student1_created,
    u2.id AS student2_id,
    u2.name AS student2_name,
    u2.email AS student2_email,
    u2.created_at AS student2_created,
    u1.tenant_id,

    -- Similarity scoring
    CASE WHEN LOWER(u1.email) = LOWER(u2.email) THEN 1 ELSE 0 END AS email_match,
    CASE WHEN LOWER(u1.name) = LOWER(u2.name) THEN 1 ELSE 0 END AS name_match,
    CASE WHEN u1.phone IS NOT NULL AND u1.phone = u2.phone THEN 1 ELSE 0 END AS phone_match,

    -- Normalized name matching (remove spaces, special chars, lowercase)
    CASE
      WHEN LOWER(REGEXP_REPLACE(u1.name, '[^a-z0-9]', '', 'g')) =
           LOWER(REGEXP_REPLACE(u2.name, '[^a-z0-9]', '', 'g'))
      THEN 1
      ELSE 0
    END AS name_normalized_match,

    -- Date proximity (created within 7 days of each other)
    CASE
      WHEN ABS(EXTRACT(EPOCH FROM (u1.created_at - u2.created_at))) < 604800 -- 7 days in seconds
      THEN 1
      ELSE 0
    END AS date_proximity

  FROM users u1
  INNER JOIN users u2
    ON u1.tenant_id = u2.tenant_id
    AND u1.id < u2.id  -- Avoid duplicates and self-joins (canonical ordering)

  WHERE u1.role = 'student'
    AND u2.role = 'student'
    AND u1.deleted_at IS NULL
    AND u2.deleted_at IS NULL
)
SELECT
  student1_id,
  student1_name,
  student1_email,
  student1_created,
  student2_id,
  student2_name,
  student2_email,
  student2_created,
  tenant_id,

  -- Total match score (higher = more likely to be duplicate)
  (email_match + name_match + phone_match + name_normalized_match + date_proximity) AS match_score,

  -- Individual match flags
  email_match::BOOLEAN,
  name_match::BOOLEAN,
  phone_match::BOOLEAN,
  name_normalized_match::BOOLEAN,
  date_proximity::BOOLEAN

FROM student_similarities

-- Only show candidates with significant similarity (score >= 2)
WHERE (email_match + name_match + phone_match + name_normalized_match + date_proximity) >= 2

ORDER BY match_score DESC, student1_id;

-- ============================================================================
-- VIEW 3: v_student_visa_status
-- Purpose: Visa status tracking and compliance alerts
-- Used by: Visa compliance dashboard, at-risk student reports
-- ============================================================================

CREATE OR REPLACE VIEW v_student_visa_status AS
SELECT
  u.id AS student_id,
  u.tenant_id,
  u.name,
  u.email,
  u.phone,
  u.visa_type,
  u.visa_expiry,

  -- Days until expiry (negative if expired)
  CASE
    WHEN u.visa_expiry IS NOT NULL
    THEN (u.visa_expiry - CURRENT_DATE)::INTEGER
    ELSE NULL
  END AS days_until_expiry,

  -- Status classification
  CASE
    WHEN u.visa_expiry IS NULL THEN 'no_visa_required'
    WHEN u.visa_expiry < CURRENT_DATE THEN 'expired'
    WHEN u.visa_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    WHEN u.visa_expiry < CURRENT_DATE + INTERVAL '90 days' THEN 'expiring_90_days'
    ELSE 'valid'
  END AS visa_status,

  -- Alert priority (for notification system)
  CASE
    WHEN u.visa_expiry < CURRENT_DATE THEN 'critical'
    WHEN u.visa_expiry < CURRENT_DATE + INTERVAL '14 days' THEN 'urgent'
    WHEN u.visa_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 'high'
    WHEN u.visa_expiry < CURRENT_DATE + INTERVAL '90 days' THEN 'medium'
    ELSE 'low'
  END AS alert_priority,

  -- Student status
  u.status AS student_status,

  -- Current CEFR level
  u.current_level,

  -- Active enrollments (join to check if student is currently studying)
  COUNT(e.id) FILTER (WHERE e.status = 'active') AS active_enrollments,

  -- Timestamps
  u.created_at,
  u.updated_at

FROM users u
LEFT JOIN enrollments e ON e.student_id = u.id AND e.deleted_at IS NULL

WHERE u.role = 'student'
  AND u.deleted_at IS NULL
  AND u.visa_expiry IS NOT NULL  -- Only include students with visa information

GROUP BY u.id

ORDER BY
  CASE
    WHEN u.visa_expiry < CURRENT_DATE THEN 1                          -- Expired first
    WHEN u.visa_expiry < CURRENT_DATE + INTERVAL '30 days' THEN 2   -- Expiring soon
    WHEN u.visa_expiry < CURRENT_DATE + INTERVAL '90 days' THEN 3   -- Expiring in 90 days
    ELSE 4                                                              -- Valid
  END,
  u.visa_expiry ASC;  -- Then by expiry date (soonest first)

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant SELECT on views to authenticated users (RLS still applies via underlying tables)
GRANT SELECT ON v_students_with_metadata TO PUBLIC;
GRANT SELECT ON v_student_duplicate_candidates TO PUBLIC;
GRANT SELECT ON v_student_visa_status TO PUBLIC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW v_students_with_metadata IS 'Enriched student data with enrollment, attendance, and financial aggregates for admin registry';
COMMENT ON VIEW v_student_duplicate_candidates IS 'Identifies potential duplicate student records based on name, email, phone, and creation date similarity';
COMMENT ON VIEW v_student_visa_status IS 'Visa compliance tracking with status classification and alert priorities';
