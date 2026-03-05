/**
 * Document Rejection API
 * POST /api/admin/students/[id]/documents/[docId]/reject
 *
 * Reject student-uploaded document with reason
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studentDocuments } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Validation Schema
// ============================================================================

const rejectDocumentSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(500),
});

// ============================================================================
// POST - Reject pending document
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const { id: studentId, docId } = await params;

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'No auth context' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = rejectDocumentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { reason } = validationResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify document exists and is pending
    const document = await db.query.studentDocuments.findFirst({
      where: (docs, { and, eq }) =>
        and(
          eq(docs.id, docId),
          eq(docs.studentId, studentId),
          eq(docs.tenantId, tenantId)
        ),
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.approvalStatus !== 'pending') {
      return NextResponse.json(
        { error: `Document is already ${document.approvalStatus}` },
        { status: 400 }
      );
    }

    // Reject document
    const [rejected] = await db
      .update(studentDocuments)
      .set({
        approvalStatus: 'rejected',
        reviewedBy: userId,
        reviewedAt: new Date(),
        rejectionReason: reason,
        isCurrent: false,  // Rejected documents are marked as not current
      })
      .where(
        and(
          eq(studentDocuments.id, docId),
          eq(studentDocuments.tenantId, tenantId)
        )
      )
      .returning();

    // TODO: Create audit log entry
    // TODO: Send notification to student (document rejected with reason)
    // TODO: Delete file from Supabase Storage? (optional - could keep for audit)

    return NextResponse.json({
      document: rejected,
      message: 'Document rejected',
    });
  } catch (error) {
    console.error('Error rejecting document:', error);
    return NextResponse.json(
      { error: 'Failed to reject document' },
      { status: 500 }
    );
  }
}
