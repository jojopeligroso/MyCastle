/**
 * Approvals Queue API
 * GET /api/lessons/approvals
 * Returns lesson plans pending approval for DoS review
 */

import { NextResponse } from 'next/server';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { lessonPlans, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Only DoS or admin can view approval queue
    await requireAuth(['dos', 'admin', 'super_admin']);
    const tenantId = await getTenantId();

    // Fetch pending approvals with teacher info
    const pendingApprovals = await db
      .select({
        id: lessonPlans.id,
        title: lessonPlans.title,
        topic: lessonPlans.topic,
        cefrLevel: lessonPlans.cefrLevel,
        approvalStatus: lessonPlans.approvalStatus,
        submittedForApprovalAt: lessonPlans.submittedForApprovalAt,
        speakoutBook: lessonPlans.speakoutBook,
        speakoutUnit: lessonPlans.speakoutUnit,
        speakoutLesson: lessonPlans.speakoutLesson,
        teacherId: lessonPlans.teacherId,
        teacherName: users.name,
        teacherEmail: users.email,
        createdAt: lessonPlans.createdAt,
      })
      .from(lessonPlans)
      .leftJoin(users, eq(lessonPlans.teacherId, users.id))
      .where(
        and(
          eq(lessonPlans.approvalStatus, 'pending_approval'),
          tenantId ? eq(lessonPlans.tenantId, tenantId) : undefined
        )
      )
      .orderBy(desc(lessonPlans.submittedForApprovalAt));

    // Also fetch recently processed (approved/rejected in last 7 days)
    const recentlyProcessed = await db
      .select({
        id: lessonPlans.id,
        title: lessonPlans.title,
        topic: lessonPlans.topic,
        cefrLevel: lessonPlans.cefrLevel,
        approvalStatus: lessonPlans.approvalStatus,
        approvedAt: lessonPlans.approvedAt,
        approvalComments: lessonPlans.approvalComments,
        teacherId: lessonPlans.teacherId,
        teacherName: users.name,
      })
      .from(lessonPlans)
      .leftJoin(users, eq(lessonPlans.teacherId, users.id))
      .where(
        and(
          tenantId ? eq(lessonPlans.tenantId, tenantId) : undefined
          // In a real implementation, add date filter for last 7 days
        )
      )
      .orderBy(desc(lessonPlans.approvedAt))
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingApprovals,
        recentlyProcessed: recentlyProcessed.filter(
          p => p.approvalStatus === 'approved' || p.approvalStatus === 'rejected'
        ),
        stats: {
          pendingCount: pendingApprovals.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching approvals:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}
