/**
 * Enrolments List Page - View and manage student enrolments
 * MCP Resource: admin://enrolments
 */

import { Suspense } from 'react';
import { db } from '@/db';
import { enrollments, classes, users } from '@/db/schema';
import { eq, and, desc, asc, or, like, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, setRLSContext } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { EnrollmentList } from '@/components/admin/EnrollmentList';

interface EnrollmentFilters {
  studentId?: string;
  classId?: string;
  status?: string;
  search?: string;
  sortBy?: 'enrollmentDate' | 'studentName';
  sortOrder?: 'asc' | 'desc';
}

async function getEnrolments(tenantId: string, filters: EnrollmentFilters = {}) {
  const {
    studentId,
    classId,
    status,
    search,
    sortBy = 'enrollmentDate',
    sortOrder = 'desc',
  } = filters;

  // Set RLS context (super admin gets access to all tenants)
  await setRLSContext(db);

  // Build WHERE conditions
  const conditions = [eq(enrollments.tenantId, tenantId)];

  if (studentId) {
    conditions.push(eq(enrollments.studentId, studentId));
  }

  if (classId) {
    conditions.push(eq(enrollments.classId, classId));
  }

  if (status) {
    conditions.push(eq(enrollments.status, status));
  }

  if (search) {
    conditions.push(
      or(
        like(users.name, `%${search}%`),
        like(classes.name, `%${search}%`),
        like(classes.code, `%${search}%`)
      )!
    );
  }

  // Build ORDER BY
  let orderByClause;
  if (sortBy === 'studentName') {
    orderByClause = sortOrder === 'asc' ? asc(users.name) : desc(users.name);
  } else {
    orderByClause =
      sortOrder === 'asc' ? asc(enrollments.enrollmentDate) : desc(enrollments.enrollmentDate);
  }

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
    .leftJoin(users, eq(enrollments.studentId, users.id))
    .leftJoin(classes, eq(enrollments.classId, classes.id))
    .where(and(...conditions))
    .orderBy(orderByClause);

  return allEnrolments;
}

async function getEnrolmentStats(tenantId: string) {
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const allEnrolments = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.tenantId, tenantId));

  const totalEnrolments = allEnrolments.length;
  const activeEnrolments = allEnrolments.filter(e => e.status === 'active').length;
  const completedEnrolments = allEnrolments.filter(e => e.status === 'completed').length;
  const droppedEnrolments = allEnrolments.filter(e => e.status === 'dropped').length;

  // Calculate average attendance rate
  const attendanceRates = allEnrolments
    .map(e => parseFloat(e.attendanceRate || '0'))
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

async function getStudentsForFilter(tenantId: string) {
  try {
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    const students = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.primaryRole, 'student'),
          eq(users.status, 'active')
        )
      )
      .orderBy(users.name);

    return students;
  } catch (error) {
    console.error('Failed to fetch students:', error);
    return [];
  }
}

async function getClassesForFilter(tenantId: string) {
  try {
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    const classList = await db
      .select({
        id: classes.id,
        name: classes.name,
        code: classes.code,
      })
      .from(classes)
      .where(eq(classes.tenantId, tenantId))
      .orderBy(classes.name);

    return classList;
  } catch (error) {
    console.error('Failed to fetch classes:', error);
    return [];
  }
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
      <div className="h-96 bg-gray-200 rounded-lg"></div>
    </div>
  );
}

export default async function EnrolmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  // Parse search params
  const params = await searchParams;
  const filters: EnrollmentFilters = {
    studentId: typeof params.studentId === 'string' ? params.studentId : undefined,
    classId: typeof params.classId === 'string' ? params.classId : undefined,
    status: typeof params.status === 'string' ? params.status : undefined,
    search: typeof params.search === 'string' ? params.search : undefined,
    sortBy:
      params.sortBy === 'studentName' || params.sortBy === 'enrollmentDate'
        ? params.sortBy
        : 'enrollmentDate',
    sortOrder:
      params.sortOrder === 'asc' || params.sortOrder === 'desc' ? params.sortOrder : 'desc',
  };

  const enrolments = await getEnrolments(tenantId, filters);
  const stats = await getEnrolmentStats(tenantId);
  const students = await getStudentsForFilter(tenantId);
  const classList = await getClassesForFilter(tenantId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enrollment Management</h1>
          <p className="mt-2 text-gray-600">Track student enrollments and progression</p>
        </div>
        <Link
          href="/admin/enrolments/enroll"
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
          Enroll Student
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <StatCard label="Total Enrolments" value={stats.totalEnrolments} icon="📋" color="blue" />
        <StatCard label="Active" value={stats.activeEnrolments} icon="✅" color="green" />
        <StatCard label="Completed" value={stats.completedEnrolments} icon="🎓" color="purple" />
        <StatCard label="Dropped" value={stats.droppedEnrolments} icon="⚠️" color="red" />
        <StatCard
          label="Avg Attendance"
          value={`${stats.avgAttendance}%`}
          icon="📊"
          color="purple"
        />
      </div>

      {/* Enrollment List */}
      <Suspense fallback={<LoadingSkeleton />}>
        <EnrollmentList
          enrollments={enrolments}
          students={students}
          classes={classList}
          filters={filters}
        />
      </Suspense>
    </div>
  );
}

// Make this page dynamic to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;
