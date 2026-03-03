/**
 * DoS Dashboard Page
 * Central hub for Director of Studies with promotion overview
 */

import { db } from '@/db';
import { users, students, classes, enrollments } from '@/db/schema';
import { levelPromotions, summativeAssessments, competencyProgress } from '@/db/schema/profile';
import { eq, and, sql, desc, count, avg, gte } from 'drizzle-orm';
import { requireAuth, getTenantId, getCurrentUser } from '@/lib/auth/utils';
import { alias } from 'drizzle-orm/pg-core';
import Link from 'next/link';

interface PendingPromotion {
  id: string;
  studentId: string;
  studentName: string | null;
  fromLevel: string;
  toLevel: string;
  recommendedAt: Date;
  recommenderName: string | null;
  summativeAvg: number | null;
}

interface LevelStats {
  level: string;
  count: number;
  pendingPromotions: number;
}

async function getDashboardData(tenantId: string) {
  // Set RLS context
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  // Get user aliases
  const recommender = alias(users, 'recommender');
  const studentUser = alias(users, 'student_user');

  // Get counts
  const [totalStudents] = await db
    .select({ count: count() })
    .from(users)
    .where(and(eq(users.role, 'student'), eq(users.tenantId, tenantId)));

  const [activeStudents] = await db
    .select({ count: count() })
    .from(users)
    .where(and(eq(users.role, 'student'), eq(users.tenantId, tenantId), eq(users.isActive, true)));

  const [pendingCount] = await db
    .select({ count: count() })
    .from(levelPromotions)
    .where(and(eq(levelPromotions.tenantId, tenantId), eq(levelPromotions.status, 'pending')));

  const [approvedThisMonth] = await db
    .select({ count: count() })
    .from(levelPromotions)
    .where(
      and(
        eq(levelPromotions.tenantId, tenantId),
        eq(levelPromotions.status, 'approved'),
        gte(
          levelPromotions.reviewedAt,
          new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        )
      )
    );

  // Get pending promotions with details (top 5)
  const pendingPromotions = await db
    .select({
      id: levelPromotions.id,
      studentId: levelPromotions.studentId,
      studentName: studentUser.name,
      fromLevel: levelPromotions.fromLevel,
      toLevel: levelPromotions.toLevel,
      recommendedAt: levelPromotions.recommendedAt,
      recommenderName: recommender.name,
    })
    .from(levelPromotions)
    .leftJoin(recommender, eq(levelPromotions.recommendedBy, recommender.id))
    .leftJoin(students, eq(levelPromotions.studentId, students.id))
    .leftJoin(studentUser, eq(students.userId, studentUser.id))
    .where(and(eq(levelPromotions.tenantId, tenantId), eq(levelPromotions.status, 'pending')))
    .orderBy(desc(levelPromotions.recommendedAt))
    .limit(5);

  // Get summative averages for pending students
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const pendingStudentIds = pendingPromotions.map(p => p.studentId);
  const summativeAverages: Record<string, number> = {};

  if (pendingStudentIds.length > 0) {
    for (const studentId of pendingStudentIds) {
      const [result] = await db
        .select({
          avgScore: avg(summativeAssessments.scorePercentage),
        })
        .from(summativeAssessments)
        .where(
          and(
            eq(summativeAssessments.studentId, studentId),
            eq(summativeAssessments.tenantId, tenantId),
            gte(summativeAssessments.assessmentDate, ninetyDaysAgo.toISOString().split('T')[0])
          )
        );

      if (result?.avgScore) {
        summativeAverages[studentId] = Math.round(parseFloat(String(result.avgScore)) * 100) / 100;
      }
    }
  }

  const pendingWithScores: PendingPromotion[] = pendingPromotions.map(p => ({
    ...p,
    summativeAvg: summativeAverages[p.studentId] || null,
  }));

  // Get students by level
  const studentsByLevel = await db
    .select({
      level: users.currentLevel,
      count: sql<number>`count(*)::int`,
    })
    .from(users)
    .where(and(eq(users.role, 'student'), eq(users.tenantId, tenantId), eq(users.isActive, true)))
    .groupBy(users.currentLevel)
    .orderBy(users.currentLevel);

  // Get pending promotions by level
  const promotionsByLevel = await db
    .select({
      level: levelPromotions.fromLevel,
      count: sql<number>`count(*)::int`,
    })
    .from(levelPromotions)
    .where(and(eq(levelPromotions.tenantId, tenantId), eq(levelPromotions.status, 'pending')))
    .groupBy(levelPromotions.fromLevel);

  const promotionsByLevelMap = new Map(promotionsByLevel.map(p => [p.level, p.count]));

  const levelStats: LevelStats[] = studentsByLevel.map(s => ({
    level: s.level || 'Unknown',
    count: s.count,
    pendingPromotions: promotionsByLevelMap.get(s.level || '') || 0,
  }));

  return {
    counts: {
      totalStudents: totalStudents.count,
      activeStudents: activeStudents.count,
      pendingPromotions: pendingCount.count,
      approvedThisMonth: approvedThisMonth.count,
    },
    pendingPromotions: pendingWithScores,
    levelStats,
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

export default async function DoSDashboardPage() {
  const user = await requireAuth(['admin', 'dos', 'assistant_dos']);
  const tenantId = await getTenantId();

  if (!tenantId) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Unable to load dashboard. Please try again.</p>
      </div>
    );
  }

  const data = await getDashboardData(tenantId);
  const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Director';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s an overview of student progress and pending promotions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{data.counts.totalStudents}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-600"
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
            </div>
          </div>
          <Link
            href="/dos/students"
            className="mt-4 text-sm text-purple-600 hover:text-purple-700 flex items-center"
          >
            View all students
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Students</p>
              <p className="text-3xl font-bold text-green-600">{data.counts.activeStudents}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            {Math.round((data.counts.activeStudents / (data.counts.totalStudents || 1)) * 100)}% of
            total
          </p>
        </div>

        <div className="bg-white rounded-lg border border-amber-200 p-6 bg-amber-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700">Pending Promotions</p>
              <p className="text-3xl font-bold text-amber-600">{data.counts.pendingPromotions}</p>
            </div>
            <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <Link
            href="/admin/promotions"
            className="mt-4 text-sm text-amber-700 hover:text-amber-800 flex items-center font-medium"
          >
            Review now
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Approved This Month</p>
              <p className="text-3xl font-bold text-blue-600">{data.counts.approvedThisMonth}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">Level progressions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Promotions */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pending Promotions</h2>
            <Link
              href="/admin/promotions"
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              View all
            </Link>
          </div>

          {data.pendingPromotions.length === 0 ? (
            <div className="p-8 text-center">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No pending promotions</p>
              <p className="text-xs text-gray-400">All caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {data.pendingPromotions.map(promotion => (
                <div key={promotion.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/dos/students/${promotion.studentId}`}
                        className="text-sm font-medium text-gray-900 hover:text-purple-600"
                      >
                        {promotion.studentName || 'Unknown Student'}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getLevelBadgeColor(promotion.fromLevel)}`}
                        >
                          {promotion.fromLevel}
                        </span>
                        <svg
                          className="w-3 h-3 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getLevelBadgeColor(promotion.toLevel)}`}
                        >
                          {promotion.toLevel}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {promotion.summativeAvg !== null
                          ? `${promotion.summativeAvg.toFixed(1)}%`
                          : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(promotion.recommendedAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Students by Level */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Students by Level</h2>
          </div>

          <div className="p-6">
            {data.levelStats.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No level data available</p>
            ) : (
              <div className="space-y-4">
                {data.levelStats.map(stat => (
                  <div key={stat.level}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{stat.level}</span>
                      <span className="text-gray-500">
                        {stat.count} students
                        {stat.pendingPromotions > 0 && (
                          <span className="ml-2 text-amber-600">
                            ({stat.pendingPromotions} pending)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, (stat.count / (data.counts.activeStudents || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/promotions"
            className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center mr-4">
              <svg
                className="w-5 h-5 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Review Promotions</p>
              <p className="text-sm text-gray-500">Approve or reject level changes</p>
            </div>
          </Link>

          <Link
            href="/dos/students?promotion=pending"
            className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Students with Pending</p>
              <p className="text-sm text-gray-500">View students awaiting promotion</p>
            </div>
          </Link>

          <Link
            href="/dos/students"
            className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Search Students</p>
              <p className="text-sm text-gray-500">Find any student by name or level</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
