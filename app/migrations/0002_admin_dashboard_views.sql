-- Migration 0002: Admin Dashboard Views and Tables
-- Page 1: Admin Dashboard
-- Creates alerts table and dashboard views

-- ============================================================================
-- PART 1: Alerts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  alert_type VARCHAR(50) NOT NULL, -- visa_risk, missing_register, timetable_conflict, etl_failed, bounced_email
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 4), -- 1=critical, 2=high, 3=medium, 4=low
  
  entity_type VARCHAR(50) NOT NULL, -- student, class, register, etl_job, email
  entity_id UUID NOT NULL,
  
  message TEXT NOT NULL,
  action_url VARCHAR(500), -- Deep link to target page
  
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_tenant ON alerts(tenant_id);
CREATE INDEX idx_alerts_priority ON alerts(priority);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged_at);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);

-- ============================================================================
-- PART 2: Dashboard Views
-- ============================================================================

-- v_admin_alerts: Active alerts for dashboard
CREATE OR REPLACE VIEW v_admin_alerts AS
SELECT
  a.id AS alert_id,
  a.alert_type,
  a.priority,
  a.entity_type,
  a.entity_id,
  a.message,
  a.action_url,
  a.created_at,
  a.acknowledged_at,
  a.acknowledged_by,
  u.name AS acknowledged_by_name
FROM alerts a
LEFT JOIN users u ON a.acknowledged_by = u.id
WHERE a.tenant_id = (SELECT id FROM tenants LIMIT 1) -- Will be replaced with proper tenant context
  AND (a.acknowledged_at IS NULL OR a.acknowledged_at > NOW() - INTERVAL '7 days')
ORDER BY a.priority ASC, a.created_at DESC;

-- v_admin_kpis_daily: Daily KPIs for dashboard
CREATE OR REPLACE VIEW v_admin_kpis_daily AS
SELECT
  (SELECT COUNT(*) 
   FROM users 
   WHERE role = 'student' 
     AND status = 'active'
     AND tenant_id = (SELECT id FROM tenants LIMIT 1)
  ) AS active_students,
  
  (SELECT COALESCE(AVG(attendance_rate), 0) 
   FROM enrollments 
   WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
     AND updated_at > NOW() - INTERVAL '7 days'
  ) AS attendance_rate_7d,
  
  (SELECT COALESCE(AVG(attendance_rate), 0) 
   FROM enrollments 
   WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
     AND updated_at > NOW() - INTERVAL '30 days'
  ) AS attendance_rate_30d,
  
  (SELECT COUNT(*) 
   FROM classes 
   WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
     AND start_date <= CURRENT_DATE 
     AND (end_date IS NULL OR end_date >= CURRENT_DATE) 
     AND status = 'active'
  ) AS classes_running_today,
  
  (SELECT COALESCE(SUM(enrolled_count::numeric) / NULLIF(SUM(capacity), 0), 0) 
   FROM classes 
   WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
     AND status = 'active'
  ) AS capacity_utilisation,
  
  (SELECT COUNT(*) 
   FROM users 
   WHERE role = 'student' 
     AND tenant_id = (SELECT id FROM tenants LIMIT 1)
     AND created_at > NOW() - INTERVAL '7 days'
  ) AS new_enrolments_7d,
  
  (SELECT COUNT(*) FROM v_admin_work_queue) AS outstanding_compliance_tasks;

-- v_admin_work_queue: Items requiring admin attention
CREATE OR REPLACE VIEW v_admin_work_queue AS
SELECT
  'register_anomaly' AS item_type,
  'Register Anomaly' AS item_label,
  cs.id AS entity_id,
  'Missing attendance data for session on ' || cs.session_date AS description,
  '/admin/attendance/' || cs.id AS action_url,
  cs.created_at
FROM class_sessions cs
WHERE cs.tenant_id = (SELECT id FROM tenants LIMIT 1)
  AND cs.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.class_session_id = cs.id
  )

UNION ALL

SELECT
  'pending_invite' AS item_type,
  'Pending User Invite' AS item_label,
  u.id AS entity_id,
  'User invited but not yet activated: ' || u.email AS description,
  '/admin/users/' || u.id AS action_url,
  u.created_at
FROM users u
WHERE u.tenant_id = (SELECT id FROM tenants LIMIT 1)
  AND u.status = 'invited'
  AND u.created_at < NOW() - INTERVAL '7 days'

ORDER BY created_at DESC;

-- v_audit_events_recent: Last 50 audit events
CREATE OR REPLACE VIEW v_audit_events_recent AS
SELECT
  al.id,
  al.action,
  al.resource_type,
  al.resource_id,
  al.changes,
  al.timestamp,
  u.name AS actor_name,
  u.email AS actor_email,
  u.role AS actor_role
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.tenant_id = (SELECT id FROM tenants LIMIT 1)
ORDER BY al.timestamp DESC
LIMIT 50;

-- ============================================================================
-- PART 3: RLS Policies for Alerts
-- ============================================================================

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Admin can see all alerts for their tenant
CREATE POLICY alerts_admin_select ON alerts
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT id FROM tenants LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.tenant_id = alerts.tenant_id
    )
  );

-- Admin can acknowledge alerts
CREATE POLICY alerts_admin_update ON alerts
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (SELECT id FROM tenants LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.tenant_id = alerts.tenant_id
    )
  )
  WITH CHECK (
    tenant_id = (SELECT id FROM tenants LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.tenant_id = alerts.tenant_id
    )
  );

-- System can create alerts
CREATE POLICY alerts_system_insert ON alerts
  FOR INSERT
  TO authenticated
  USING (tenant_id = (SELECT id FROM tenants LIMIT 1))
  WITH CHECK (tenant_id = (SELECT id FROM tenants LIMIT 1));
