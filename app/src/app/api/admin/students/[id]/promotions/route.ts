/**
 * Student Promotions API
 * GET/POST /api/admin/students/[id]/promotions
 *
 * Manages level promotion requests for a specific student
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { levelPromotions, summativeAssessments, competencyAssessments } from '@/db/schema/profile';
import { users, students, classes, enrollments } from '@/db/schema';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const createPromotionSchema = z.object({
  toLevel: z.string().regex(/^(A1|A2|B1|B1\+|B2|B2\+|C1|C2)$/),
  reason: z.string().min(10).max(1000),
  fromClassId: z.string().uuid().optional(),
  toClassId: z.string().uuid().optional(),
});

// ============================================================================
// Helper: Get Evidence Summary
// ============================================================================

async function getEvidenceSummary(studentId: string, tenantId: string) {
  // Get recent summative scores (last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const summativeScores = await db
    .select({
      id: summativeAssessments.id,
      scorePercentage: summativeAssessments.scorePercentage,
      assessmentDate: summativeAssessments.assessmentDate,
    })
    .from(summativeAssessments)
    .where(
      and(
        eq(summativeAssessments.studentId, studentId),
        eq(summativeAssessments.tenantId, tenantId),
        gte(summativeAssessments.assessmentDate, ninetyDaysAgo.toISOString().split('T')[0])
      )
    )
    .orderBy(desc(summativeAssessments.assessmentDate))
    .limit(10);

  // Get competency assessment stats
  const competencyStats = await db
    .select({
      total: sql<number>`count(*)`,
      achieved: sql<number>`count(*) filter (where ${competencyAssessments.progress} = 'achieved')`,
      developing: sql<number>`count(*) filter (where ${competencyAssessments.progress} = 'developing')`,
      emerging: sql<number>`count(*) filter (where ${competencyAssessments.progress} = 'emerging')`,
    })
    .from(competencyAssessments)
    .where(
      and(
        eq(competencyAssessments.studentId, studentId),
        eq(competencyAssessments.tenantId, tenantId),
        gte(competencyAssessments.assessmentDate, ninetyDaysAgo.toISOString().split('T')[0])
      )
    );

  // Calculate average summative score
  const avgSummative =
    summativeScores.length > 0
      ? summativeScores.reduce((sum, s) => sum + parseFloat(s.scorePercentage || '0'), 0) /
        summativeScores.length
      : null;

  // Calculate competency progress rate
  const stats = competencyStats[0] || { total: 0, achieved: 0, developing: 0, emerging: 0 };
  const competencyRate =
    stats.total > 0
      ? Math.round(((stats.achieved + stats.developing * 0.5) / stats.total) * 100)
      : null;

  return {
    summativeScores: summativeScores.map(s => ({
      ...s,
      scorePercentage: parseFloat(s.scorePercentage || '0'),
    })),
    avgSummativeScore: avgSummative ? Math.round(avgSummative * 100) / 100 : null,
    competencyStats: {
      total: Number(stats.total),
      achieved: Number(stats.achieved),
      developing: Number(stats.developing),
      emerging: Number(stats.emerging),
    },
    competencyRate,
    meetsThreshold: avgSummative !== null && avgSummative >= 80,
    strongCandidate: avgSummative !== null && avgSummative >= 90,
  };
}

// ============================================================================
// GET - List promotions for student
// ============================================================================

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const { id: studentId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get promotions with recommender and reviewer info
    const promotions = await db
      .select({
        id: levelPromotions.id,
        fromLevel: levelPromotions.fromLevel,
        toLevel: levelPromotions.toLevel,
        status: levelPromotions.status,
        recommendedAt: levelPromotions.recommendedAt,
        recommendationReason: levelPromotions.recommendationReason,
        evidenceSummary: levelPromotions.evidenceSummary,
        reviewedAt: levelPromotions.reviewedAt,
        reviewNotes: levelPromotions.reviewNotes,
        appliedAt: levelPromotions.appliedAt,
        recommenderName: users.name,
      })
      .from(levelPromotions)
      .leftJoin(users, eq(levelPromotions.recommendedBy, users.id))
      .where(and(eq(levelPromotions.studentId, studentId), eq(levelPromotions.tenantId, tenantId)))
      .orderBy(desc(levelPromotions.recommendedAt));

    // Get evidence summary for potential new promotion
    const evidence = await getEvidenceSummary(studentId, tenantId);

    // Check if there's a pending promotion
    const hasPending = promotions.some(p => p.status === 'pending');

    return NextResponse.json({
      promotions,
      evidence,
      hasPendingPromotion: hasPending,
    });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
  }
}

// ============================================================================
// POST - Create new promotion request
// ============================================================================

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const { id: studentId } = await params;

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'No tenant or user context' }, { status: 403 });
    }

    // Parse and validate body
    const body = await request.json();
    const parseResult = createPromotionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { toLevel, reason, fromClassId, toClassId } = parseResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get current student level
    const [student] = await db
      .select({
        id: students.id,
        userId: students.userId,
      })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.tenantId, tenantId)))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get current enrollment to find current level
    const [currentEnrollment] = await db
      .select({
        id: enrollments.id,
        classId: enrollments.classId,
        className: classes.name,
        level: classes.level,
      })
      .from(enrollments)
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.status, 'active'),
          eq(enrollments.tenantId, tenantId)
        )
      )
      .orderBy(desc(enrollments.enrollmentDate))
      .limit(1);

    const fromLevel = currentEnrollment?.level || 'A1';

    if (fromLevel === toLevel) {
      return NextResponse.json(
        { error: 'Target level must be different from current level' },
        { status: 400 }
      );
    }

    // Check for existing pending promotion
    const [existingPending] = await db
      .select({ id: levelPromotions.id })
      .from(levelPromotions)
      .where(
        and(
          eq(levelPromotions.studentId, studentId),
          eq(levelPromotions.tenantId, tenantId),
          eq(levelPromotions.status, 'pending')
        )
      )
      .limit(1);

    if (existingPending) {
      return NextResponse.json(
        { error: 'Student already has a pending promotion request' },
        { status: 400 }
      );
    }

    // Get evidence summary
    const evidence = await getEvidenceSummary(studentId, tenantId);

    // Create promotion request
    const [newPromotion] = await db
      .insert(levelPromotions)
      .values({
        tenantId,
        studentId,
        fromLevel,
        toLevel,
        recommendedBy: userId,
        recommendationReason: reason,
        evidenceSummary: evidence,
        status: 'pending',
        fromClassId: fromClassId || currentEnrollment?.classId || null,
        toClassId: toClassId || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      promotion: newPromotion,
    });
  } catch (error) {
    console.error('Error creating promotion:', error);
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 });
  }
}
