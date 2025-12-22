-- Migration 0005: Teacher Registry Views
-- Database views for teacher management with metadata aggregation
-- Supports efficient querying for admin dashboard and scheduling

-- ============================================================================
-- VIEW 1: Teachers with Metadata
-- Aggregates teacher info with current workload and qualification status
-- ============================================================================

CREATE OR REPLACE VIEW v_teachers_with_metadata AS
SELECT
  t.id,
  t.tenant_id,
  t.user_id,
  t.employee_number,
  t.employment_type,
  t.contract_start_date,
  t.contract_end_date,
  t.max_hours_per_week,
  t.hourly_rate,
  t.work_permit_required,
  t.work_permit_number,
  t.work_permit_expiry,
  t.status,
  t.created_at,
  t.updated_at,

  -- User details
  u.name,
  u.email,
  u.phone,
  u.avatar_url,
  u.last_login,

  -- Current workload (active classes)
  COALESCE(
    (SELECT COUNT(*)
     FROM classes c
     WHERE c.teacher_id = t.user_id
       AND c.status = 'active'
       AND c.tenant_id = t.tenant_id
       AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
    ), 0
  ) AS active_classes_count,

  -- Hours this week (from class_sessions)
  COALESCE(
    (SELECT SUM(
       EXTRACT(EPOCH FROM (cs.end_time - cs.start_time)) / 3600
     )
     FROM class_sessions cs
     JOIN classes c ON cs.class_id = c.id
     WHERE c.teacher_id = t.user_id
       AND cs.tenant_id = t.tenant_id
       AND cs.session_date >= DATE_TRUNC('week', CURRENT_DATE)
       AND cs.session_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
       AND cs.status != 'cancelled'
    ), 0
  ) AS hours_this_week,

  -- Qualification counts
  COALESCE(
    (SELECT COUNT(*)
     FROM teacher_qualifications tq
     WHERE tq.teacher_id = t.id
       AND tq.tenant_id = t.tenant_id
       AND tq.status = 'active'
    ), 0
  ) AS total_qualifications,

  COALESCE(
    (SELECT COUNT(*)
     FROM teacher_qualifications tq
     WHERE tq.teacher_id = t.id
       AND tq.tenant_id = t.tenant_id
       AND tq.status = 'active'
       AND tq.verified = TRUE
    ), 0
  ) AS verified_qualifications,

  -- Expiring soon qualifications (within 60 days)
  COALESCE(
    (SELECT COUNT(*)
     FROM teacher_qualifications tq
     WHERE tq.teacher_id = t.id
       AND tq.tenant_id = t.tenant_id
       AND tq.status = 'active'
       AND tq.expiry_date IS NOT NULL
       AND tq.expiry_date <= CURRENT_DATE + INTERVAL '60 days'
       AND tq.expiry_date >= CURRENT_DATE
    ), 0
  ) AS expiring_soon_count,

  -- Work permit expiry warning (within 90 days)
  CASE
    WHEN t.work_permit_required = TRUE
         AND t.work_permit_expiry IS NOT NULL
         AND t.work_permit_expiry <= CURRENT_DATE + INTERVAL '90 days'
         AND t.work_permit_expiry >= CURRENT_DATE
    THEN TRUE
    ELSE FALSE
  END AS work_permit_expiring_soon,

  -- Teaching permissions
  (SELECT tp.can_teach_levels
   FROM teacher_permissions tp
   WHERE tp.teacher_id = t.id
     AND tp.tenant_id = t.tenant_id
     AND tp.effective_from <= CURRENT_DATE
     AND (tp.effective_until IS NULL OR tp.effective_until >= CURRENT_DATE)
   ORDER BY tp.effective_from DESC
   LIMIT 1
  ) AS can_teach_levels,

  (SELECT tp.can_teach_subjects
   FROM teacher_permissions tp
   WHERE tp.teacher_id = t.id
     AND tp.tenant_id = t.tenant_id
     AND tp.effective_from <= CURRENT_DATE
     AND (tp.effective_until IS NULL OR tp.effective_until >= CURRENT_DATE)
   ORDER BY tp.effective_from DESC
   LIMIT 1
  ) AS can_teach_subjects

FROM teachers t
JOIN users u ON t.user_id = u.id
WHERE t.tenant_id::text = current_setting('app.current_tenant', TRUE);

COMMENT ON VIEW v_teachers_with_metadata IS 'Teacher profiles with aggregated workload, qualifications, and compliance alerts';

-- ============================================================================
-- VIEW 2: Teacher Availability (Flattened)
-- Combines recurring and specific availability into queryable format
-- ============================================================================

CREATE OR REPLACE VIEW v_teacher_availability AS
SELECT
  ta.id,
  ta.tenant_id,
  ta.teacher_id,
  t.user_id,
  u.name AS teacher_name,
  ta.availability_type,
  ta.day_of_week,
  ta.specific_date,
  ta.start_time,
  ta.end_time,
  ta.effective_from,
  ta.effective_until,
  ta.reason,
  ta.notes,
  ta.created_at,
  ta.updated_at,

  -- Helper: Is this currently effective?
  CASE
    WHEN ta.effective_from <= CURRENT_DATE
         AND (ta.effective_until IS NULL OR ta.effective_until >= CURRENT_DATE)
    THEN TRUE
    ELSE FALSE
  END AS is_currently_effective

