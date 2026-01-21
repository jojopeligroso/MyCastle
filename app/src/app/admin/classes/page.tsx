/**
 * Class Management Page - List and manage all classes
 */

import { db } from '@/db';
import { classes, users, enrollments } from '@/db/schema';
import { eq, and, count, desc, asc, like, or } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import Link from 'next/link';
import { ClassList } from '@/components/admin/ClassList';

interface ClassFilters {
  teacherId?: string;
  level?: string;
  status?: string;
  search?: string;
  sortBy?: 'name' | 'startDate';
  sortOrder?: 'asc' | 'desc';
}

async function getClasses(tenantId: string, filters: ClassFilters = {}) {
  const { teacherId, level, status, search, sortBy = 'startDate', sortOrder = 'desc' } = filters;

  // Build WHERE conditions
  const conditions = [eq(classes.tenantId, tenantId)];

  if (teacherId) {
    conditions.push(eq(classes.teacherId, teacherId));
  }

  if (level) {
    conditions.push(eq(classes.level, level));
  }

  if (status) {
    conditions.push(eq(classes.status, status));
  }

  if (search) {
    conditions.push(or(like(classes.name, `%${search}%`), like(classes.code, `%${search}%`))!);
  }

  // Build ORDER BY clause
  const orderByColumn = sortBy === 'name' ? classes.name : classes.startDate;
  const orderByDirection = sortOrder === 'asc' ? asc : desc;

  const allClasses = await db
    .select({
      class: {
        id: classes.id,
        code: classes.code,
        name: classes.name,
        level: classes.level,
        subject: classes.subject,
        capacity: classes.capacity,
        enrolledCount: classes.enrolledCount,
        status: classes.status,
        scheduleDescription: classes.scheduleDescription,
        startTime: classes.startTime,
        endTime: classes.endTime,
        breakDurationMinutes: classes.breakDurationMinutes,
        daysOfWeek: classes.daysOfWeek,
        startDate: classes.startDate,
        endDate: classes.endDate,
        teacherId: classes.teacherId,
        showCapacityPublicly: classes.showCapacityPublicly,
        createdAt: classes.createdAt,
      },
      teacher: users,
      enrollmentCount: count(enrollments.id),
    })
    .from(classes)
    .leftJoin(users, eq(classes.teacherId, users.id))
    .leftJoin(
      enrollments,
      and(eq(enrollments.classId, classes.id), eq(enrollments.status, 'active'))
    )
    .where(and(...conditions))
    .groupBy(classes.id, users.id)
    .orderBy(orderByDirection(orderByColumn));

  return allClasses;
}

async function getTeachers(tenantId: string) {
  const teachers = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.primaryRole, 'teacher'),
        eq(users.status, 'active')
      )
    )
    .orderBy(users.name);

  return teachers;
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load classes. Please contact support.</p>
      </div>
    );
  }

  // Parse search params
  const params = await searchParams;
  const filters: ClassFilters = {
    teacherId: typeof params.teacherId === 'string' ? params.teacherId : undefined,
    level: typeof params.level === 'string' ? params.level : undefined,
    status: typeof params.status === 'string' ? params.status : undefined,
    search: typeof params.search === 'string' ? params.search : undefined,
    sortBy: params.sortBy === 'name' || params.sortBy === 'startDate' ? params.sortBy : 'startDate',
    sortOrder:
      params.sortOrder === 'asc' || params.sortOrder === 'desc' ? params.sortOrder : 'desc',
  };

  const classData = await getClasses(tenantId, filters);
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
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
      <ClassList classes={classData} teachers={teachers} filters={filters} />
    </div>
  );
}
