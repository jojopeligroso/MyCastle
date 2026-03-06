/**
 * Custom Descriptors API Route
 * GET: List all custom descriptors for tenant
 * POST: Create a new custom descriptor
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customDescriptors, users } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { z } from 'zod';

// Validation schema for creating custom descriptor
const createDescriptorSchema = z.object({
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  skill: z.enum(['reading', 'writing', 'listening', 'speaking', 'grammar', 'vocabulary']),
  descriptorText: z.string().min(10, 'Descriptor text must be at least 10 characters'),
  category: z.string().max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin', 'super_admin', 'owner', 'teacher', 'dos', 'assistant_dos']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const skill = searchParams.get('skill');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    // Set RLS context
    await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);

    // Build query conditions
    const conditions = [eq(customDescriptors.tenantId, tenantId)];

    if (activeOnly) {
      conditions.push(eq(customDescriptors.isActive, true));
    }

    if (level) {
      conditions.push(eq(customDescriptors.cefrLevel, level));
    }

    if (skill) {
      conditions.push(eq(customDescriptors.skill, skill));
    }

    const descriptors = await db
      .select({
        id: customDescriptors.id,
        cefrLevel: customDescriptors.cefrLevel,
        skill: customDescriptors.skill,
        descriptorText: customDescriptors.descriptorText,
        category: customDescriptors.category,
        isActive: customDescriptors.isActive,
        createdAt: customDescriptors.createdAt,
        createdBy: customDescriptors.createdBy,
        createdByName: users.name,
      })
      .from(customDescriptors)
      .leftJoin(users, eq(customDescriptors.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(customDescriptors.cefrLevel, customDescriptors.skill, desc(customDescriptors.createdAt));

    // Get counts by level and skill for stats
    const countByLevel = await db
      .select({
        level: customDescriptors.cefrLevel,
        count: sql<number>`count(*)::int`,
      })
      .from(customDescriptors)
      .where(
        and(
          eq(customDescriptors.tenantId, tenantId),
          activeOnly ? eq(customDescriptors.isActive, true) : undefined
        )
      )
      .groupBy(customDescriptors.cefrLevel);

    const countBySkill = await db
      .select({
        skill: customDescriptors.skill,
        count: sql<number>`count(*)::int`,
      })
      .from(customDescriptors)
      .where(
        and(
          eq(customDescriptors.tenantId, tenantId),
          activeOnly ? eq(customDescriptors.isActive, true) : undefined
        )
      )
      .groupBy(customDescriptors.skill);

    return NextResponse.json({
      descriptors,
      total: descriptors.length,
      stats: {
        byLevel: countByLevel,
        bySkill: countBySkill,
      },
    });
  } catch (error) {
    console.error('Error fetching custom descriptors:', error);
    return NextResponse.json({ error: 'Failed to fetch custom descriptors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin', 'super_admin', 'owner']);
    const tenantId = await getTenantId();
    const userId = await getUserId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validation = createDescriptorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { cefrLevel, skill, descriptorText, category } = validation.data;

    // Set RLS context
    await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);

    // Create the custom descriptor
    const [newDescriptor] = await db
      .insert(customDescriptors)
      .values({
        tenantId,
        cefrLevel,
        skill,
        descriptorText,
        category: category || null,
        createdBy: userId,
        isActive: true,
      })
      .returning();

    return NextResponse.json(newDescriptor, { status: 201 });
  } catch (error) {
    console.error('Error creating custom descriptor:', error);
    return NextResponse.json({ error: 'Failed to create custom descriptor' }, { status: 500 });
  }
}
