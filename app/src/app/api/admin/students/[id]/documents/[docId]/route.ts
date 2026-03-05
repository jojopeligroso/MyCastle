/**
 * Individual Student Document API
 * GET/PATCH/DELETE /api/admin/students/[id]/documents/[docId]
 *
 * Operations on a specific document
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studentDocuments } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Validation Schemas
// ============================================================================

const updateDocumentSchema = z.object({
  documentDate: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
  isSharedWithStudent: z.boolean().optional(),
});

// ============================================================================
// GET - Get specific document metadata
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos', 'teacher']);
    const tenantId = await getTenantId();
    const { id: studentId, docId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get document
    const document = await db.query.studentDocuments.findFirst({
      where: (docs, { and, eq }) =>
        and(
          eq(docs.id, docId),
          eq(docs.studentId, studentId),
          eq(docs.tenantId, tenantId)
        ),
      with: {
        // TODO: Add relations when defined in schema/documents.ts
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}

// ============================================================================
// PATCH - Update document metadata (not the file itself)
// ============================================================================

export async function PATCH(
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
    const validationResult = updateDocumentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify document exists
    const existing = await db.query.studentDocuments.findFirst({
      where: (docs, { and, eq }) =>
        and(
          eq(docs.id, docId),
          eq(docs.studentId, studentId),
          eq(docs.tenantId, tenantId)
        ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Build update object
    const updateData: any = {};
    if (data.documentDate !== undefined) {
      updateData.documentDate = data.documentDate ? new Date(data.documentDate) : null;
    }
    if (data.expiryDate !== undefined) {
      updateData.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.isSharedWithStudent !== undefined) {
      updateData.isSharedWithStudent = data.isSharedWithStudent;
      if (data.isSharedWithStudent && !existing.isSharedWithStudent) {
        // Document is being shared for first time
        updateData.sharedBy = userId;
        updateData.sharedAt = new Date();
      }
    }

    // Update document
    const [updated] = await db
      .update(studentDocuments)
      .set(updateData)
      .where(
        and(
          eq(studentDocuments.id, docId),
          eq(studentDocuments.tenantId, tenantId)
        )
      )
      .returning();

    // TODO: Create audit log entry
    // TODO: If expiry date changed, re-check notification rules

    return NextResponse.json({
      document: updated,
      message: 'Document updated successfully',
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Soft delete document (mark as superseded)
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const { id: studentId, docId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify document exists
    const existing = await db.query.studentDocuments.findFirst({
      where: (docs, { and, eq }) =>
        and(
          eq(docs.id, docId),
          eq(docs.studentId, studentId),
          eq(docs.tenantId, tenantId)
        ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Soft delete: mark as not current
    await db
      .update(studentDocuments)
      .set({
        isCurrent: false,
        supersededAt: new Date(),
        // Note: supersededBy would be set if replacing with a new document
      })
      .where(
        and(
          eq(studentDocuments.id, docId),
          eq(studentDocuments.tenantId, tenantId)
        )
      );

    // Note: We don't delete the file from Supabase Storage
    // This preserves the document history
    // A background job could clean up old files if needed

    // TODO: Create audit log entry

    return NextResponse.json({
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
