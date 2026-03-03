/**
 * DoS Students List Page
 * Lists all students with promotion status and assessment overview
 */

import { db } from '@/db';
import { users, students, classes, enrollments } from '@/db/schema';
import { levelPromotions } from '@/db/schema/profile';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import Link from 'next/link';

interface StudentListItem {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  currentLevel: string | null;
  isActive: boolean;
  currentClassName: string | null;
  hasPendingPromotion: boolean;
  pendingToLevel: string | null;
}

async function getStudents(tenantId: string, filters: { level?: string; promotion?: string; search?: string }) {
  // Set RLS context
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  // Build conditions
  const conditions = [
    eq(users.role, 'student'),
    eq(users.tenantId, tenantId),
  ];

  if (filters.level) {
    conditions.push(eq(users.currentLevel, filters.level));
  }

  if (filters.search) {
    conditions.push(
      sql`(${users.name} ILIKE ${'%' + filters.search + '%'} OR ${users.email} ILIKE ${'%' + filters.search + '%'})`
    );
  }

  // Get students with enrollment and promotion data
  const studentsData = await db
    .select({
      id: students.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      currentLevel: users.currentLevel,
      isActive: users.isActive,
      currentClassName: classes.name,
    })
    .from(users)
    .leftJoin(students, eq(students.userId, users.id))
    .leftJoin(
      enrollments,
      and(eq(enrollments.studentId, students.id), eq(enrollments.status, 'active'))
    )
    .leftJoin(classes, eq(classes.id, enrollments.classId))
    .where(and(...conditions))
    .orderBy(desc(users.createdAt))
    .limit(100);

  // Get pending promotions
  const studentIds = studentsData.filter(s => s.id).map(s => s.id as string);

  const pendingPromotions = studentIds.length > 0
    ? await db
        .select({
          studentId: levelPromotions.studentId,
          toLevel: levelPromotions.toLevel,
        })
        .from(levelPromotions)
        .where(
          and(
            eq(levelPromotions.tenantId, tenantId),
            eq(levelPromotions.status, 'pending')
          )
        )
    : [];

  const promotionMap = new Map(
    pendingPromotions.map(p => [p.studentId, p.toLevel])
  );

  let result: StudentListItem[] = studentsData.map(s => ({
    id: s.id || s.userId,
    userId: s.userId,
    name: s.name,
    email: s.email,
    currentLevel: s.currentLevel,
    isActive: s.isActive,
    currentClassName: s.currentClassName,
    hasPendingPromotion: !!promotionMap.get(s.id || ''),
    pendingToLevel: promotionMap.get(s.id || '') || null,
  }));

  // Filter by promotion status
  if (filters.promotion === 'pending') {
    result = result.filter(s => s.hasPendingPromotion);
  } else if (filters.promotion === 'none') {
    result = result.filter(s => !s.hasPendingPromotion);
  }

  return result;
}

async function getCounts(tenantId: string) {
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const [totalStudents] = await db
    .select({ count: count() })
    .from(users)
    .where(and(eq(users.role, 'student'), eq(users.tenantId, tenantId)));

  const [activeStudents] = await db
    .select({ count: count() })
    .from(users)
    .where(and(eq(users.role, 'student'), eq(users.tenantId, tenantId), eq(users.isActive, true)));

  const [pendingPromotions] = await db
    .select({ count: count() })
    .from(levelPromotions)
    .where(and(eq(levelPromotions.tenantId, tenantId), eq(levelPromotions.status, 'pending')));

  return {
    total: totalStudents.count,
    active: activeStudents.count,
    pendingPromotions: pendingPromotions.count,
  };
}

function getLevelBadgeColor(level: string | null): string {
  if (!level) return 'bg-gray-100 text-gray-800';
  if (level.startsWith('C')) return 'bg-purple-100 text-purple-800';
  if (level.startsWith('B2')) return 'bg-blue-100 text-blue-800';
  if (level.startsWith('B1')) return 'bg-green-100 text-green-800';
  if (level.startsWith('A2')) return 'bg-yellow-100 text-yellow-800';
  if (level.startsWith('A1')) return 'bg-orange-100 text-orange-800';
  return 'bg-gray-100 text-gray-800';
}

export default async function DoSStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; promotion?: string; search?: string }>;
}) {
  await requireAuth(['admin', 'dos', 'assistant_dos']);
  const tenantId = await getTenantId();
  const params = await searchParams;

  if (!tenantId) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Unable to load students. Please try again.</p>
      </div>
    );
  }

  const [students, counts] = await Promise.all([
    getStudents(tenantId, params),
    getCounts(tenantId),
  ]);

  const levels = ['A1', 'A2', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage all students in your organization
          </p>
        </div>
        <Link
          href="/admin/promotions"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Review Promotions
          {counts.pendingPromotions > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-white text-purple-600 rounded-full">
              {counts.pendingPromotions}
            </span>
          )}
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Students</p>
          <p className="text-2xl font-bold text-gray-900">{counts.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active Students</p>
          <p className="text-2xl font-bold text-green-600">{counts.active}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Pending Promotions</p>
          <p className="text-2xl font-bold text-amber-600">{counts.pendingPromotions}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <form className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              name="search"
              defaultValue={params.search || ''}
              placeholder="Search by name or email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Level Filter */}
          <select
            name="level"
            defaultValue={params.level || ''}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Levels</option>
            {levels.map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>

          {/* Promotion Filter */}
          <select
            name="promotion"
            defaultValue={params.promotion || ''}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Students</option>
            <option value="pending">With Pending Promotion</option>
            <option value="none">No Pending Promotion</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            Apply Filters
          </button>

          {(params.search || params.level || params.promotion) && (
            <Link
              href="/dos/students"
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Students List */}
      {students.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {params.search || params.level || params.promotion
              ? 'Try adjusting your filters.'
              : 'No students in the system yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map(student => (
                <tr key={student.id} className={student.hasPendingPromotion ? 'bg-amber-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                        {student.name
                          ?.split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase() || '?'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {student.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getLevelBadgeColor(student.currentLevel)}`}
                      >
                        {student.currentLevel || 'N/A'}
                      </span>
                      {student.hasPendingPromotion && (
                        <>
                          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getLevelBadgeColor(student.pendingToLevel)}`}
                          >
                            {student.pendingToLevel}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.currentClassName || 'Not enrolled'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          student.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {student.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {student.hasPendingPromotion && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                          Promotion Pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/dos/students/${student.id}`}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      View Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';
