/**
 * DoS Promotions Review Page
 * Lists pending promotions for review
 */

import { db } from '@/db';
import { levelPromotions, summativeAssessments } from '@/db/schema/profile';
import { users, students, classes } from '@/db/schema';
import { eq, and, sql, desc, gte, avg } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { alias } from 'drizzle-orm/pg-core';
import { PromotionReviewList } from '@/components/admin/promotions/PromotionReviewList';

interface EvidenceSummary {
  avgSummativeScore: number | null;
  competencyRate: number | null;
  competencyStats: {
    total: number;
    achieved: number;
    developing: number;
    emerging: number;
  };
  meetsThreshold: boolean;
  strongCandidate: boolean;
}


async function getPromotions(tenantId: string, status: string = 'pending') {
  // Set RLS context
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  // Create aliases for users table to join multiple times
  const recommender = alias(users, 'recommender');
  const reviewer = alias(users, 'reviewer');
  const studentUser = alias(users, 'student_user');

  // Get promotions with related data
  const promotions = await db
    .select({
      id: levelPromotions.id,
      studentId: levelPromotions.studentId,
      studentName: studentUser.name,
      fromLevel: levelPromotions.fromLevel,
      toLevel: levelPromotions.toLevel,
      status: levelPromotions.status,
      recommendedAt: levelPromotions.recommendedAt,
      recommendationReason: levelPromotions.recommendationReason,
      evidenceSummary: levelPromotions.evidenceSummary,
      recommenderName: recommender.name,
      reviewedAt: levelPromotions.reviewedAt,
      reviewNotes: levelPromotions.reviewNotes,
      reviewerName: reviewer.name,
      fromClassName: classes.name,
    })
    .from(levelPromotions)
    .leftJoin(recommender, eq(levelPromotions.recommendedBy, recommender.id))
    .leftJoin(reviewer, eq(levelPromotions.reviewedBy, reviewer.id))
    .leftJoin(students, eq(levelPromotions.studentId, students.id))
    .leftJoin(studentUser, eq(students.userId, studentUser.id))
    .leftJoin(classes, eq(levelPromotions.fromClassId, classes.id))
    .where(
      and(
        eq(levelPromotions.tenantId, tenantId),
        status !== 'all' ? eq(levelPromotions.status, status) : undefined
      )
    )
    .orderBy(desc(levelPromotions.recommendedAt));

  // Get summative averages for pending promotions
  const pendingStudentIds = promotions.filter(p => p.status === 'pending').map(p => p.studentId);

  const summativeAverages: Record<string, number> = {};

  if (pendingStudentIds.length > 0) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

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

  return promotions.map(p => ({
    ...p,
    evidenceSummary: p.evidenceSummary as EvidenceSummary | null,
    currentSummativeAvg: summativeAverages[p.studentId] || null,
  }));
}

async function getPromotionCounts(tenantId: string) {
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const allPromotions = await db
    .select({ status: levelPromotions.status })
    .from(levelPromotions)
    .where(eq(levelPromotions.tenantId, tenantId));

  return {
    pending: allPromotions.filter(p => p.status === 'pending').length,
    approved: allPromotions.filter(p => p.status === 'approved').length,
    rejected: allPromotions.filter(p => p.status === 'rejected').length,
    total: allPromotions.length,
  };
}

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAuth(['admin', 'dos']);
  const tenantId = await getTenantId();
  const params = await searchParams;
  const statusFilter = params.status || 'pending';

  if (!tenantId) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Unable to load promotions. Please try again.</p>
      </div>
    );
  }

  const [promotions, counts] = await Promise.all([
    getPromotions(tenantId, statusFilter),
    getPromotionCounts(tenantId),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Level Promotions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and approve student level promotion requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600">{counts.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-600">{counts.approved}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{counts.rejected}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900">{counts.total}</p>
        </div>
      </div>

      {/* Promotions List */}
      <PromotionReviewList promotions={promotions} currentFilter={statusFilter} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
