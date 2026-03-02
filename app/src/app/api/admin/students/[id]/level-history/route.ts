import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { levelPromotions, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { alias } from 'drizzle-orm/pg-core';

/**
 * GET /api/admin/students/[id]/level-history
 * Fetch level change history for a student
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'teacher', 'dos']);
    const tenantId = await getTenantId();
    const { id: studentId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    // Verify student exists
    const [student] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Create aliases for self-joins
    const recommendedByUser = alias(users, 'recommendedByUser');
    const reviewedByUser = alias(users, 'reviewedByUser');

    // Fetch level promotions with user details
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
        // Recommender details
        recommendedById: levelPromotions.recommendedBy,
        recommendedByName: recommendedByUser.name,
        // Reviewer details
        reviewedById: levelPromotions.reviewedBy,
        reviewedByName: reviewedByUser.name,
      })
      .from(levelPromotions)
      .leftJoin(recommendedByUser, eq(levelPromotions.recommendedBy, recommendedByUser.id))
      .leftJoin(reviewedByUser, eq(levelPromotions.reviewedBy, reviewedByUser.id))
      .where(and(eq(levelPromotions.studentId, studentId), eq(levelPromotions.tenantId, tenantId)))
      .orderBy(desc(levelPromotions.recommendedAt));

    // Format response
    const formattedPromotions = promotions.map(p => ({
      id: p.id,
      fromLevel: p.fromLevel,
      toLevel: p.toLevel,
      changeType: 'promotion' as const, // Could expand to include diagnostic, manual_adjustment
      status: p.status,
      recommendedBy: p.recommendedById
        ? { name: p.recommendedByName || 'Unknown', role: 'teacher' }
        : null,
      reviewedBy: p.reviewedById ? { name: p.reviewedByName || 'Unknown', role: 'dos' } : null,
      reason: p.recommendationReason,
      reviewNotes: p.reviewNotes,
      recommendedAt: p.recommendedAt.toISOString(),
      reviewedAt: p.reviewedAt?.toISOString() || null,
      appliedAt: p.appliedAt?.toISOString() || null,
    }));

    return NextResponse.json({ promotions: formattedPromotions });
  } catch (error) {
    console.error('Error fetching level history:', error);
    return NextResponse.json({ error: 'Failed to fetch level history' }, { status: 500 });
  }
}
