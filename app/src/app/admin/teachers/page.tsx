/**
 * Teachers Management Page - List teachers and manage class assignments
 */

import { db } from '@/db';
import { users, classes } from '@/db/schema';
import { eq, and, count, or, desc, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import Link from 'next/link';

async function getTeachers(tenantId: string) {
  // Get all teachers with their assigned class count
  const teachers = await db
    .select({
      teacher: users,
      assignedClassesCount: count(classes.id),
    })
    .from(users)
    .leftJoin(classes, and(eq(classes.teacherId, users.id), eq(classes.status, 'active')))
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.primaryRole, 'teacher'),
        eq(users.status, 'active')
      )
    )
    .groupBy(users.id)
    .orderBy(desc(users.name));

  return teachers;
}

async function getActiveClasses(tenantId: string) {
  // Get all active classes for assignment dropdown
  const activeClasses = await db
    .select({
      id: classes.id,
      name: classes.name,
      code: classes.code,
      level: classes.level,
      teacherId: classes.teacherId,
    })
    .from(classes)
    .where(and(eq(classes.tenantId, tenantId), eq(classes.status, 'active')))
    .orderBy(classes.name);

  return activeClasses;
}

async function getTeacherClasses(tenantId: string, teacherId: string) {
  // Get all classes assigned to a specific teacher
  const teacherClasses = await db
    .select({
      id: classes.id,
      name: classes.name,
      code: classes.code,
      level: classes.level,
      enrolledCount: classes.enrolledCount,
      capacity: classes.capacity,
      startDate: classes.startDate,
      endDate: classes.endDate,
    })
    .from(classes)
    .where(
      and(
        eq(classes.tenantId, tenantId),
        eq(classes.teacherId, teacherId),
        eq(classes.status, 'active')
      )
    )
    .orderBy(classes.name);

  return teacherClasses;
}

export default async function TeachersPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load teachers. Please try again.</p>
      </div>
    );
  }

  const teachers = await getTeachers(tenantId);
  const activeClasses = await getActiveClasses(tenantId);

  // Calculate stats
  const stats = {
    total: teachers.length,
    active: teachers.filter(t => t.teacher.status === 'active').length,
    assigned: teachers.filter(t => t.assignedClassesCount > 0).length,
    unassigned: teachers.filter(t => t.assignedClassesCount === 0).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage teachers and their class assignments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Teachers</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Assigned to Classes</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.assigned}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Unassigned</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{stats.unassigned}</p>
        </div>
      </div>

      {/* Teachers List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Teachers</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Classes
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
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                      No teachers found. Add teachers from the Users page.
                    </td>
                  </tr>
                ) : (
                  teachers.map(({ teacher, assignedClassesCount }) => (
                    <tr key={teacher.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{teacher.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{teacher.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            assignedClassesCount > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {assignedClassesCount} {assignedClassesCount === 1 ? 'class' : 'classes'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {teacher.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/admin/users/${teacher.id}`}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View Profile
                        </Link>
                        {assignedClassesCount > 0 && (
                          <Link
                            href={`/admin/teachers/${teacher.id}/classes`}
                            className="text-green-600 hover:text-green-900"
                          >
                            View Classes ({assignedClassesCount})
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Assignment Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Quick Class Assignment</h3>
        <p className="text-sm text-blue-700 mb-4">
          To assign a teacher to a class, go to the{' '}
          <Link href="/admin/classes" className="underline font-medium">
            Classes page
          </Link>{' '}
          and edit the class to assign or change the teacher.
        </p>
        <p className="text-sm text-blue-700">
          You can also create new teachers from the{' '}
          <Link href="/admin/users/create" className="underline font-medium">
            Users page
          </Link>{' '}
          by setting their role to "teacher".
        </p>
      </div>
    </div>
  );
}