FROM teacher_availability ta
JOIN teachers t ON ta.teacher_id = t.id
JOIN users u ON t.user_id = u.id
WHERE ta.tenant_id::text = current_setting('app.current_tenant', TRUE);

COMMENT ON VIEW v_teacher_availability IS 'Teacher availability with current effectiveness flag for scheduling';

-- ============================================================================
-- VIEW 3: Scheduling Conflicts Detection
-- Identifies potential conflicts when assigning teachers to sessions
-- ============================================================================

CREATE OR REPLACE VIEW v_scheduling_conflicts AS
WITH teacher_sessions AS (
  SELECT
    cs.id AS session_id,
    cs.class_id,
    c.name AS class_name,
    c.teacher_id,
    u.name AS teacher_name,
    cs.session_date,
    cs.start_time,
    cs.end_time,
    cs.status,
    cs.tenant_id
  FROM class_sessions cs
  JOIN classes c ON cs.class_id = c.id
  JOIN users u ON c.teacher_id = u.id
  WHERE cs.status != 'cancelled'
    AND cs.session_date >= CURRENT_DATE -- Only future/today
)
SELECT
  ts1.session_id AS session_1_id,
  ts1.class_name AS session_1_class,
  ts1.session_date,
  ts1.start_time AS session_1_start,
  ts1.end_time AS session_1_end,
  ts2.session_id AS session_2_id,
  ts2.class_name AS session_2_class,
  ts2.start_time AS session_2_start,
  ts2.end_time AS session_2_end,
  ts1.teacher_id,
  ts1.teacher_name,
  ts1.tenant_id,

  -- Conflict type
  CASE
    WHEN ts1.start_time = ts2.start_time AND ts1.end_time = ts2.end_time
    THEN 'exact_overlap'
    WHEN ts1.start_time < ts2.end_time AND ts1.end_time > ts2.start_time
    THEN 'partial_overlap'
    ELSE 'unknown'
  END AS conflict_type,

  -- Overlap duration in minutes
  EXTRACT(EPOCH FROM (
    LEAST(ts1.end_time, ts2.end_time) - GREATEST(ts1.start_time, ts2.start_time)
  )) / 60 AS overlap_minutes

FROM teacher_sessions ts1
JOIN teacher_sessions ts2
  ON ts1.teacher_id = ts2.teacher_id
  AND ts1.session_date = ts2.session_date
  AND ts1.session_id < ts2.session_id -- Avoid duplicate pairs
  AND ts1.tenant_id = ts2.tenant_id
WHERE
  -- Check for time overlap
  ts1.start_time < ts2.end_time
  AND ts1.end_time > ts2.start_time
  -- Tenant isolation
  AND ts1.tenant_id::text = current_setting('app.current_tenant', TRUE);

COMMENT ON VIEW v_scheduling_conflicts IS 'Detects teacher scheduling conflicts for sessions on the same day';

-- ============================================================================
-- VIEW 4: Teacher Qualifications Status
-- Quick view of qualification compliance for reporting
-- ============================================================================

CREATE OR REPLACE VIEW v_teacher_qualifications_status AS
SELECT
  t.id AS teacher_id,
  t.tenant_id,
  t.user_id,
  u.name AS teacher_name,
  t.employee_number,
  t.status AS teacher_status,

  -- Qualification summary
  COUNT(tq.id) AS total_qualifications,
  COUNT(tq.id) FILTER (WHERE tq.verified = TRUE) AS verified_qualifications,
  COUNT(tq.id) FILTER (WHERE tq.verified = FALSE) AS unverified_qualifications,

  -- Expiry tracking
  COUNT(tq.id) FILTER (
    WHERE tq.expiry_date IS NOT NULL
      AND tq.expiry_date < CURRENT_DATE
  ) AS expired_qualifications,

  COUNT(tq.id) FILTER (
    WHERE tq.expiry_date IS NOT NULL
      AND tq.expiry_date >= CURRENT_DATE
      AND tq.expiry_date <= CURRENT_DATE + INTERVAL '60 days'
  ) AS expiring_soon_qualifications,

  -- Next expiry date
  MIN(tq.expiry_date) FILTER (
    WHERE tq.expiry_date IS NOT NULL
      AND tq.expiry_date >= CURRENT_DATE
  ) AS next_expiry_date,

  -- Compliance flags
  CASE
    WHEN COUNT(tq.id) FILTER (WHERE tq.verified = TRUE) = 0
    THEN TRUE
    ELSE FALSE
  END AS missing_verified_qualification,

  CASE
    WHEN COUNT(tq.id) FILTER (
      WHERE tq.expiry_date IS NOT NULL
        AND tq.expiry_date < CURRENT_DATE
    ) > 0
    THEN TRUE
    ELSE FALSE
  END AS has_expired_qualifications

FROM teachers t
JOIN users u ON t.user_id = u.id
LEFT JOIN teacher_qualifications tq
  ON tq.teacher_id = t.id
  AND tq.status = 'active'
  AND tq.tenant_id = t.tenant_id
WHERE t.tenant_id::text = current_setting('app.current_tenant', TRUE)
GROUP BY t.id, t.tenant_id, t.user_id, u.name, t.employee_number, t.status;

COMMENT ON VIEW v_teacher_qualifications_status IS 'Qualification compliance summary for Trust-ED and ILEP reporting';
