/**
 * Class Management Page - List and manage all classes
 */

import { db } from '@/db';
import { classes, users, enrollments } from '@/db/schema';
import { eq, and, count, desc } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import Link from 'next/link';
import { ClassList } from '@/components/admin/ClassList';

async function getClasses(tenantId: string) {
  const allClasses = await db
    .select({
      class: classes,
      teacher: users,
      enrollmentCount: count(enrollments.id),
    })
    .from(classes)
    .leftJoin(users, eq(classes.teacher_id, users.id))
    .leftJoin(enrollments, and(
      eq(enrollments.class_id, classes.id),
      eq(enrollments.status, 'active')
    ))
    .where(eq(classes.tenant_id, tenantId))
    .groupBy(classes.id, users.id)
    .orderBy(desc(classes.created_at));

  return allClasses;
}

async function getTeachers(tenantId: string) {
  const teachers = await db
    .select()
    .from(users)
    .where(and(
      eq(users.tenant_id, tenantId),
      eq(users.role, 'teacher'),
      eq(users.status, 'active')
    ))
    .orderBy(users.name);

  return teachers;
}

export default async function ClassesPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load classes. Please contact support.</p>
      </div>
    );
  }

  const classData = await getClasses(tenantId);
  const teachers = await getTeachers(tenantId);

  const stats = {
    total: classData.length,
    active: classData.filter(c => c.class.status === 'active').length,
    completed: classData.filter(c => c.class.status === 'completed').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Class Management</h1>
          <p className="mt-2 text-gray-600">Schedule and manage classes</p>
        </div>
        <Link
          href="/admin/classes/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Schedule New Class
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Classes</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Active Classes</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Completed Classes</p>
          <p className="text-3xl font-bold text-gray-600 mt-2">{stats.completed}</p>
        </div>
      </div>

      {/* Class List */}
      <ClassList classes={classData} teachers={teachers} />
    </div>
  );
}
