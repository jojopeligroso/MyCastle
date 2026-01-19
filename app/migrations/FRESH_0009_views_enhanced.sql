-- ============================================================================
-- MyCastle Fresh Schema Migration 0009
-- Enhanced Database Views with Real Data
-- Date: 2026-01-19
-- Updates views from FRESH_0003 to use real data from migrated tables
-- ============================================================================

-- Run this AFTER FRESH_0001 through FRESH_0008.
-- This migration replaces stub views with real implementations using:
-- - Academic tables (classes, enrollments, class_sessions, attendance)
-- - System tables (audit_logs)

-- ============================================================================
-- PART 0: Drop existing views first (to avoid column type conflicts)
-- ============================================================================
DROP VIEW IF EXISTS v_admin_kpis_daily CASCADE;
DROP VIEW IF EXISTS v_audit_events_recent CASCADE;
DROP VIEW IF EXISTS v_users_with_metadata CASCADE;
DROP VIEW IF EXISTS v_attendance_summary CASCADE;
DROP VIEW IF EXISTS v_enrollment_status CASCADE;
DROP VIEW IF EXISTS v_class_capacity_status CASCADE;
DROP VIEW IF EXISTS v_teacher_workload CASCADE;
DROP VIEW IF EXISTS v_outstanding_payments CASCADE;

-- ============================================================================
-- 2. v_admin_kpis_daily - Daily KPI metrics (ENHANCED)
-- ============================================================================
CREATE OR REPLACE VIEW v_admin_kpis_daily AS
SELECT
  -- Active students count
  (SELECT COUNT(*) FROM students WHERE status = 'active')::bigint as active_students,

  -- Attendance rate last 7 days
  COALESCE(
    (SELECT ROUND(
      (COUNT(*) FILTER (WHERE status = 'present') * 100.0) / NULLIF(COUNT(*), 0),
      2
    )
    FROM attendance
    WHERE recorded_at >= NOW() - INTERVAL '7 days'),
    0
  )::numeric as attendance_rate_7d,

  -- Attendance rate last 30 days
  COALESCE(
    (SELECT ROUND(
      (COUNT(*) FILTER (WHERE status = 'present') * 100.0) / NULLIF(COUNT(*), 0),
      2
    )
    FROM attendance
    WHERE recorded_at >= NOW() - INTERVAL '30 days'),
    0
  )::numeric as attendance_rate_30d,

  -- Classes running today
  COALESCE(
    (SELECT COUNT(DISTINCT cs.class_id)
    FROM class_sessions cs
    WHERE cs.session_date = CURRENT_DATE
      AND cs.status IN ('scheduled', 'completed')),
    0
  )::bigint as classes_running_today,

  -- Capacity utilisation (average across all active classes)
  COALESCE(
    (SELECT ROUND(
      AVG(enrolled_count::numeric / NULLIF(capacity, 0) * 100),
      2
    )
    FROM classes
    WHERE status = 'active'
      AND capacity > 0),
    0
  )::numeric as capacity_utilisation,

  -- New enrollments last 7 days
  COALESCE(
    (SELECT COUNT(*)
    FROM enrollments
    WHERE enrollment_date >= CURRENT_DATE - INTERVAL '7 days'),
    0
  )::bigint as new_enrolments_7d,

  -- Outstanding compliance tasks (placeholder - can be enhanced)
  0::bigint as outstanding_compliance_tasks;

-- ============================================================================
-- 4. v_audit_events_recent - Recent audit log entries (ENHANCED)
-- ============================================================================
CREATE OR REPLACE VIEW v_audit_events_recent AS
SELECT
  al.id,
  al.action,
  al.resource_type,
  al.resource_id,
  al.changes,
  al.timestamp,
  u.name as actor_name,
  u.email as actor_email,
  u.primary_role as actor_role
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.timestamp DESC
LIMIT 100;

