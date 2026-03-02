/**
 * Request DoS Approval API
 * POST /api/lessons/[id]/request-approval
 * Submits a lesson plan for Director of Studies approval
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { lessonPlans } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['teacher', 'admin']);
    const tenantId = await getTenantId();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Lesson plan ID is required' },
        { status: 400 }
      );
    }

    // Find the lesson plan
    const [plan] = await db
      .select()
      .from(lessonPlans)
      .where(
        and(
          eq(lessonPlans.id, id),
          tenantId ? eq(lessonPlans.tenantId, tenantId) : undefined
        )
      )
      .limit(1);

    if (!plan) {
      return NextResponse.json(
        { error: 'Lesson plan not found' },
        { status: 404 }
      );
    }

    // Check if already pending or approved
    if (plan.approvalStatus === 'pending_approval') {
      return NextResponse.json(
        { error: 'Lesson plan is already pending approval' },
        { status: 400 }
      );
    }

    if (plan.approvalStatus === 'approved') {
      return NextResponse.json(
        { error: 'Lesson plan is already approved' },
        { status: 400 }
      );
    }

    // Parse request body for optional notes
    let notes: string | undefined;
    try {
      const body = await request.json();
      notes = body.notes;
    } catch {
      // No body or invalid JSON, that's fine
    }

    // Update the lesson plan status
    const [updatedPlan] = await db
      .update(lessonPlans)
      .set({
        approvalStatus: 'pending_approval',
        submittedForApprovalAt: new Date(),
        generationPrompt: notes
          ? `${plan.generationPrompt || ''}\n\nTeacher Notes: ${notes}`
          : plan.generationPrompt,
        updatedAt: new Date(),
      })
      .where(eq(lessonPlans.id, id))
      .returning();

    console.log(
      `Lesson plan ${id} submitted for approval by ${user.id}`
    );

    // TODO: Send notification to DoS users
    // This would integrate with the notification system

    return NextResponse.json({
      success: true,
      data: {
        id: updatedPlan.id,
        approvalStatus: updatedPlan.approvalStatus,
        submittedForApprovalAt: updatedPlan.submittedForApprovalAt,
      },
    });
  } catch (error) {
    console.error('Error requesting approval:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to submit for approval' },
      { status: 500 }
    );
  }
}
