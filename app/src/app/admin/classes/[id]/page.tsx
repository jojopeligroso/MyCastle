/**
 * Class Detail Page - View and edit individual class
 */

import { db } from '@/db';
import { classes, users, enrollments } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';

async function getClass(classId: string, tenantId: string) {
  const result = await db
    .select({
      class: classes,
      teacher: users,
    })
    .from(classes)
    .leftJoin(users, eq(classes.teacher_id, users.id))
    .where(and(eq(classes.id, classId), eq(classes.tenant_id, tenantId)))
    .limit(1);

  return result[0] || null;
}

async function getEnrolledStudents(classId: string) {
  const students = await db
    .select({
      student: users,
      enrollment: enrollments,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.student_id, users.id))
    .where(and(eq(enrollments.class_id, classId), eq(enrollments.status, 'active')))
    .orderBy(users.name);

  return students;
}

export default async function ClassDetailPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const classData = await getClass(params.id, tenantId);

  if (!classData) {
    notFound();
  }

  const students = await getEnrolledStudents(params.id);

  const { class: cls, teacher } = classData;
  const enrollmentPercentage = Math.round((students.length / cls.capacity) * 100);

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
                <dd className="mt-1 text-sm text-gray-900">{cls.level}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Subject</dt>
                <dd className="mt-1 text-sm text-gray-900">{cls.subject}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Schedule</dt>
                <dd className="mt-1 text-sm text-gray-900">{cls.schedule_description}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      cls.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {cls.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(cls.start_date).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">End Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {cls.end_date ? new Date(cls.end_date).toLocaleDateString() : 'Ongoing'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Enrolled Students */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Enrolled Students ({students.length}/{cls.capacity})
            </h2>

            {students.length === 0 ? (
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
                        Email
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Enrolled
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {students.map(({ student, enrollment }) => (
                      <tr key={student.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{student.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(enrollment.enrollment_date).toLocaleDateString()}
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
                <p className="text-sm text-gray-500">{teacher.email}</p>
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
                  {students.length} / {cls.capacity}
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
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                Add Students
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                View Attendance
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                View Materials
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
