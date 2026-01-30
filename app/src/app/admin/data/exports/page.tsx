/**
 * Data Exports Management Page - Task 1.11.3
 *
 * Lists available export types and past exports with download links.
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { exports } from '@/db/schema/system';
import { users } from '@/db/schema/core';
import { eq, desc, sql } from 'drizzle-orm';
import {
  Download,
  FileText,
  Users,
  Calendar,
  DollarSign,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface ExportWithUser {
  id: string;
  filename: string;
  template_id: string;
  file_url: string | null;
  row_count: number | null;
  created_at: Date;
  expires_at: Date | null;
  requested_by_name: string | null;
}

const EXPORT_TYPES = [
  {
    id: 'attendance',
    name: 'Attendance Records',
    description: 'Export attendance data for classes, sessions, and students',
    icon: Calendar,
    color: 'blue',
  },
  {
    id: 'students',
    name: 'Student Roster',
    description: 'Export complete student information and profiles',
    icon: Users,
    color: 'green',
  },
  {
    id: 'financial',
    name: 'Financial Reports',
    description: 'Export bookings, payments, and revenue data',
    icon: DollarSign,
    color: 'yellow',
  },
  {
    id: 'classes',
    name: 'Class Reports',
    description: 'Export class schedules, capacity, and enrollment data',
    icon: BookOpen,
    color: 'purple',
  },
  {
    id: 'enrollments',
    name: 'Enrollments',
    description: 'Export enrollment history and amendments',
    icon: FileText,
    color: 'indigo',
  },
];

async function getPastExports(): Promise<ExportWithUser[]> {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return [];
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    const result = await db
      .select({
        id: exports.id,
        filename: exports.filename,
        template_id: exports.templateId,
        file_url: exports.fileUrl,
        row_count: exports.rowCount,
        created_at: exports.createdAt,
        expires_at: exports.expiresAt,
        requested_by_name: users.name,
      })
      .from(exports)
      .leftJoin(users, eq(exports.requestedBy, users.id))
      .where(eq(exports.tenantId, tenantId))
      .orderBy(desc(exports.createdAt))
      .limit(50);

    return result;
  } catch (error) {
    console.error('Failed to fetch past exports:', error);
    return [];
  }
}

export default async function DataExportsPage() {
  await requireAuth();

  const pastExports = await getPastExports();

  // Group exports by type
  const exportsByType = pastExports.reduce(
    (acc, exp) => {
      const type = exp.template_id.split('_')[0]; // e.g., "attendance_weekly" -> "attendance"
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(exp);
      return acc;
    },
    {} as Record<string, ExportWithUser[]>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Exports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Export system data to CSV or Excel for external analysis
        </p>
      </div>

      {/* Export Types Grid */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Available Export Types</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXPORT_TYPES.map(exportType => {
            const Icon = exportType.icon;
            const count = exportsByType[exportType.id]?.length || 0;

            return (
              <div
                key={exportType.id}
                className="relative rounded-lg border border-gray-300 bg-white p-6 shadow-sm hover:border-gray-400 transition-colors"
              >
                <div className="flex items-start">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg bg-${exportType.color}-50`}
                  >
                    <Icon className={`h-6 w-6 text-${exportType.color}-600`} />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-base font-medium text-gray-900">{exportType.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{exportType.description}</p>
                    {count > 0 && (
                      <p className="mt-2 text-xs text-gray-400">
                        {count} past export{count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    disabled
                    className="w-full inline-flex justify-center items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-400 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Create Export
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Past Exports Table */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Past Exports</h3>

          {pastExports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No exports yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create your first export using the options above
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Export Type
                    </th>
                    <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rows
                    </th>
                    <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pastExports.map(exportItem => {
                    const isExpired = exportItem.expires_at
                      ? new Date(exportItem.expires_at) < new Date()
                      : false;
                    const hasUrl = exportItem.file_url && !isExpired;

                    return (
                      <tr key={exportItem.id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {exportItem.template_id.includes('attendance') && (
                              <Calendar className="h-4 w-4 text-blue-500 mr-2" />
                            )}
                            {exportItem.template_id.includes('student') && (
                              <Users className="h-4 w-4 text-green-500 mr-2" />
                            )}
                            {exportItem.template_id.includes('financial') && (
                              <DollarSign className="h-4 w-4 text-yellow-500 mr-2" />
                            )}
                            {exportItem.template_id.includes('class') && (
                              <BookOpen className="h-4 w-4 text-purple-500 mr-2" />
                            )}
                            <span className="text-sm text-gray-900">
                              {exportItem.template_id.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {exportItem.filename}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {exportItem.row_count?.toLocaleString() || '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {exportItem.requested_by_name || 'Unknown'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(exportItem.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          {isExpired ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Expired
                            </span>
                          ) : hasUrl ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Processing
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {hasUrl ? (
                            <a
                              href={exportItem.file_url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-indigo-600 hover:text-indigo-900"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {pastExports.length >= 50 && (
                <div className="px-3 py-3 bg-gray-50 text-sm text-gray-500 text-center">
                  Showing 50 most recent exports
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
