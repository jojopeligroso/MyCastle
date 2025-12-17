/**
 * Admin Dashboard - Overview and quick stats
 */

import { db } from '@/db';
import { users, classes, invoices, enrollments } from '@/db/schema';
import { eq, and, count, sum } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import Link from 'next/link';

async function getDashboardStats(tenantId: string) {
  // Get total users by role
  const userStats = await db
    .select({ role: users.role, count: count() })
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
  const user = await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load dashboard. Contact support.</p>
      </div>
    );
  }

  // Graceful fallback if DB fails
  let stats = { users: [], activeClasses: 0, pendingInvoices: { count: 0, total: '0' }, totalEnrollments: 0 };
  let dbError = false;

  try {
    stats = await getDashboardStats(tenantId);
  } catch (err) {
    console.error("Dashboard stats failed:", err);
    dbError = true;
  }

  const userCounts = (stats.users || []).reduce((acc: any, u: any) => {
    acc[u.role] = u.count;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.user_metadata?.name || 'Admin'}!</h1>
          <p className="mt-2 text-gray-600">Here is your improved command center.</p>
        </div>
        <div>
          {dbError && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              ⚠️ Data sync issues detected
            </span>
          )}
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsTile
          title="Total Students"
          value={userCounts['student'] || 0}
          icon="users"
          color="blue"
          link="/admin/students"
        />
        <StatsTile
          title="Active Teachers"
          value={userCounts['teacher'] || 0}
          icon="academic-cap"
          color="green"
          link="/admin/teachers"
        />
        <StatsTile
          title="Active Classes"
          value={stats.activeClasses}
          icon="book-open"
          color="purple"
          link="/admin/classes"
        />
        <StatsTile
          title="Pending Revenue"
          value={`$${stats.pendingInvoices.total}`}
          icon="currency-dollar"
          color="yellow"
          link="/admin/finance"
        />
      </div>

      <h2 className="text-xl font-semibold text-gray-800 mb-4">Management Modules</h2>

      {/* Module Navigation Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

        {/* Registry */}
        <NavTile title="User Management" desc="Manage accounts & roles" href="/admin/users" icon="user-group" />
        <NavTile title="Student Registry" desc="Profiles & enrollments" href="/admin/students" icon="user" />
        <NavTile title="Class Management" desc="Cohorts & scheduling" href="/admin/classes" icon="library" />

        {/* Academic */}
        <NavTile title="Timetables" desc="Weekly schedules" href="/admin/timetable" icon="calendar" />
        <NavTile title="Attendance" desc="Verify registers" href="/admin/attendance" icon="clipboard-check" />
        <NavTile title="Progress Tracking" desc="CEFR & grades" href="/admin/progress" icon="chart-bar" />

        {/* Compliance */}
        <NavTile title="Visa Compliance" desc="Immigration status" href="/admin/compliance/visa" icon="passport" />
        <NavTile title="Regulatory Reports" desc="Standard exports" href="/admin/compliance/regulatory" icon="document-report" />
        <NavTile title="Audit Logs" desc="Security trail" href="/admin/audit-log" icon="shield-check" />

        {/* System */}
        <NavTile title="System Settings" desc="Configuration" href="/admin/settings" icon="cog" />
        <NavTile title="Bulk Uploads" desc="CSV/Excel import" href="/admin/data/bulk-upload" icon="upload" />
        <NavTile title="Help Center" desc="Diagnostics & support" href="/admin/help" icon="question-mark-circle" />

      </div>
    </div>
  );
}

function StatsTile({ title, value, icon, color, link }: any) {
  return (
    <Link href={link} className={`bg-white rounded-xl shadow-sm p-6 border-l-4 border-${color}-500 hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-2 bg-${color}-50 rounded-lg`}>
          <span className={`text-${color}-600 font-bold text-xl`}>#</span>
        </div>
      </div>
    </Link>
  );
}

function NavTile({ title, desc, href, icon }: any) {
  return (
    <Link href={href} className="flex flex-col p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all group">
      <div className="flex items-center mb-3">
        <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors mr-3">
          <span className="text-gray-500 group-hover:text-blue-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">{title}</h3>
      </div>
      <p className="text-sm text-gray-500">{desc}</p>
    </Link>
  );
}
