# Page 1: Admin Dashboard

**Route**: `/admin` or `/admin/dashboard`
**Role**: `admin`, `super_admin`

## Goal
One screen answering: "What needs attention today?" across operations, compliance, and data integrity.

## Primary Widgets

### 1. Alerts Panel (Priority Ordered)
- Visa risk (attendance threshold)
- Missing registers
- Timetable conflicts
- Failed ETL jobs
- Bounced emails

### 2. KPIs
- Active students
- Attendance rate (7/30 days)
- Classes running today
- Capacity utilisation
- New enrolments
- Outstanding compliance tasks

### 3. Work Queue
"Needs review":
- Register anomalies
- Pending user invites
- ETL validation failures

### 4. Recent Activity
Last 50 audit events relevant to admin scope

## Data Contracts (Read-Only)

Views recommended:
- `v_admin_alerts` - Alert data with priority, type, entity reference
- `v_admin_kpis_daily` - Daily KPI calculations
- `v_admin_work_queue` - Items requiring admin review
- `v_audit_events_recent` - Last 50 audit events for admin

## Actions
1. **Acknowledge alert** - Does not delete; marks as seen
2. **Jump-to workflow** - Deep links to target page with pre-filter

## Edge Cases
- KPI tiles must degrade gracefully if a view errors (show "Data unavailable" + incident ID)
- Alerts must deduplicate (same student+rule only once)

## Acceptance Criteria
- ✅ Dashboard loads < 2s for typical dataset (paginate recent activity)
- ✅ Alerts are actionable: each has a single canonical destination
- ✅ No write actions besides "acknowledge"

## Component Structure
```
/admin/page.tsx (or dashboard/page.tsx)
  ├── AlertsPanel
  │   └── AlertCard (with acknowledge action)
  ├── KPIGrid
  │   └── KPITile (with error state)
  ├── WorkQueue
  │   └── WorkQueueItem (with jump-to link)
  └── RecentActivity
      └── AuditEventRow (read-only)
```

## Database Views

### v_admin_alerts
```sql
CREATE OR REPLACE VIEW v_admin_alerts AS
SELECT
  alert_id,
  alert_type, -- 'visa_risk', 'missing_register', 'timetable_conflict', 'etl_failed', 'bounced_email'
  priority, -- 1 (critical), 2 (high), 3 (medium), 4 (low)
  entity_type, -- 'student', 'class', 'register', 'etl_job', 'email'
  entity_id,
  message,
  action_url, -- Deep link to target page
  created_at,
  acknowledged_at,
  acknowledged_by
FROM alerts
WHERE tenant_id = current_setting('app.current_tenant')::uuid
  AND (acknowledged_at IS NULL OR acknowledged_at > NOW() - INTERVAL '7 days')
ORDER BY priority ASC, created_at DESC;
```

### v_admin_kpis_daily
```sql
CREATE OR REPLACE VIEW v_admin_kpis_daily AS
SELECT
  (SELECT COUNT(*) FROM users WHERE role = 'student' AND status = 'active' AND tenant_id = current_setting('app.current_tenant')::uuid) AS active_students,
  (SELECT AVG(attendance_rate) FROM enrollments WHERE tenant_id = current_setting('app.current_tenant')::uuid AND updated_at > NOW() - INTERVAL '7 days') AS attendance_rate_7d,
  (SELECT AVG(attendance_rate) FROM enrollments WHERE tenant_id = current_setting('app.current_tenant')::uuid AND updated_at > NOW() - INTERVAL '30 days') AS attendance_rate_30d,
  (SELECT COUNT(*) FROM classes WHERE tenant_id = current_setting('app.current_tenant')::uuid AND start_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE) AND status = 'active') AS classes_running_today,
  (SELECT SUM(enrolled_count::numeric) / NULLIF(SUM(capacity), 0) FROM classes WHERE tenant_id = current_setting('app.current_tenant')::uuid AND status = 'active') AS capacity_utilisation,
  (SELECT COUNT(*) FROM users WHERE role = 'student' AND tenant_id = current_setting('app.current_tenant')::uuid AND created_at > NOW() - INTERVAL '7 days') AS new_enrolments_7d,
  (SELECT COUNT(*) FROM v_admin_work_queue) AS outstanding_compliance_tasks;
```

### v_admin_work_queue
```sql
CREATE OR REPLACE VIEW v_admin_work_queue AS
SELECT
  'register_anomaly' AS item_type,
  'Register Anomaly' AS item_label,
  class_session_id AS entity_id,
  'Missing attendance data for session on ' || session_date AS description,
  '/admin/attendance/' || class_session_id AS action_url,
  created_at
FROM class_sessions
WHERE tenant_id = current_setting('app.current_tenant')::uuid
  AND status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM attendance
    WHERE attendance.class_session_id = class_sessions.id
  )
UNION ALL
SELECT
  'pending_invite' AS item_type,
  'Pending User Invite' AS item_label,
  id AS entity_id,
  'User invited but not yet activated: ' || email AS description,
  '/admin/users/' || id AS action_url,
  created_at
FROM users
WHERE tenant_id = current_setting('app.current_tenant')::uuid
  AND status = 'invited'
  AND created_at < NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### v_audit_events_recent
```sql
CREATE OR REPLACE VIEW v_audit_events_recent AS
SELECT
  al.id,
  al.action,
  al.resource_type,
  al.resource_id,
  al.changes,
  al.timestamp,
  u.name AS actor_name,
  u.email AS actor_email
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.tenant_id = current_setting('app.current_tenant')::uuid
ORDER BY al.timestamp DESC
LIMIT 50;
```
