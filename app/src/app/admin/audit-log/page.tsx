/**
 * Audit Log Page - View system audit trails
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import Link from 'next/link';

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  timestamp: Date;
}

async function getAuditLogs(tenantId: string): Promise<AuditLogEntry[]> {
  const result = await db.execute(sql`
    SELECT
      al.id,
      al.user_id,
      u.name as user_name,
      al.action,
      al.resource_type,
      al.resource_id,
      al.changes,
      al.metadata,
      al.timestamp
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.tenant_id = ${tenantId} OR al.tenant_id IS NULL
    ORDER BY al.timestamp DESC
    LIMIT 100
  `);

  return result as unknown as AuditLogEntry[];
}

function formatAction(action: string): { label: string; color: string } {
  const actionMap: Record<string, { label: string; color: string }> = {
    'student.create': { label: 'Student Created', color: 'bg-green-100 text-green-800' },
    'student.update': { label: 'Student Updated', color: 'bg-blue-100 text-blue-800' },
    'student.archive': { label: 'Student Archived', color: 'bg-yellow-100 text-yellow-800' },
    'student.level_approved': { label: 'Level Approved', color: 'bg-purple-100 text-purple-800' },
    'user.role.change': { label: 'Role Changed', color: 'bg-orange-100 text-orange-800' },
    'user.deactivate': { label: 'User Deactivated', color: 'bg-red-100 text-red-800' },
    'user.reactivate': { label: 'User Reactivated', color: 'bg-green-100 text-green-800' },
    'user.sessions.revoke': { label: 'Sessions Revoked', color: 'bg-red-100 text-red-800' },
    'user.mfa.reset': { label: 'MFA Reset', color: 'bg-yellow-100 text-yellow-800' },
  };

  return actionMap[action] || { label: action, color: 'bg-gray-100 text-gray-800' };
}

function formatTimestamp(timestamp: Date): string {
  const d = new Date(timestamp);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export default async function AuditLogPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load audit logs. Please try again.</p>
      </div>
    );
  }

  const logs = await getAuditLogs(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="mt-1 text-sm text-gray-500">View system activity and changes</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {logs.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Activity will appear here as changes are made to the system.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Changes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map(log => {
                  const { label, color } = formatAction(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {log.user_name || 'System'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.resource_type && (
                          <span className="capitalize">{log.resource_type}</span>
                        )}
                        {log.resource_id && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({log.resource_id.substring(0, 8)}...)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {log.changes ? (
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {JSON.stringify(log.changes).substring(0, 50)}
                            {JSON.stringify(log.changes).length > 50 && '...'}
                          </code>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          Showing the last {logs.length} log entries
        </p>
      )}
    </div>
  );
}
