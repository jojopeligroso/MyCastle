/**
 * Class Detail Page - View and edit individual class
 */

import { db } from '@/db';
import { classes, users, enrollments, students } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';

async function getClass(classId: string, tenantId: string) {
  // Set RLS context
  await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const result = await db
    .select({
      class: classes,
      teacher: users,
    })
    .from(classes)
    .leftJoin(users, eq(classes.teacherId, users.id))
    .where(and(eq(classes.id, classId), eq(classes.tenantId, tenantId)))
    .limit(1);

  return result[0] || null;
}

async function getEnrolledStudents(classId: string) {
  // RLS context already set by getClass
  const result = await db
    .select({
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      studentId: students.id,
      studentNumber: students.studentNumber,
      enrollmentDate: enrollments.enrollmentDate,
      enrollmentStatus: enrollments.status,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.studentId, users.id))
    .leftJoin(students, eq(students.userId, users.id))
    .where(and(eq(enrollments.classId, classId), eq(enrollments.status, 'active')))
    .orderBy(users.name);

  return result;
}

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const classData = await getClass(id, tenantId);

  if (!classData) {
    notFound();
  }

  const enrolledStudents = await getEnrolledStudents(id);

  const { class: cls, teacher } = classData;
  const enrollmentPercentage = Math.round((enrolledStudents.length / cls.capacity) * 100);

  // Format days of week for display
  const daysOfWeek = (cls.daysOfWeek as string[] | null) || [];
  const daysDisplay = daysOfWeek.length > 0 ? daysOfWeek.join(', ') : 'Not specified';

  // Format time display
  const timeDisplay =
    cls.startTime && cls.endTime ? `${cls.startTime} - ${cls.endTime}` : 'Not specified';

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/admin/classes"
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            ← Back to Classes
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{cls.name}</h1>
          <p className="mt-2 text-gray-600">{cls.code}</p>
        </div>
        <Link
          href={`/admin/classes/${cls.id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Edit Class
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Class Details</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Level</dt>
                <dd className="mt-1 text-sm text-gray-900">{cls.level || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Subject</dt>
                <dd className="mt-1 text-sm text-gray-900">{cls.subject || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      cls.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : cls.status === 'completed'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {cls.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Capacity</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {enrolledStudents.length} / {cls.capacity}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Class Time</dt>
                <dd className="mt-1 text-sm text-gray-900">{timeDisplay}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Days of Week</dt>
                <dd className="mt-1 text-sm text-gray-900">{daysDisplay}</dd>
              </div>
              {cls.breakDurationMinutes ? (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Break Duration</dt>
                  <dd className="mt-1 text-sm text-gray-900">{cls.breakDurationMinutes} minutes</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(cls.startDate).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">End Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {cls.endDate ? new Date(cls.endDate).toLocaleDateString() : 'Ongoing'}
                </dd>
              </div>
            </dl>
            {cls.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{cls.description}</dd>
              </div>
            )}
          </div>

          {/* Enrolled Students */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Enrolled Students ({enrolledStudents.length}/{cls.capacity})
            </h2>

            {enrolledStudents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No students enrolled yet</p>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Student
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Student #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Enrolled
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {enrolledStudents.map(student => (
                      <tr key={student.userId}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {student.userName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {student.studentNumber || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{student.userEmail}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(student.enrollmentDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600">
                          {student.studentId && (
                            <Link
                              href={`/admin/students/${student.studentId}`}
                              className="hover:text-blue-800"
                            >
                              View Profile
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Teacher Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Assigned Teacher</h3>
            {teacher ? (
              <div>
                <p className="text-sm font-medium text-gray-900">{teacher.name}</p>
                <p className="text-sm text-gray-500 mb-2">{teacher.email}</p>
                <Link
                  href={`/admin/teachers`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View Teachers →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-orange-600">No teacher assigned</p>
            )}
          </div>

          {/* Capacity Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Enrollment</h3>
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Capacity</span>
                <span className="font-medium">
                  {enrolledStudents.length} / {cls.capacity}
                </span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    enrollmentPercentage >= 90
                      ? 'bg-red-600'
                      : enrollmentPercentage >= 75
                        ? 'bg-orange-600'
                        : 'bg-green-600'
                  }`}
                  style={{ width: `${enrollmentPercentage}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{enrollmentPercentage}% full</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href={`/admin/classes/${cls.id}/edit`}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Edit Class Details
              </Link>
              <Link
                href={`/admin/attendance?classId=${cls.id}`}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
              >
                View Attendance Register
              </Link>
              <Link
                href="/admin/enrollments"
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Manage Enrollments
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
