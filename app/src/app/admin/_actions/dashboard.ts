'use server';

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/utils';

/**
 * Fetch admin alerts from v_admin_alerts view
 */
export async function getAdminAlerts() {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT
        alert_id,
        alert_type,
        priority,
        entity_type,
        entity_id,
        message,
        action_url,
        created_at,
        acknowledged_at,
        acknowledged_by,
        acknowledged_by_name
      FROM v_admin_alerts
      LIMIT 20
    `);

    return result.rows as Array<{
      alert_id: string;
      alert_type: string;
      priority: number;
      entity_type: string;
      entity_id: string;
      message: string;
      action_url: string | null;
      created_at: Date;
      acknowledged_at: Date | null;
      acknowledged_by: string | null;
      acknowledged_by_name: string | null;
    }>;
  } catch (error) {
    console.error('Error fetching admin alerts:', error);
    return [];
  }
}

/**
 * Fetch daily KPIs from v_admin_kpis_daily view
 */
export async function getAdminKPIs() {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT
        active_students,
        attendance_rate_7d,
        attendance_rate_30d,
        classes_running_today,
        capacity_utilisation,
        new_enrolments_7d,
        outstanding_compliance_tasks
      FROM v_admin_kpis_daily
    `);

    const row = result.rows[0] as any;

    return {
      activeStudents: Number(row?.active_students || 0),
      attendanceRate7d: parseFloat(row?.attendance_rate_7d || '0'),
      attendanceRate30d: parseFloat(row?.attendance_rate_30d || '0'),
      classesRunningToday: Number(row?.classes_running_today || 0),
      capacityUtilisation: parseFloat(row?.capacity_utilisation || '0'),
      newEnrolments7d: Number(row?.new_enrolments_7d || 0),
      outstandingComplianceTasks: Number(row?.outstanding_compliance_tasks || 0),
    };
  } catch (error) {
    console.error('Error fetching admin KPIs:', error);
    return {
      activeStudents: 0,
      attendanceRate7d: 0,
      attendanceRate30d: 0,
      classesRunningToday: 0,
      capacityUtilisation: 0,
      newEnrolments7d: 0,
      outstandingComplianceTasks: 0,
    };
  }
}

/**
 * Fetch work queue items from v_admin_work_queue view
 */
export async function getAdminWorkQueue() {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT
        item_type,
        item_label,
        entity_id,
        description,
        action_url,
        created_at
      FROM v_admin_work_queue
      LIMIT 20
    `);

    return result.rows as Array<{
      item_type: string;
      item_label: string;
      entity_id: string;
      description: string;
      action_url: string;
      created_at: Date;
    }>;
  } catch (error) {
    console.error('Error fetching admin work queue:', error);
    return [];
  }
}

/**
 * Fetch recent audit events from v_audit_events_recent view
 */
export async function getRecentAuditEvents() {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT
        id,
        action,
        resource_type,
        resource_id,
        changes,
        timestamp,
        actor_name,
        actor_email,
        actor_role
      FROM v_audit_events_recent
    `);

    return result.rows as Array<{
      id: string;
      action: string;
      resource_type: string | null;
      resource_id: string | null;
      changes: any;
      timestamp: Date;
      actor_name: string | null;
      actor_email: string | null;
      actor_role: string | null;
    }>;
  } catch (error) {
    console.error('Error fetching recent audit events:', error);
    return [];
  }
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    await db.execute(sql`
      UPDATE alerts
      SET acknowledged_at = NOW(),
          acknowledged_by = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
          updated_at = NOW()
      WHERE id = ${alertId}
        AND tenant_id = ${tenantId}
        AND acknowledged_at IS NULL
    `);

    return { success: true };
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return { success: false, error: 'Failed to acknowledge alert' };
  }
}
