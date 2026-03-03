/**
 * Summative Assessment Types API
 * GET/POST /api/admin/summative-types
 *
 * Manages school-defined assessment types (End of Unit, Mid-Term, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { summativeAssessmentTypes } from '@/db/schema/profile';
import { eq, and, sql, asc } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const createTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional().default(true),
});

// ============================================================================
// GET - List all assessment types for tenant
// ============================================================================

export async function GET() {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    const types = await db
      .select({
        id: summativeAssessmentTypes.id,
        name: summativeAssessmentTypes.name,
        description: summativeAssessmentTypes.description,
        isActive: summativeAssessmentTypes.isActive,
        createdAt: summativeAssessmentTypes.createdAt,
        updatedAt: summativeAssessmentTypes.updatedAt,
      })
      .from(summativeAssessmentTypes)
      .where(eq(summativeAssessmentTypes.tenantId, tenantId))
      .orderBy(asc(summativeAssessmentTypes.name));

    return NextResponse.json({
      types,
      total: types.length,
    });
  } catch (error) {
    console.error('Error fetching summative assessment types:', error);
    return NextResponse.json({ error: 'Failed to fetch assessment types' }, { status: 500 });
  }
}

// ============================================================================
// POST - Create new assessment type
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin', 'dos']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    // Parse and validate body
    const body = await request.json();
    const parseResult = createTypeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { name, description, isActive } = parseResult.data;

    // Set RLS context
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Check for duplicate name
    const existing = await db
      .select({ id: summativeAssessmentTypes.id })
      .from(summativeAssessmentTypes)
      .where(
        and(
          eq(summativeAssessmentTypes.tenantId, tenantId),
          eq(summativeAssessmentTypes.name, name)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'An assessment type with this name already exists' },
        { status: 409 }
      );
    }

    // Create the type
    const [newType] = await db
      .insert(summativeAssessmentTypes)
      .values({
        tenantId,
        name,
        description: description || null,
        isActive,
      })
      .returning();

    return NextResponse.json({
      success: true,
      type: newType,
    });
  } catch (error) {
    console.error('Error creating summative assessment type:', error);
    return NextResponse.json({ error: 'Failed to create assessment type' }, { status: 500 });
  }
}