-- ============================================================================
-- 5. v_users_with_metadata - Users with enrollment/class counts (ENHANCED)
-- ============================================================================
CREATE OR REPLACE VIEW v_users_with_metadata AS
SELECT
  u.id,
  u.tenant_id,
  u.auth_id,
  u.email,
  u.name,
  u.primary_role as role,
  u.status,
  u.last_login,
  u.created_at,
  u.updated_at,

  -- Enrollment count (for students)
  COALESCE(
    (SELECT COUNT(*)
     FROM enrollments e
     JOIN students s ON s.user_id = u.id
     WHERE e.student_id = u.id
       AND e.status = 'active'),
    0
  )::bigint as enrollment_count,

  -- Class count (for teachers)
  COALESCE(
    (SELECT COUNT(*)
     FROM classes c
     WHERE c.teacher_id = u.id
       AND c.status = 'active'),
    0
  )::bigint as class_count
FROM users u;

-- ============================================================================
-- NEW: v_attendance_summary - Attendance summary by class
-- ============================================================================
CREATE OR REPLACE VIEW v_attendance_summary AS
SELECT
  c.id as class_id,
  c.name as class_name,
  c.code as class_code,
  c.tenant_id,
  COUNT(DISTINCT a.student_id) as total_students,
  COUNT(a.id) as total_records,
  COUNT(a.id) FILTER (WHERE a.status = 'present') as present_count,
  COUNT(a.id) FILTER (WHERE a.status = 'absent') as absent_count,
  COUNT(a.id) FILTER (WHERE a.status = 'late') as late_count,
  COUNT(a.id) FILTER (WHERE a.status = 'excused') as excused_count,
  ROUND(
    (COUNT(a.id) FILTER (WHERE a.status = 'present') * 100.0) / NULLIF(COUNT(a.id), 0),
    2
  ) as attendance_rate_percent
FROM classes c
LEFT JOIN class_sessions cs ON cs.class_id = c.id
LEFT JOIN attendance a ON a.class_session_id = cs.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name, c.code, c.tenant_id;

-- ============================================================================
-- NEW: v_enrollment_status - Current enrollment status overview
-- ============================================================================
CREATE OR REPLACE VIEW v_enrollment_status AS
SELECT
  e.id as enrollment_id,
  e.tenant_id,
  u.name as student_name,
  u.email as student_email,
  c.name as class_name,
  c.code as class_code,
  e.enrollment_date,
  e.expected_end_date,
  e.status,
  e.booked_weeks,
  e.is_amended,
  e.extensions_count,
  e.attendance_rate,
  e.current_grade,
  CASE
    WHEN e.expected_end_date < CURRENT_DATE AND e.status = 'active' THEN 'overdue'
    WHEN e.expected_end_date <= CURRENT_DATE + INTERVAL '7 days' AND e.status = 'active' THEN 'ending_soon'
    WHEN e.status = 'active' THEN 'active'
    ELSE e.status
  END as enrollment_status_flag
FROM enrollments e
JOIN users u ON e.student_id = u.id
JOIN classes c ON e.class_id = c.id
WHERE c.deleted_at IS NULL;

-- ============================================================================
-- NEW: v_class_capacity_status - Class capacity and availability
-- ============================================================================
CREATE OR REPLACE VIEW v_class_capacity_status AS
SELECT
  c.id as class_id,
  c.tenant_id,
  c.name as class_name,
  c.code as class_code,
  c.capacity,
  c.enrolled_count,
  (c.capacity - c.enrolled_count) as available_spots,
  ROUND((c.enrolled_count::numeric / NULLIF(c.capacity, 0) * 100), 2) as capacity_utilization_percent,
  CASE
    WHEN c.enrolled_count >= c.capacity THEN 'full'
    WHEN c.enrolled_count >= (c.capacity * 0.9) THEN 'nearly_full'
    WHEN c.enrolled_count >= (c.capacity * 0.5) THEN 'half_full'
    ELSE 'available'
  END as capacity_status,
  c.start_date,
  c.end_date,
  c.status,
  t.name as teacher_name
