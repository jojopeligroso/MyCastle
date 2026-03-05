/**
 * Document Types Settings API
 * GET/POST /api/admin/settings/document-types
 *
 * Manage document type definitions (categories, permissions, expiry settings)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documentTypes } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const createDocumentTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  category: z.enum(['identity', 'visa', 'medical', 'academic', 'correspondence', 'other']),
  description: z.string().optional(),
  adminCanUpload: z.boolean().optional().default(true),
  studentCanUpload: z.boolean().optional().default(false),
  requiresApproval: z.boolean().optional().default(false),
  defaultVisibility: z.enum(['admin_only', 'staff_only', 'student_can_view']).default('admin_only'),
  requiresExpiry: z.boolean().optional().default(false),
  expiryAlertDays: z.array(z.number().int().min(1).max(365)).optional().default([60, 30]),
  isRequired: z.boolean().optional().default(false),
  displayOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

// ============================================================================
// GET - List all document types
// ============================================================================

export async function GET(_request: NextRequest) {
  try {
    await requireAuth(['admin', 'dos', 'teacher']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Get all document types for tenant
    const types = await db
      .select()
      .from(documentTypes)
      .where(eq(documentTypes.tenantId, tenantId))
      .orderBy(documentTypes.category, documentTypes.displayOrder, desc(documentTypes.createdAt));

    // Group types by category
    const groupedByCategory = types.reduce(
      (acc, type) => {
        const category = type.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(type);
        return acc;
      },
      {} as Record<string, typeof types>
    );

    // Calculate statistics
    const stats = {
      total: types.length,
      active: types.filter(t => t.isActive).length,
      required: types.filter(t => t.isRequired).length,
      withExpiry: types.filter(t => t.requiresExpiry).length,
      studentUploadable: types.filter(t => t.studentCanUpload).length,
      byCategory: types.reduce(
        (acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    return NextResponse.json({
      documentTypes: types,
      groupedByCategory,
      stats,
    });
  } catch (error) {
    console.error('Error fetching document types:', error);
    return NextResponse.json({ error: 'Failed to fetch document types' }, { status: 500 });
  }
}

// ============================================================================
// POST - Create new document type
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const userId = await getUserId();

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'No auth context' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = createDocumentTypeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Check for duplicate name within tenant
    const existing = await db.query.documentTypes.findFirst({
      where: (dt, { and, eq }) => and(eq(dt.tenantId, tenantId), eq(dt.name, data.name)),
    });

    if (existing) {
      return NextResponse.json(
        {
          error: 'A document type with this name already exists',
          existingId: existing.id,
        },
        { status: 409 }
      );
    }

    // Validate business logic
    if (data.studentCanUpload && !data.requiresApproval) {
      return NextResponse.json(
        {
          error: 'Student-uploadable document types must require approval',
          suggestion: 'Set requiresApproval to true',
        },
        { status: 400 }
      );
    }

    if (data.requiresExpiry && (!data.expiryAlertDays || data.expiryAlertDays.length === 0)) {
      return NextResponse.json(
        {
          error: 'Document types requiring expiry must have at least one alert day configured',
          suggestion: 'Set expiryAlertDays (e.g., [60, 30])',
        },
        { status: 400 }
      );
    }

    // Create document type
    const [docType] = await db
      .insert(documentTypes)
      .values({
        tenantId,
        name: data.name,
        category: data.category,
        description: data.description || null,
        adminCanUpload: data.adminCanUpload ?? true,
        studentCanUpload: data.studentCanUpload ?? false,
        requiresApproval: data.requiresApproval ?? false,
        defaultVisibility: data.defaultVisibility,
        requiresExpiry: data.requiresExpiry ?? false,
        expiryAlertDays: data.expiryAlertDays,
        isRequired: data.isRequired ?? false,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      })
      .returning();

    // TODO: Create audit log entry

    return NextResponse.json(
      {
        documentType: docType,
        message: 'Document type created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating document type:', error);
    return NextResponse.json({ error: 'Failed to create document type' }, { status: 500 });
  }
}
