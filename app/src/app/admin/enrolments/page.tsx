/**
 * Enrolments List Page - View and manage student enrolments
 * MCP Resource: admin://enrolments
 */

import { db } from '@/db';
import { enrollments, classes, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';

async function getEnrolments(tenantId: string) {
  const allEnrolments = await db
    .select({
      enrolment: enrollments,
      student: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      class: {
        id: classes.id,
        name: classes.name,
        code: classes.code,
        level: classes.level,
      },
    })
    .from(enrollments)
    .leftJoin(users, eq(enrollments.student_id, users.id))
    .leftJoin(classes, eq(enrollments.class_id, classes.id))
    .where(eq(enrollments.tenant_id, tenantId))
    .orderBy(desc(enrollments.enrollment_date));

  return allEnrolments;
}

async function getEnrolmentStats(tenantId: string) {
  const allEnrolments = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.tenant_id, tenantId));

  const totalEnrolments = allEnrolments.length;
  const activeEnrolments = allEnrolments.filter(e => e.status === 'active').length;
  const completedEnrolments = allEnrolments.filter(e => e.status === 'completed').length;
  const droppedEnrolments = allEnrolments.filter(e => e.status === 'dropped').length;

  // Calculate average attendance rate
  const attendanceRates = allEnrolments
    .map(e => parseFloat(e.attendance_rate || '0'))
    .filter(rate => rate > 0);
  const avgAttendance =
    attendanceRates.length > 0
      ? (attendanceRates.reduce((a, b) => a + b, 0) / attendanceRates.length).toFixed(2)
      : '0.00';

  return {
    totalEnrolments,
    activeEnrolments,
    completedEnrolments,
    droppedEnrolments,
    avgAttendance,
  };
}

export default async function EnrolmentsPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const enrolments = await getEnrolments(tenantId);
  const stats = await getEnrolmentStats(tenantId);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enrolments</h1>
          <p className="mt-2 text-gray-600">Track student enrolments and progression</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/classes"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            View Classes
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Enrolments</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.totalEnrolments}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Active</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{stats.activeEnrolments}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Completed</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{stats.completedEnrolments}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Dropped</div>
          <div className="mt-2 text-3xl font-bold text-red-600">{stats.droppedEnrolments}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Avg Attendance</div>
          <div className="mt-2 text-3xl font-bold text-purple-600">{stats.avgAttendance}%</div>
        </div>
      </div>

      {/* Enrolments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enrolment Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attendance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {enrolments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No enrolments found. Students can be enrolled from the class pages.
                </td>
              </tr>
            ) : (
              enrolments.map(({ enrolment, student, class: classInfo }) => (
                <tr key={enrolment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {student?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">{student?.email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{classInfo?.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{classInfo?.code || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {classInfo?.level || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(enrolment.enrollment_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {enrolment.attendance_rate
                        ? `${parseFloat(enrolment.attendance_rate).toFixed(1)}%`
                        : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        enrolment.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : enrolment.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {enrolment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/admin/students/${student?.id}`}
                      className="text-purple-600 hover:text-purple-900 mr-4"
                    >
                      View Student
                    </Link>
                    <Link
                      href={`/admin/classes/${classInfo?.id}`}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      View Class
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
