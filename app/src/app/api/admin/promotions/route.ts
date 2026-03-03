/**
 * Promotions List API
 * GET /api/admin/promotions
 *
 * Lists all promotion requests (for DoS review dashboard)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { levelPromotions, summativeAssessments } from '@/db/schema/profile';
import { users, students, classes } from '@/db/schema';
import { eq, and, sql, desc, gte, avg } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { alias } from 'drizzle-orm/pg-core';

// ============================================================================
// GET - List all promotions
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Get filter from query params
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'pending';

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
        appliedAt: levelPromotions.appliedAt,
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
          statusFilter !== 'all' ? eq(levelPromotions.status, statusFilter) : undefined
        )
      )
      .orderBy(desc(levelPromotions.recommendedAt));

    // Get recent summative average for each student with pending promotion
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
          summativeAverages[studentId] =
            Math.round(parseFloat(String(result.avgScore)) * 100) / 100;
        }
      }
    }

    // Enhance promotions with current summative average
    const enhancedPromotions = promotions.map(p => ({
      ...p,
      currentSummativeAvg: summativeAverages[p.studentId] || null,
    }));

    // Count by status
    const counts = {
      pending: promotions.filter(p => p.status === 'pending').length,
      approved: promotions.filter(p => p.status === 'approved').length,
      rejected: promotions.filter(p => p.status === 'rejected').length,
      total: promotions.length,
    };

    return NextResponse.json({
      promotions: enhancedPromotions,
      counts,
    });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
  }
}
