/**
 * Summative Assessment Type Detail API
 * GET/PUT/DELETE /api/admin/summative-types/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { summativeAssessmentTypes } from '@/db/schema/profile';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const updateTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// GET - Get single assessment type
// ============================================================================

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const { id } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    const [type] = await db
      .select()
      .from(summativeAssessmentTypes)
      .where(
        and(eq(summativeAssessmentTypes.id, id), eq(summativeAssessmentTypes.tenantId, tenantId))
      )
      .limit(1);

    if (!type) {
      return NextResponse.json({ error: 'Assessment type not found' }, { status: 404 });
    }

    return NextResponse.json({ type });
  } catch (error) {
    console.error('Error fetching summative assessment type:', error);
    return NextResponse.json({ error: 'Failed to fetch assessment type' }, { status: 500 });
  }
}

// ============================================================================
// PUT - Update assessment type
// ============================================================================

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const { id } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = updateTypeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Check exists
    const [existing] = await db
      .select({ id: summativeAssessmentTypes.id })
      .from(summativeAssessmentTypes)
      .where(
        and(eq(summativeAssessmentTypes.id, id), eq(summativeAssessmentTypes.tenantId, tenantId))
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Assessment type not found' }, { status: 404 });
    }

    // Check for duplicate name if updating name
    if (parseResult.data.name) {
      const duplicate = await db
        .select({ id: summativeAssessmentTypes.id })
        .from(summativeAssessmentTypes)
        .where(
          and(
            eq(summativeAssessmentTypes.tenantId, tenantId),
            eq(summativeAssessmentTypes.name, parseResult.data.name)
          )
        )
        .limit(1);

      if (duplicate.length > 0 && duplicate[0].id !== id) {
        return NextResponse.json(
          { error: 'An assessment type with this name already exists' },
          { status: 409 }
        );
      }
    }

    const [updated] = await db
      .update(summativeAssessmentTypes)
      .set({
        ...parseResult.data,
        updatedAt: new Date(),
      })
      .where(
        and(eq(summativeAssessmentTypes.id, id), eq(summativeAssessmentTypes.tenantId, tenantId))
      )
      .returning();

    return NextResponse.json({
      success: true,
      type: updated,
    });
  } catch (error) {
    console.error('Error updating summative assessment type:', error);
    return NextResponse.json({ error: 'Failed to update assessment type' }, { status: 500 });
  }
}

// ============================================================================
// DELETE - Delete assessment type
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();
    const { id } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Check exists
    const [existing] = await db
      .select({ id: summativeAssessmentTypes.id })
      .from(summativeAssessmentTypes)
      .where(
        and(eq(summativeAssessmentTypes.id, id), eq(summativeAssessmentTypes.tenantId, tenantId))
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Assessment type not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    await db
      .update(summativeAssessmentTypes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(eq(summativeAssessmentTypes.id, id), eq(summativeAssessmentTypes.tenantId, tenantId))
      );

    return NextResponse.json({
      success: true,
      message: 'Assessment type deactivated',
    });
  } catch (error) {
    console.error('Error deleting summative assessment type:', error);
    return NextResponse.json({ error: 'Failed to delete assessment type' }, { status: 500 });
  }
}
