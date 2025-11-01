/**
 * Audit Logging Module
 *
 * Provides immutable audit trail for all administrative actions.
 * All mutations are logged with who/what/when/why.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserClaims } from './auth.js';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  tenant_id: string;
  user_id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  changes?: {
    before?: unknown;
    after?: unknown;
  };
  metadata?: {
    ip_address?: string;
    user_agent?: string;
    reason?: string;
    [key: string]: unknown;
  };
}

/**
 * Log an administrative action to the audit trail
 *
 * @param client - Supabase client
 * @param claims - User claims (who performed the action)
 * @param entry - Audit log entry details
 */
export async function logAudit(
  client: SupabaseClient,
  claims: UserClaims,
  entry: Omit<AuditLogEntry, 'tenant_id' | 'user_id'>
): Promise<void> {
  const auditEntry: AuditLogEntry = {
    tenant_id: claims.tenant_id,
    user_id: claims.sub,
    ...entry,
  };

  const { error } = await client.from('audit_logs').insert(auditEntry);

  if (error) {
    // Log audit failure but don't throw - we don't want to block the operation
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Create audit log for user creation
 */
export function auditUserCreate(
  email: string,
  role: string,
  userId: string
): Omit<AuditLogEntry, 'tenant_id' | 'user_id'> {
  return {
    action: 'user.create',
    resource_type: 'user',
    resource_id: userId,
    changes: {
      before: null,
      after: { email, role },
    },
  };
}

/**
 * Create audit log for role assignment
 */
export function auditRoleAssign(
  userId: string,
  oldRole: string,
  newRole: string,
  reason?: string
): Omit<AuditLogEntry, 'tenant_id' | 'user_id'> {
  return {
    action: 'user.role_change',
    resource_type: 'user',
    resource_id: userId,
    changes: {
      before: { role: oldRole },
      after: { role: newRole },
    },
    metadata: reason ? { reason } : undefined,
  };
}

/**
 * Create audit log for class creation
 */
export function auditClassCreate(
  classId: string,
  className: string
): Omit<AuditLogEntry, 'tenant_id' | 'user_id'> {
  return {
    action: 'class.create',
    resource_type: 'class',
    resource_id: classId,
    changes: {
      before: null,
      after: { name: className },
    },
  };
}

/**
 * Create audit log for attendance marking
 */
export function auditAttendanceMark(
  attendanceId: string,
  studentId: string,
  status: string
): Omit<AuditLogEntry, 'tenant_id' | 'user_id'> {
  return {
    action: 'attendance.mark',
    resource_type: 'attendance',
    resource_id: attendanceId,
    changes: {
      before: null,
      after: { student_id: studentId, status },
    },
  };
}

/**
 * Create audit log for attendance correction
 */
export function auditAttendanceCorrect(
  attendanceId: string,
  oldStatus: string,
  newStatus: string,
  reason: string
): Omit<AuditLogEntry, 'tenant_id' | 'user_id'> {
  return {
    action: 'attendance.correct',
    resource_type: 'attendance',
    resource_id: attendanceId,
    changes: {
      before: { status: oldStatus },
      after: { status: newStatus },
    },
    metadata: { reason },
  };
}
