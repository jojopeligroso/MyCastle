/**
 * Enrollment Reports Page - Class rosters, capacity tracking, enrollment trends
 */

import { db } from '@/db';
import { classes, enrollments, students, users } from '@/db/schema';
import { eq, and, desc, sql, count, gte } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import Link from 'next/link';

async function getClassRosterStats(tenantId: string) {
  // Get class rosters with enrolled students
  const rosters = await db
    .select({
      classId: classes.id,
      className: classes.name,
      classCode: classes.code,
      level: classes.level,
      capacity: classes.capacity,
      enrolledCount: classes.enrolledCount,
      teacherName: users.name,
      startDate: classes.startDate,
      endDate: classes.endDate,
      activeEnrollments:
        sql<number>`COUNT(CASE WHEN ${enrollments.status} = 'active' THEN 1 END)`.as(
          'active_enrollments'
        ),
    })
    .from(classes)
    .leftJoin(users, eq(users.id, classes.teacherId))
    .leftJoin(
      enrollments,
      and(eq(enrollments.classId, classes.id), eq(enrollments.status, 'active'))
    )
    .where(and(eq(classes.tenantId, tenantId), eq(classes.status, 'active')))
    .groupBy(classes.id, users.name)
    .orderBy(desc(classes.name));

  return rosters;
}

async function getEnrollmentTrends(tenantId: string) {
  // Get enrollment trends for last 12 weeks
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
  const dateThreshold = twelveWeeksAgo.toISOString().split('T')[0];

  const trends = await db
    .select({
      weekStart: sql<string>`DATE_TRUNC('week', ${enrollments.enrollmentDate})`.as('week_start'),
      newEnrollments: count(enrollments.id).as('new_enrollments'),
      active: sql<number>`COUNT(CASE WHEN ${enrollments.status} = 'active' THEN 1 END)`.as(
        'active'
      ),
      completed: sql<number>`COUNT(CASE WHEN ${enrollments.status} = 'completed' THEN 1 END)`.as(
        'completed'
      ),
      dropped: sql<number>`COUNT(CASE WHEN ${enrollments.status} = 'dropped' THEN 1 END)`.as(
        'dropped'
      ),
    })
    .from(enrollments)
    .where(and(eq(enrollments.tenantId, tenantId), gte(enrollments.enrollmentDate, dateThreshold)))
    .groupBy(sql`week_start`)
    .orderBy(desc(sql`week_start`));

  return trends;
}

export default async function EnrollmentReportsPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  const classRosters = await getClassRosterStats(tenantId);
  const enrollmentTrends = await getEnrollmentTrends(tenantId);

  // Calculate overall stats
  const totalClasses = classRosters.length;
  const totalEnrolled = classRosters.reduce((sum, c) => sum + Number(c.enrolledCount), 0);
  const avgClassSize = totalClasses > 0 ? (totalEnrolled / totalClasses).toFixed(1) : 0;
  const classesAtCapacity = classRosters.filter(
    c => Number(c.enrolledCount) >= Number(c.capacity) * 0.9
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Enrollment Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Class rosters, capacity tracking, and enrollment trends
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Classes</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalClasses}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Enrolled</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{totalEnrolled}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Avg Class Size</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{avgClassSize}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">At Capacity (&gt;90%)</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{classesAtCapacity}</p>
        </div>
      </div>

      {/* Class Roster Report */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Class Roster & Capacity</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Teacher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Enrolled/Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Dates
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classRosters.map(roster => {
                  const enrolled = Number(roster.enrolledCount);
                  const capacity = Number(roster.capacity);
                  const utilization = capacity > 0 ? (enrolled / capacity) * 100 : 0;
                  const badgeColor =
                    utilization >= 90
                      ? 'bg-red-100 text-red-800'
                      : utilization >= 75
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800';

                  return (
                    <tr key={roster.classId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/classes/${roster.classId}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-900"
                        >
                          {roster.className}
                          {roster.classCode && ` (${roster.classCode})`}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {roster.level || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {roster.teacherName || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {enrolled} / {capacity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}
                        >
                          {utilization.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(roster.startDate).toLocaleDateString()}
                        {roster.endDate && ` - ${new Date(roster.endDate).toLocaleDateString()}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Enrollment Trends */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Enrollment Trends (Last 12 Weeks)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Week Starting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    New Enrollments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Dropped
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {enrollmentTrends.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                      No enrollment data for the last 12 weeks
                    </td>
                  </tr>
                ) : (
                  enrollmentTrends.map(trend => (
                    <tr key={trend.weekStart}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(trend.weekStart).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trend.newEnrollments}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {trend.active}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        {trend.completed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {trend.dropped}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
