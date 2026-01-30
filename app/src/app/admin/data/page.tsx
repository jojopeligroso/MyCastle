/**
 * Data Management Dashboard - Task 1.11.1
 *
 * Landing page for data operations:
 * - Links to bulk upload and exports
 * - Recent import/export jobs
 * - Status indicators
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { exports } from '@/db/schema/system';
import { users } from '@/db/schema/core';
import { eq, desc, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Upload, Download, FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface RecentExport {
  id: string;
  filename: string;
  template_id: string;
  row_count: number | null;
  created_at: Date;
  expires_at: Date | null;
  requested_by_name: string | null;
}

async function getRecentExports(): Promise<RecentExport[]> {
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
        row_count: exports.rowCount,
        created_at: exports.createdAt,
        expires_at: exports.expiresAt,
        requested_by_name: users.name,
      })
      .from(exports)
      .leftJoin(users, eq(exports.requestedBy, users.id))
      .where(eq(exports.tenantId, tenantId))
      .orderBy(desc(exports.createdAt))
      .limit(10);

    return result;
  } catch (error) {
    console.error('Failed to fetch recent exports:', error);
    return [];
  }
}

async function getStats() {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return { total: 0, last7Days: 0, lastMonth: 0 };
    }

    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await db
      .select({
        total: sql<number>`count(*)::int`,
        last_7_days: sql<number>`count(*) filter (where created_at >= ${last7Days})::int`,
        last_month: sql<number>`count(*) filter (where created_at >= ${lastMonth})::int`,
      })
      .from(exports)
      .where(eq(exports.tenantId, tenantId));

    return {
      total: result[0]?.total || 0,
      last7Days: result[0]?.last_7_days || 0,
      lastMonth: result[0]?.last_month || 0,
    };
  } catch (error) {
    console.error('Failed to fetch export stats:', error);
    return { total: 0, last7Days: 0, lastMonth: 0 };
  }
}

export default async function DataManagementPage() {
  await requireAuth();

  const [recentExports, stats] = await Promise.all([getRecentExports(), getStats()]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
        <p className="mt-1 text-sm text-gray-500">Manage bulk data operations and exports</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Exports</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Last 7 Days</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.last7Days}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Last 30 Days</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.lastMonth}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Bulk Upload Card */}
        <Link
          href="/admin/data/bulk-upload"
          className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                <Upload className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                Bulk Upload
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Import students, classes, and enrollments via CSV or Excel files. Full validation
                and review before committing changes.
              </p>
              <div className="mt-3">
                <span className="text-sm font-medium text-indigo-600 group-hover:text-indigo-700">
                  Upload data →
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Data Exports Card */}
        <Link
          href="/admin/data/exports"
          className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-green-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 group-hover:bg-green-100 transition-colors">
                <Download className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                Data Exports
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Export attendance records, student rosters, financial reports, and more. Generate
                CSV or Excel files for external analysis.
              </p>
              <div className="mt-3">
                <span className="text-sm font-medium text-green-600 group-hover:text-green-700">
                  Export data →
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Exports */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Exports</h3>

          {recentExports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No exports yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first data export
              </p>
              <div className="mt-6">
                <Link
                  href="/admin/data/exports"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Download className="-ml-1 mr-2 h-5 w-5" />
                  Create Export
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentExports.map(exportItem => {
                    const isExpired = exportItem.expires_at
                      ? new Date(exportItem.expires_at) < new Date()
                      : false;

                    return (
                      <tr key={exportItem.id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {exportItem.filename}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {exportItem.template_id.replace(/_/g, ' ')}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {exportItem.row_count || '-'}
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
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Available
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {recentExports.length === 10 && (
                <div className="px-3 py-3 bg-gray-50 text-sm text-gray-500 text-center">
                  Showing 10 most recent exports
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
