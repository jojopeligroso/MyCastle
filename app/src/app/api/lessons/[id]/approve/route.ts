/**
 * DoS Approve/Reject API
 * POST /api/lessons/[id]/approve
 * Allows Director of Studies to approve or reject a lesson plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { lessonPlans } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const approvalSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comments: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Only DoS or admin can approve
    const user = await requireAuth(['dos', 'admin', 'super_admin']);
    const tenantId = await getTenantId();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Lesson plan ID is required' }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { decision, comments } = approvalSchema.parse(body);

    // Find the lesson plan
    const [plan] = await db
      .select()
      .from(lessonPlans)
      .where(and(eq(lessonPlans.id, id), tenantId ? eq(lessonPlans.tenantId, tenantId) : undefined))
      .limit(1);

    if (!plan) {
      return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 });
    }

    // Check if pending approval
    if (plan.approvalStatus !== 'pending_approval') {
      return NextResponse.json({ error: 'Lesson plan is not pending approval' }, { status: 400 });
    }

    // Update the lesson plan
    const [updatedPlan] = await db
      .update(lessonPlans)
      .set({
        approvalStatus: decision,
        approvedBy: user.id,
        approvedAt: new Date(),
        approvalComments: comments || null,
        updatedAt: new Date(),
      })
      .where(eq(lessonPlans.id, id))
      .returning();

    console.log(`Lesson plan ${id} ${decision} by DoS ${user.id}`);

    // TODO: Send notification to teacher
    // This would integrate with the notification system

    return NextResponse.json({
      success: true,
      data: {
        id: updatedPlan.id,
        approvalStatus: updatedPlan.approvalStatus,
        approvedBy: updatedPlan.approvedBy,
        approvedAt: updatedPlan.approvedAt,
        approvalComments: updatedPlan.approvalComments,
      },
    });
  } catch (error) {
    console.error('Error processing approval:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 });
  }
}
