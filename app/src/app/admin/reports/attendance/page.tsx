/**
 * Attendance Reports Page - Class and student attendance analytics
 */

import { db } from '@/db';
import { classes, classSessions, attendance, enrollments, students, users } from '@/db/schema';
import { eq, and, between, desc, sql, count } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import Link from 'next/link';

// Helper to get date 30 days ago
function getLast30Days() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  return {
    start: thirtyDaysAgo.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0],
  };
}

async function getClassAttendanceStats(tenantId: string, startDate: string, endDate: string) {
  // Get attendance stats per class
  const stats = await db
    .select({
      classId: classes.id,
      className: classes.name,
      classCode: classes.code,
      level: classes.level,
      totalSessions: count(classSessions.id).as('total_sessions'),
      presentCount: sql<number>`COUNT(CASE WHEN ${attendance.status} = 'present' THEN 1 END)`.as(
        'present_count'
      ),
      absentCount: sql<number>`COUNT(CASE WHEN ${attendance.status} = 'absent' THEN 1 END)`.as(
        'absent_count'
      ),
      attendanceRate: sql<number>`ROUND(
        COALESCE(
          COUNT(CASE WHEN ${attendance.status} = 'present' THEN 1 END)::numeric /
          NULLIF(COUNT(${attendance.id}), 0) * 100,
          0
        ),
        1
      )`.as('attendance_rate'),
    })
    .from(classes)
    .leftJoin(classSessions, eq(classSessions.classId, classes.id))
    .leftJoin(
      attendance,
      and(
        eq(attendance.classSessionId, classSessions.id),
        between(classSessions.sessionDate, startDate, endDate)
      )
    )
    .where(and(eq(classes.tenantId, tenantId), eq(classes.status, 'active')))
    .groupBy(classes.id)
    .orderBy(desc(sql`attendance_rate`));

  return stats;
}

async function getStudentAttendanceStats(tenantId: string, startDate: string, endDate: string) {
  // Get attendance stats per student
  const stats = await db
    .select({
      studentId: students.userId,
      studentNumber: students.studentNumber,
      studentName: users.name,
      className: classes.name,
      sessionsScheduled: count(classSessions.id).as('sessions_scheduled'),
      sessionsAttended:
        sql<number>`COUNT(CASE WHEN ${attendance.status} = 'present' THEN 1 END)`.as(
          'sessions_attended'
        ),
      sessionsMissed: sql<number>`COUNT(CASE WHEN ${attendance.status} = 'absent' THEN 1 END)`.as(
        'sessions_missed'
      ),
      attendanceRate: sql<number>`ROUND(
        COALESCE(
          COUNT(CASE WHEN ${attendance.status} = 'present' THEN 1 END)::numeric /
          NULLIF(COUNT(${attendance.id}), 0) * 100,
          0
        ),
        1
      )`.as('attendance_rate'),
    })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(
      enrollments,
      and(eq(enrollments.studentId, students.userId), eq(enrollments.status, 'active'))
    )
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .leftJoin(classSessions, eq(classSessions.classId, classes.id))
    .leftJoin(
      attendance,
      and(
        eq(attendance.classSessionId, classSessions.id),
        eq(attendance.studentId, students.userId),
        between(classSessions.sessionDate, startDate, endDate)
      )
    )
    .where(eq(students.tenantId, tenantId))
    .groupBy(students.userId, students.studentNumber, users.name, classes.name)
    .orderBy(sql`attendance_rate ASC NULLS LAST`);

  return stats;
}

export default async function AttendanceReportsPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  const { start, end } = getLast30Days();
  const classStats = await getClassAttendanceStats(tenantId, start, end);
  const studentStats = await getStudentAttendanceStats(tenantId, start, end);

  // Calculate overall stats
  const totalSessions = classStats.reduce((sum, c) => sum + Number(c.totalSessions), 0);
  const avgAttendanceRate =
    classStats.length > 0
      ? classStats.reduce((sum, c) => sum + Number(c.attendanceRate || 0), 0) / classStats.length
      : 0;
  const classesAtRisk = classStats.filter(c => Number(c.attendanceRate || 0) < 80).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Class and student attendance analytics (Last 30 days: {start} to {end})
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Sessions</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalSessions}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Avg Attendance Rate</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{avgAttendanceRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Classes At Risk (&lt;80%)</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{classesAtRisk}</p>
        </div>
      </div>

      {/* Class Attendance Summary */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Class Attendance Summary</h2>
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
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Present
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Absent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classStats.map(stat => {
                  const rate = Number(stat.attendanceRate || 0);
                  const badgeColor =
                    rate >= 90
                      ? 'bg-green-100 text-green-800'
                      : rate >= 70
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800';

                  return (
                    <tr key={stat.classId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/classes/${stat.classId}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-900"
                        >
                          {stat.className}
                          {stat.classCode && ` (${stat.classCode})`}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stat.level || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stat.totalSessions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {stat.presentCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {stat.absentCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}
                        >
                          {rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Student Attendance Report */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Student Attendance Report</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Scheduled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Attended
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Missed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentStats.map(stat => {
                  const rate = Number(stat.attendanceRate || 0);
                  const badgeColor =
                    rate > 90
                      ? 'bg-green-100 text-green-800'
                      : rate >= 70
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800';
                  const statusText = rate > 90 ? 'Good' : rate >= 70 ? 'At Risk' : 'Critical';

                  return (
                    <tr key={`${stat.studentId}-${stat.className}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{stat.studentName}</div>
                        <div className="text-sm text-gray-500">{stat.studentNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stat.className}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stat.sessionsScheduled}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {stat.sessionsAttended}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {stat.sessionsMissed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}
                        >
                          {rate.toFixed(1)}% - {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
