/**
 * Individual Document Type API
 * GET/PATCH/DELETE /api/admin/settings/document-types/[typeId]
 *
 * Operations on a specific document type
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documentTypes, studentDocuments } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const updateDocumentTypeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z
    .enum(['identity', 'visa', 'medical', 'academic', 'correspondence', 'other'])
    .optional(),
  description: z.string().optional(),
  adminCanUpload: z.boolean().optional(),
  studentCanUpload: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  defaultVisibility: z.enum(['admin_only', 'staff_only', 'student_can_view']).optional(),
  requiresExpiry: z.boolean().optional(),
  expiryAlertDays: z.array(z.number().int().min(1).max(365)).optional(),
  isRequired: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// GET - Get specific document type
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ typeId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos', 'teacher']);
    const tenantId = await getTenantId();
    const { typeId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get document type
    const docType = await db.query.documentTypes.findFirst({
      where: (types, { and, eq }) => and(eq(types.id, typeId), eq(types.tenantId, tenantId)),
    });

    if (!docType) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 });
    }

    // Get usage statistics
    const usageStats = await db
      .select({
        total: sql<number>`COUNT(*)`,
        current: sql<number>`SUM(CASE WHEN ${studentDocuments.isCurrent} THEN 1 ELSE 0 END)`,
        pending: sql<number>`SUM(CASE WHEN ${studentDocuments.approvalStatus} = 'pending' THEN 1 ELSE 0 END)`,
      })
      .from(studentDocuments)
      .where(
        and(eq(studentDocuments.documentTypeId, typeId), eq(studentDocuments.tenantId, tenantId))
      );

    return NextResponse.json({
      documentType: docType,
      stats: {
        documentsCount: Number(usageStats[0]?.total || 0),
        currentDocuments: Number(usageStats[0]?.current || 0),
        pendingApproval: Number(usageStats[0]?.pending || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching document type:', error);
    return NextResponse.json({ error: 'Failed to fetch document type' }, { status: 500 });
  }
}

// ============================================================================
// PATCH - Update document type
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ typeId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const { typeId } = await params;

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'No auth context' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateDocumentTypeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify document type exists
    const existing = await db.query.documentTypes.findFirst({
      where: (types, { and, eq }) => and(eq(types.id, typeId), eq(types.tenantId, tenantId)),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 });
    }

    // Check for name conflict if name is being changed
    if (data.name && data.name !== existing.name) {
      const nameConflict = await db.query.documentTypes.findFirst({
        where: (dt, { and, eq }) => and(eq(dt.tenantId, tenantId), eq(dt.name, data.name!)),
      });

      if (nameConflict) {
        return NextResponse.json(
          {
            error: 'A document type with this name already exists',
            existingId: nameConflict.id,
          },
          { status: 409 }
        );
      }
    }

    // Validate business logic
    const studentCanUpload = data.studentCanUpload ?? existing.studentCanUpload;
    const requiresApproval = data.requiresApproval ?? existing.requiresApproval;

    if (studentCanUpload && !requiresApproval) {
      return NextResponse.json(
        {
          error: 'Student-uploadable document types must require approval',
          suggestion: 'Set requiresApproval to true',
        },
        { status: 400 }
      );
    }

    const requiresExpiry = data.requiresExpiry ?? existing.requiresExpiry;
    const expiryAlertDays = data.expiryAlertDays ?? existing.expiryAlertDays;

    if (requiresExpiry && (!expiryAlertDays || expiryAlertDays.length === 0)) {
      return NextResponse.json(
        {
          error: 'Document types requiring expiry must have at least one alert day configured',
          suggestion: 'Set expiryAlertDays (e.g., [60, 30])',
        },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.adminCanUpload !== undefined) updateData.adminCanUpload = data.adminCanUpload;
    if (data.studentCanUpload !== undefined) updateData.studentCanUpload = data.studentCanUpload;
    if (data.requiresApproval !== undefined) updateData.requiresApproval = data.requiresApproval;
    if (data.defaultVisibility !== undefined) updateData.defaultVisibility = data.defaultVisibility;
    if (data.requiresExpiry !== undefined) updateData.requiresExpiry = data.requiresExpiry;
    if (data.expiryAlertDays !== undefined) updateData.expiryAlertDays = data.expiryAlertDays;
    if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Update document type
    const [updated] = await db
      .update(documentTypes)
      .set(updateData)
      .where(and(eq(documentTypes.id, typeId), eq(documentTypes.tenantId, tenantId)))
      .returning();

    // TODO: Create audit log entry
    // TODO: If expiry settings changed, update notification rules

    return NextResponse.json({
      documentType: updated,
      message: 'Document type updated successfully',
    });
  } catch (error) {
    console.error('Error updating document type:', error);
    return NextResponse.json({ error: 'Failed to update document type' }, { status: 500 });
  }
}

// ============================================================================
// DELETE - Deactivate or delete document type
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ typeId: string }> }
) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const { typeId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Verify document type exists
    const existing = await db.query.documentTypes.findFirst({
      where: (types, { and, eq }) => and(eq(types.id, typeId), eq(types.tenantId, tenantId)),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 });
    }

    // Check if document type is in use
    const documentsCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(studentDocuments)
      .where(
        and(eq(studentDocuments.documentTypeId, typeId), eq(studentDocuments.tenantId, tenantId))
      );

    const hasDocuments = Number(documentsCount[0]?.count || 0) > 0;

    if (hasDocuments) {
      // Soft delete: deactivate instead of deleting
      await db
        .update(documentTypes)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(eq(documentTypes.id, typeId), eq(documentTypes.tenantId, tenantId)));

      return NextResponse.json({
        message: 'Document type deactivated (has existing documents)',
        isActive: false,
        documentsCount: Number(documentsCount[0]?.count || 0),
      });
    }

    // Hard delete if no documents exist
    await db
      .delete(documentTypes)
      .where(and(eq(documentTypes.id, typeId), eq(documentTypes.tenantId, tenantId)));

    // TODO: Create audit log entry
    // TODO: Delete associated notification rules

    return NextResponse.json({
      message: 'Document type deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting document type:', error);
    return NextResponse.json({ error: 'Failed to delete document type' }, { status: 500 });
  }
}
