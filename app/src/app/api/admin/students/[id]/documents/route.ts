/**
 * Student Documents API
 * GET/POST /api/admin/students/[id]/documents
 *
 * Manages student document uploads, listing, and metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studentDocuments, documentTypes } from '@/db/schema';
import { users } from '@/db/schema/core';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Validation Schemas
// ============================================================================

const uploadDocumentSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().min(1), // Path in Supabase Storage
  fileSize: z.number().int().positive().max(26214400), // 25MB in bytes
  mimeType: z.string().min(1),
  documentTypeId: z.string().uuid(),
  documentDate: z.string().optional(), // YYYY-MM-DD
  expiryDate: z.string().optional(), // YYYY-MM-DD
  notes: z.string().optional(),
  isSharedWithStudent: z.boolean().optional().default(false),
});

// ============================================================================
// GET - List all documents for student
// ============================================================================

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'dos', 'teacher']);
    const tenantId = await getTenantId();
    const { id: studentId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get all documents for student (current versions only by default)
    const documents = await db
      .select({
        id: studentDocuments.id,
        fileName: studentDocuments.fileName,
        fileUrl: studentDocuments.fileUrl,
        fileSize: studentDocuments.fileSize,
        mimeType: studentDocuments.mimeType,
        documentDate: studentDocuments.documentDate,
        expiryDate: studentDocuments.expiryDate,
        notes: studentDocuments.notes,
        isSharedWithStudent: studentDocuments.isSharedWithStudent,
        isCurrent: studentDocuments.isCurrent,
        approvalStatus: studentDocuments.approvalStatus,
        uploadedBy: studentDocuments.uploadedBy,
        uploadedAt: studentDocuments.uploadedAt,
        uploadedByName: users.name,
        documentTypeId: studentDocuments.documentTypeId,
        documentTypeName: documentTypes.name,
        documentTypeCategory: documentTypes.category,
        supersededBy: studentDocuments.supersededBy,
      })
      .from(studentDocuments)
      .leftJoin(users, eq(studentDocuments.uploadedBy, users.id))
      .leftJoin(documentTypes, eq(studentDocuments.documentTypeId, documentTypes.id))
      .where(
        and(eq(studentDocuments.studentId, studentId), eq(studentDocuments.tenantId, tenantId))
      )
      .orderBy(desc(studentDocuments.uploadedAt));

    // Group documents by category
    const groupedByCategory = documents.reduce(
      (acc, doc) => {
        const category = doc.documentTypeCategory || 'other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(doc);
        return acc;
      },
      {} as Record<string, typeof documents>
    );

    // Calculate statistics
    const stats = {
      total: documents.length,
      current: documents.filter(d => d.isCurrent).length,
      pending: documents.filter(d => d.approvalStatus === 'pending').length,
      shared: documents.filter(d => d.isSharedWithStudent).length,
      expiringSoon: documents.filter(d => {
        if (!d.expiryDate) return false;
        const daysUntilExpiry = Math.ceil(
          (new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
      }).length,
      expired: documents.filter(d => {
        if (!d.expiryDate) return false;
        return new Date(d.expiryDate) < new Date();
      }).length,
    };

    return NextResponse.json({
      documents,
      groupedByCategory,
      stats,
    });
  } catch (error) {
    console.error('Error fetching student documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// ============================================================================
// POST - Upload document metadata (file already uploaded to Storage)
// ============================================================================

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const { id: studentId } = await params;

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'No auth context' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = uploadDocumentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));
    await db.execute(sql.raw(`SET app.user_id = '${userId}'`));

    // Verify student exists and belongs to tenant
    const student = await db.query.users.findFirst({
      where: (users, { and, eq }) => and(eq(users.id, studentId), eq(users.tenantId, tenantId)),
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Verify document type exists
    const docType = await db.query.documentTypes.findFirst({
      where: (dt, { and, eq }) => and(eq(dt.id, data.documentTypeId), eq(dt.tenantId, tenantId)),
    });

    if (!docType) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 });
    }

    // Create document record
    const [document] = await db
      .insert(studentDocuments)
      .values({
        tenantId,
        studentId,
        documentTypeId: data.documentTypeId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        documentDate: data.documentDate || null,
        expiryDate: data.expiryDate || null,
        notes: data.notes,
        isSharedWithStudent: data.isSharedWithStudent ?? false,
        isCurrent: true,
        approvalStatus: 'approved', // Admin uploads are auto-approved
        uploadedBy: userId,
        uploadedAt: new Date(),
      })
      .returning();

    // TODO: Create audit log entry
    // TODO: Check if expiry date triggers notification rule

    return NextResponse.json(
      {
        document,
        message: 'Document uploaded successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
