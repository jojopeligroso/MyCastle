/**
 * Custom Descriptor Detail API Route
 * GET: Get a single custom descriptor
 * PUT: Update a custom descriptor
 * DELETE: Delete a custom descriptor
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customDescriptors } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';

// Validation schema for updating custom descriptor
const updateDescriptorSchema = z.object({
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  skill: z
    .enum(['reading', 'writing', 'listening', 'speaking', 'grammar', 'vocabulary'])
    .optional(),
  descriptorText: z.string().min(10, 'Descriptor text must be at least 10 characters').optional(),
  category: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth(['admin', 'super_admin', 'owner', 'teacher', 'dos', 'assistant_dos']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const { id } = await context.params;

    // Set RLS context
    await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);

    const [descriptor] = await db
      .select()
      .from(customDescriptors)
      .where(and(eq(customDescriptors.id, id), eq(customDescriptors.tenantId, tenantId)))
      .limit(1);

    if (!descriptor) {
      return NextResponse.json({ error: 'Custom descriptor not found' }, { status: 404 });
    }

    return NextResponse.json(descriptor);
  } catch (error) {
    console.error('Error fetching custom descriptor:', error);
    return NextResponse.json({ error: 'Failed to fetch custom descriptor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth(['admin', 'super_admin', 'owner']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Validate input
    const validation = updateDescriptorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Set RLS context
    await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);

    // Check if descriptor exists and belongs to tenant
    const [existing] = await db
      .select()
      .from(customDescriptors)
      .where(and(eq(customDescriptors.id, id), eq(customDescriptors.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Custom descriptor not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validation.data.cefrLevel !== undefined) {
      updateData.cefrLevel = validation.data.cefrLevel;
    }
    if (validation.data.skill !== undefined) {
      updateData.skill = validation.data.skill;
    }
    if (validation.data.descriptorText !== undefined) {
      updateData.descriptorText = validation.data.descriptorText;
    }
    if (validation.data.category !== undefined) {
      updateData.category = validation.data.category;
    }
    if (validation.data.isActive !== undefined) {
      updateData.isActive = validation.data.isActive;
    }

    const [updated] = await db
      .update(customDescriptors)
      .set(updateData)
      .where(and(eq(customDescriptors.id, id), eq(customDescriptors.tenantId, tenantId)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating custom descriptor:', error);
    return NextResponse.json({ error: 'Failed to update custom descriptor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth(['admin', 'super_admin', 'owner']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const { id } = await context.params;

    // Set RLS context
    await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);

    // Check if descriptor exists and belongs to tenant
    const [existing] = await db
      .select()
      .from(customDescriptors)
      .where(and(eq(customDescriptors.id, id), eq(customDescriptors.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Custom descriptor not found' }, { status: 404 });
    }

    await db
      .delete(customDescriptors)
      .where(and(eq(customDescriptors.id, id), eq(customDescriptors.tenantId, tenantId)));

    return NextResponse.json({ success: true, message: 'Custom descriptor deleted' });
  } catch (error) {
    console.error('Error deleting custom descriptor:', error);
    return NextResponse.json({ error: 'Failed to delete custom descriptor' }, { status: 500 });
  }
}
