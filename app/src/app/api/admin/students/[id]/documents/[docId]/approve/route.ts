/**
 * Document Approval API
 * POST /api/admin/students/[id]/documents/[docId]/approve
 * POST /api/admin/students/[id]/documents/[docId]/reject
 *
 * Approve or reject student-uploaded documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studentDocuments } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';

// ============================================================================
// POST - Approve pending document
// ============================================================================

export async function POST(
  _request: NextRequest,
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

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify document exists and is pending
    const document = await db.query.studentDocuments.findFirst({
      where: (docs, { and, eq }) =>
        and(eq(docs.id, docId), eq(docs.studentId, studentId), eq(docs.tenantId, tenantId)),
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

    // Approve document
    const [approved] = await db
      .update(studentDocuments)
      .set({
        approvalStatus: 'approved',
        reviewedBy: userId,
        reviewedAt: new Date(),
        rejectionReason: null, // Clear any previous rejection reason
      })
      .where(and(eq(studentDocuments.id, docId), eq(studentDocuments.tenantId, tenantId)))
      .returning();

    // TODO: Create audit log entry
    // TODO: Send notification to student (document approved)

    return NextResponse.json({
      document: approved,
      message: 'Document approved successfully',
    });
  } catch (error) {
    console.error('Error approving document:', error);
    return NextResponse.json({ error: 'Failed to approve document' }, { status: 500 });
  }
}