FROM classes c
LEFT JOIN users t ON c.teacher_id = t.id
WHERE c.deleted_at IS NULL
  AND c.status = 'active';

-- ============================================================================
-- NEW: v_teacher_workload - Teacher class and student counts
-- ============================================================================
CREATE OR REPLACE VIEW v_teacher_workload AS
SELECT
  u.id as teacher_id,
  u.tenant_id,
  u.name as teacher_name,
  u.email as teacher_email,
  COUNT(DISTINCT c.id) as active_classes_count,
  COUNT(DISTINCT e.student_id) as total_students,
  SUM(c.enrolled_count) as total_enrollments,
  ROUND(AVG((c.enrolled_count::numeric / NULLIF(c.capacity, 0) * 100)), 2) as avg_class_utilization
FROM users u
JOIN classes c ON c.teacher_id = u.id
LEFT JOIN enrollments e ON e.class_id = c.id AND e.status = 'active'
WHERE u.primary_role = 'teacher'
  AND u.status = 'active'
  AND c.status = 'active'
  AND c.deleted_at IS NULL
GROUP BY u.id, u.tenant_id, u.name, u.email;

-- ============================================================================
-- NEW: v_outstanding_payments - Students with outstanding payments
-- ============================================================================
CREATE OR REPLACE VIEW v_outstanding_payments AS
SELECT
  b.id as booking_id,
  b.tenant_id,
  b.booking_number,
  u.name as student_name,
  u.email as student_email,
  b.total_booking_eur,
  b.total_paid_eur,
  b.total_due_eur,
  b.sale_date,
  b.course_start_date,
  b.status as booking_status,
  CASE
    WHEN b.total_due_eur > (b.total_booking_eur * 0.5) THEN 'high'
    WHEN b.total_due_eur > 0 THEN 'medium'
    ELSE 'low'
  END as payment_priority
FROM bookings b
JOIN students s ON b.student_id = s.id
JOIN users u ON s.user_id = u.id
WHERE b.total_due_eur > 0
  AND b.status NOT IN ('cancelled', 'completed')
ORDER BY b.total_due_eur DESC;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON VIEW v_admin_kpis_daily IS 'Enhanced daily KPI metrics with real data from academic tables';
COMMENT ON VIEW v_audit_events_recent IS 'Enhanced audit log view with user details';
COMMENT ON VIEW v_users_with_metadata IS 'Enhanced user view with enrollment and class counts';
COMMENT ON VIEW v_attendance_summary IS 'Attendance summary by class with present/absent/late counts';
COMMENT ON VIEW v_enrollment_status IS 'Current enrollment status with ending soon and overdue flags';
COMMENT ON VIEW v_class_capacity_status IS 'Class capacity utilization and availability status';
COMMENT ON VIEW v_teacher_workload IS 'Teacher workload with class and student counts';
COMMENT ON VIEW v_outstanding_payments IS 'Students with outstanding payment balances';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration FRESH_0009 completed successfully!';
  RAISE NOTICE 'Enhanced views with real data:';
  RAISE NOTICE '- v_admin_kpis_daily (attendance rates, class counts, enrollments)';
  RAISE NOTICE '- v_audit_events_recent (with user details)';
  RAISE NOTICE '- v_users_with_metadata (enrollment and class counts)';
  RAISE NOTICE '';
  RAISE NOTICE 'New views created:';
  RAISE NOTICE '- v_attendance_summary (by class)';
  RAISE NOTICE '- v_enrollment_status (with flags)';
  RAISE NOTICE '- v_class_capacity_status (capacity utilization)';
  RAISE NOTICE '- v_teacher_workload (class and student counts)';
  RAISE NOTICE '- v_outstanding_payments (payment tracking)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test views: SELECT * FROM v_admin_kpis_daily;';
  RAISE NOTICE '2. Create seed data scripts for testing';
  RAISE NOTICE '3. Test admin pages to verify no errors';
END $$;
