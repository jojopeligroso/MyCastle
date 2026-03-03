/**
 * Promotion Review API
 * PUT /api/admin/promotions/[id]/review
 *
 * DoS approves or rejects promotion requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { levelPromotions } from '@/db/schema/profile';
import { enrollments, users, students } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(1000).optional(),
  toClassId: z.string().uuid().optional(),
});

// ============================================================================
// PUT - Review promotion (approve/reject)
// ============================================================================

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Only admin and DoS can review promotions
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const { id: promotionId } = await params;

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'No tenant or user context' }, { status: 403 });
    }

    // Parse and validate body
    const body = await request.json();
    const parseResult = reviewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { action, notes, toClassId } = parseResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get promotion
    const [promotion] = await db
      .select()
      .from(levelPromotions)
      .where(and(eq(levelPromotions.id, promotionId), eq(levelPromotions.tenantId, tenantId)))
      .limit(1);

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    if (promotion.status !== 'pending') {
      return NextResponse.json({ error: 'Promotion has already been reviewed' }, { status: 400 });
    }

    const now = new Date();

    if (action === 'reject') {
      // Reject promotion
      const [updatedPromotion] = await db
        .update(levelPromotions)
        .set({
          status: 'rejected',
          reviewedBy: userId,
          reviewedAt: now,
          reviewNotes: notes || null,
          updatedAt: now,
        })
        .where(eq(levelPromotions.id, promotionId))
        .returning();

      return NextResponse.json({
        success: true,
        promotion: updatedPromotion,
      });
    }

    // Approve promotion
    // Update promotion record
    const [updatedPromotion] = await db
      .update(levelPromotions)
      .set({
        status: 'approved',
        reviewedBy: userId,
        reviewedAt: now,
        reviewNotes: notes || null,
        appliedAt: now,
        toClassId: toClassId || promotion.toClassId,
        updatedAt: now,
      })
      .where(eq(levelPromotions.id, promotionId))
      .returning();

    // Get the student record to find the user ID
    const [student] = await db
      .select({ userId: students.userId })
      .from(students)
      .where(eq(students.id, promotion.studentId))
      .limit(1);

    // Update the student's current level in the users table
    if (student?.userId) {
      await db
        .update(users)
        .set({
          currentLevel: promotion.toLevel,
          levelStatus: 'confirmed',
          updatedAt: now,
        })
        .where(eq(users.id, student.userId));
    }

    // If a target class is specified, handle enrollment transfer
    const targetClassId = toClassId || promotion.toClassId;

    if (targetClassId && promotion.fromClassId) {
      // End current enrollment
      await db
        .update(enrollments)
        .set({
          status: 'completed',
          completionDate: now.toISOString().split('T')[0],
        })
        .where(
          and(
            eq(enrollments.studentId, promotion.studentId),
            eq(enrollments.classId, promotion.fromClassId),
            eq(enrollments.status, 'active')
          )
        );

      // Create new enrollment in target class
      await db.insert(enrollments).values({
        tenantId,
        studentId: promotion.studentId,
        classId: targetClassId,
        enrollmentDate: now.toISOString().split('T')[0],
        status: 'active',
      });
    }

    return NextResponse.json({
      success: true,
      promotion: updatedPromotion,
      message: `Promotion approved. Student level updated to ${promotion.toLevel}.`,
    });
  } catch (error) {
    console.error('Error reviewing promotion:', error);
    return NextResponse.json({ error: 'Failed to review promotion' }, { status: 500 });
  }
}
