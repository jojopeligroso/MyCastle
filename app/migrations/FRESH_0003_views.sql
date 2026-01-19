-- ============================================================================
-- MyCastle Fresh Schema Migration 0003
-- Database Views for Admin Dashboard
-- Date: 2026-01-19
-- Ref: /scripts/create-views.ts
-- ============================================================================

-- NOTE: These views are created with stub implementations where underlying
-- tables don't exist yet (attendance, classes, enrollments, audit_logs, etc.)
-- They will be enhanced as those tables are migrated to the FRESH schema.

-- ============================================================================
-- 1. v_admin_alerts - System alerts for admin dashboard
-- ============================================================================
CREATE OR REPLACE VIEW v_admin_alerts AS
SELECT
  gen_random_uuid() as alert_id,
  'info' as alert_type,
  1 as priority,
  'system' as entity_type,
  NULL::uuid as entity_id,
  'No alerts configured yet' as message,
  NULL as action_url,
  NOW() as created_at,
  NULL::timestamp as acknowledged_at,
  NULL::uuid as acknowledged_by,
  NULL as acknowledged_by_name
WHERE FALSE;

-- ============================================================================
-- 2. v_admin_kpis_daily - Daily KPI metrics
-- ============================================================================
CREATE OR REPLACE VIEW v_admin_kpis_daily AS
SELECT
  (SELECT COUNT(*) FROM students WHERE status = 'active')::bigint as active_students,
  0::numeric as attendance_rate_7d,
  0::numeric as attendance_rate_30d,
  0::bigint as classes_running_today,
  0::numeric as capacity_utilisation,
  0::bigint as new_enrolments_7d,
  0::bigint as outstanding_compliance_tasks;

-- TODO: Enhance with real data when attendance/classes tables are migrated:
-- attendance_rate_7d: AVG from attendance table (last 7 days)
-- attendance_rate_30d: AVG from attendance table (last 30 days)
-- classes_running_today: COUNT from class_sessions WHERE DATE = TODAY
-- capacity_utilisation: enrollments / max_students from classes table
-- new_enrolments_7d: COUNT from enrollments (last 7 days)

-- ============================================================================
-- 3. v_admin_work_queue - Pending work items
-- ============================================================================
CREATE OR REPLACE VIEW v_admin_work_queue AS
SELECT
  'info' as item_type,
  'No pending tasks' as item_label,
  NULL::uuid as entity_id,
  'Work queue not yet implemented' as description,
  NULL as action_url,
  NOW() as created_at
WHERE FALSE;

-- TODO: Implement when work queue/task system is built

-- ============================================================================
-- 4. v_audit_events_recent - Recent audit log entries
-- ============================================================================
CREATE OR REPLACE VIEW v_audit_events_recent AS
SELECT
  gen_random_uuid() as id,
  'info' as action,
  NULL as resource_type,
  NULL as resource_id,
  NULL::jsonb as changes,
  NOW() as timestamp,
  NULL as actor_name,
  NULL as actor_email,
  NULL as actor_role
WHERE FALSE;

-- TODO: Implement when audit_logs table is migrated:
-- SELECT
--   al.id,
--   al.action,
--   al.resource_type,
--   al.resource_id,
--   al.changes,
--   al.timestamp,
--   u.name as actor_name,
--   u.email as actor_email,
--   u.primary_role as actor_role
-- FROM audit_logs al
-- LEFT JOIN users u ON al.actor_id = u.id
-- ORDER BY al.timestamp DESC
-- LIMIT 100;

-- ============================================================================
-- 5. v_users_with_metadata - Users with enrollment/class counts
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
  0::bigint as enrollment_count,
  0::bigint as class_count
FROM users u;

-- TODO: Enhance when enrollments/classes tables are migrated:
-- enrollment_count: COUNT from enrollments JOIN students ON user_id
-- class_count: COUNT DISTINCT from classes WHERE teacher_id = user_id

-- ============================================================================
-- 6. v_orphaned_auth_users - Auth users without profile records
-- ============================================================================
CREATE OR REPLACE VIEW v_orphaned_auth_users AS
SELECT
  gen_random_uuid() as auth_id,
  'orphan@example.com' as email,
  NOW() as created_at
WHERE FALSE;

-- TODO: Implement when Supabase auth integration is available:
-- This would query auth.users and find records not in our users table

-- ============================================================================
-- 7. v_student_duplicate_candidates - Potential duplicate students
-- ============================================================================
CREATE OR REPLACE VIEW v_student_duplicate_candidates AS
SELECT
  s1.id as student1_id,
  u1.name as student1_name,
  u1.email as student1_email,
  s1.created_at as student1_created,
  s2.id as student2_id,
  u2.name as student2_name,
  u2.email as student2_email,
  s2.created_at as student2_created,
  CASE
    WHEN u1.email = u2.email THEN 100
    WHEN LOWER(u1.name) = LOWER(u2.name) THEN 80
    WHEN u1.phone = u2.phone AND u1.phone IS NOT NULL THEN 90
    ELSE 50
  END as match_score,
  (u1.email = u2.email) as email_match,
  (LOWER(u1.name) = LOWER(u2.name)) as name_match,
  (u1.phone = u2.phone AND u1.phone IS NOT NULL) as phone_match,
  (LOWER(REGEXP_REPLACE(u1.name, '[^a-z]', '', 'g')) =
   LOWER(REGEXP_REPLACE(u2.name, '[^a-z]', '', 'g'))) as name_normalized_match,
  (ABS(EXTRACT(EPOCH FROM (s1.created_at - s2.created_at))) < 86400) as date_proximity
FROM students s1
JOIN users u1 ON s1.user_id = u1.id
JOIN students s2 ON s1.tenant_id = s2.tenant_id AND s1.id < s2.id
JOIN users u2 ON s2.user_id = u2.id
WHERE
  u1.email = u2.email
  OR LOWER(u1.name) = LOWER(u2.name)
  OR (u1.phone = u2.phone AND u1.phone IS NOT NULL);

-- ============================================================================
-- Migration Notes
-- ============================================================================

-- This migration creates stub versions of all views required by the admin UI.
-- Many views return empty result sets (WHERE FALSE) or zero values because
-- the underlying tables (attendance, classes, enrollments, audit_logs) haven't
-- been migrated to the FRESH schema yet.

-- As those tables are migrated, these views should be updated with:
-- CREATE OR REPLACE VIEW ... to enhance functionality

-- Run with: \i migrations/FRESH_0003_views.sql
-- Or via scripts: npx tsx scripts/create-views.ts

-- Verification:
-- SELECT * FROM v_admin_kpis_daily;
-- SELECT * FROM v_users_with_metadata LIMIT 10;
-- SELECT * FROM v_student_duplicate_candidates LIMIT 10;
