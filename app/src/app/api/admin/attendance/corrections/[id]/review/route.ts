import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendanceCorrections, attendance, auditLogs } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNotes: z.string().optional(),
});

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/admin/attendance/corrections/[id]/review
 * Approve or reject a correction request
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const validation = reviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { action, reviewNotes } = validation.data;

    // Fetch the correction request
    const correction = await db.query.attendanceCorrections.findFirst({
      where: and(eq(attendanceCorrections.id, id), eq(attendanceCorrections.tenantId, tenantId)),
    });

    if (!correction) {
      return NextResponse.json({ error: 'Correction request not found' }, { status: 404 });
    }

    if (correction.status !== 'pending') {
      return NextResponse.json(
        { error: `Correction already ${correction.status}` },
        { status: 400 }
      );
    }

    // Start transaction logic
    if (action === 'approve') {
      // Update the attendance record with corrected values
      await db
        .update(attendance)
        .set({
          status: correction.correctedStatus,
          notes: correction.correctedNotes,
          editedAt: new Date(),
          editedBy: user.id,
          editCount: sql`edit_count + 1`,
          updatedAt: new Date(),
        })
        .where(eq(attendance.id, correction.attendanceId));

      // Create audit log entry
      await db.insert(auditLogs).values({
        tenant_id: tenantId,
        user_id: user.id,
        action: 'CORRECTION_APPLIED',
        resource_type: 'attendance',
        resource_id: correction.attendanceId,
        changes: {
          correctionId: correction.id,
          originalStatus: correction.originalStatus,
          correctedStatus: correction.correctedStatus,
          originalNotes: correction.originalNotes,
          correctedNotes: correction.correctedNotes,
          reason: correction.reason,
          reviewedBy: user.id,
        },
      });
    }

    // Update correction status
    await db
      .update(attendanceCorrections)
      .set({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes,
        updatedAt: new Date(),
      })
      .where(eq(attendanceCorrections.id, id));

    return NextResponse.json({
      success: true,
      action,
      message: `Correction ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('Error reviewing correction:', error);
    return NextResponse.json({ error: 'Failed to review correction' }, { status: 500 });
  }
}
