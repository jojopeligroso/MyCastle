/**
 * Admin Dashboard - Overview and quick stats
 */

import { db } from '@/db';
import { users, classes, invoices, enrollments } from '@/db/schema';
import { eq, and, count, sum, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import Link from 'next/link';

async function getDashboardStats(tenantId: string) {
  // Get total users by role
  const userStats = await db
    .select({
      role: users.role,
      count: count(),
    })
    .from(users)
    .where(and(eq(users.tenant_id, tenantId), eq(users.status, 'active')))
    .groupBy(users.role);

  // Get active classes
  const activeClasses = await db
    .select({ count: count() })
    .from(classes)
    .where(and(eq(classes.tenant_id, tenantId), eq(classes.status, 'active')));

  // Get pending invoices
  const pendingInvoices = await db
    .select({ count: count(), total: sum(invoices.amount) })
    .from(invoices)
    .where(and(eq(invoices.tenant_id, tenantId), eq(invoices.status, 'pending')));

  // Get total enrollments
  const totalEnrollments = await db
    .select({ count: count() })
    .from(enrollments)
    .where(and(eq(enrollments.tenant_id, tenantId), eq(enrollments.status, 'active')));

  return {
    users: userStats,
    activeClasses: activeClasses[0]?.count || 0,
    pendingInvoices: {
      count: pendingInvoices[0]?.count || 0,
      total: pendingInvoices[0]?.total || '0',
    },
    totalEnrollments: totalEnrollments[0]?.count || 0,
  };
}

export default async function AdminDashboard() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load dashboard. Please contact support.</p>
      </div>
    );
  }

  const stats = await getDashboardStats(tenantId);

  const userCounts = stats.users.reduce((acc, u) => {
    acc[u.role] = u.count;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Overview of your school operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Students */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {userCounts['student'] || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/admin/users?role=student" className="text-sm text-blue-600 hover:text-blue-800">
              View all students →
            </Link>
          </div>
        </div>

        {/* Total Teachers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Teachers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {userCounts['teacher'] || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/admin/users?role=teacher" className="text-sm text-green-600 hover:text-green-800">
              View all teachers →
            </Link>
          </div>
        </div>

        {/* Active Classes */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Classes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeClasses}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/admin/classes" className="text-sm text-purple-600 hover:text-purple-800">
              Manage classes →
            </Link>
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.pendingInvoices.count}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ${parseFloat(stats.pendingInvoices.total).toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/admin/finance" className="text-sm text-orange-600 hover:text-orange-800">
              View invoices →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/users?action=create"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Create User</p>
                <p className="text-sm text-gray-500">Add new student or teacher</p>
              </div>
            </Link>

            <Link
              href="/admin/classes?action=create"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <svg className="w-8 h-8 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Schedule Class</p>
                <p className="text-sm text-gray-500">Create new class schedule</p>
              </div>
            </Link>

            <Link
              href="/admin/finance?action=create_invoice"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <svg className="w-8 h-8 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Create Invoice</p>
                <p className="text-sm text-gray-500">Issue new invoice</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          <p className="text-gray-500 text-center py-8">
            Activity feed coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}
