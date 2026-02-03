/**
 * User Detail Page - View individual user details
 */

import { db } from '@/db';
import { users, enrollments, classes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';

async function getUser(userId: string, tenantId: string) {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
    .limit(1);

  return result[0] || null;
}

async function getUserEnrollments(userId: string) {
  const userEnrollments = await db
    .select({
      enrollment: enrollments,
      class: classes,
    })
    .from(enrollments)
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(eq(enrollments.studentId, userId))
    .orderBy(enrollments.enrollmentDate);

  return userEnrollments;
}

async function getUserClasses(userId: string) {
  const userClasses = await db
    .select()
    .from(classes)
    .where(eq(classes.teacherId, userId))
    .orderBy(classes.startDate);

  return userClasses;
}

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const user = await getUser(params.id, tenantId);

  if (!user) {
    notFound();
  }

  // Fetch role-specific data
  const enrollments = user.primaryRole === 'student' ? await getUserEnrollments(params.id) : [];
  const teacherClasses = user.primaryRole === 'teacher' ? await getUserClasses(params.id) : [];

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      student: 'bg-blue-100 text-blue-800',
      teacher: 'bg-purple-100 text-purple-800',
      admin: 'bg-orange-100 text-orange-800',
      super_admin: 'bg-red-100 text-red-800',
    };

    if (role?.includes('admin')) {
      return styles.admin;
    }

    return styles[role as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/admin/users"
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            ← Back to Users
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
          <p className="mt-2 text-gray-600">{user.email}</p>
        </div>
        <Link
          href={`/admin/users/${user.id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Edit User
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Details</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="mt-1">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(user.primaryRole)}`}
                  >
                    {user.primaryRole?.replace('_', ' ')}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(user.status)}`}
                  >
                    {user.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {user.createdAt && new Date(user.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Login</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Role-specific sections */}
          {user.primaryRole === 'student' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Enrolled Classes ({enrollments.length})
              </h2>
              {enrollments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Not enrolled in any classes yet</p>
              ) : (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Class
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Enrolled
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {enrollments.map(({ enrollment, class: cls }) => (
                        <tr key={enrollment.id}>
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/classes/${cls.id}`}
                              className="text-sm font-medium text-purple-600 hover:text-purple-900"
                            >
                              {cls.name}
                            </Link>
                            <div className="text-sm text-gray-500">{cls.code}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{enrollment.status}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {enrollment.enrollmentDate &&
                              new Date(enrollment.enrollmentDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {user.primaryRole === 'teacher' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Assigned Classes ({teacherClasses.length})
              </h2>
              {teacherClasses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No classes assigned yet</p>
              ) : (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Class
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Schedule
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Enrollment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {teacherClasses.map(cls => (
                        <tr key={cls.id}>
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/classes/${cls.id}`}
                              className="text-sm font-medium text-purple-600 hover:text-purple-900"
                            >
                              {cls.name}
                            </Link>
                            <div className="text-sm text-gray-500">{cls.code}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {cls.scheduleDescription}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {cls.enrolledCount} / {cls.capacity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href={`/admin/users/${user.id}/edit`}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Edit Details
              </Link>
              {user.primaryRole === 'student' && (
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                  Enroll in Class
                </button>
              )}
              {user.primaryRole === 'teacher' && (
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                  Assign to Class
                </button>
              )}
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                Reset Password
              </button>
              {user.status === 'active' && (
                <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md">
                  Suspend User
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
