/**
 * Lesson Plan CRUD API
 * GET/PATCH /api/lessons/[id]
 * Retrieve or update a specific lesson plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { lessonPlans } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get a specific lesson plan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['teacher', 'admin', 'dos']);
    const tenantId = await getTenantId();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Lesson plan ID is required' },
        { status: 400 }
      );
    }

    const [plan] = await db
      .select()
      .from(lessonPlans)
      .where(
        and(
          eq(lessonPlans.id, id),
          tenantId ? eq(lessonPlans.tenantId, tenantId) : undefined
        )
      )
      .limit(1);

    if (!plan) {
      return NextResponse.json(
        { error: 'Lesson plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error fetching lesson plan:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch lesson plan' },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  title: z.string().min(1).max(255).optional(),
  topic: z.string().min(1).max(255).optional(),
  jsonPlan: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Update a lesson plan
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['teacher', 'admin']);
    const tenantId = await getTenantId();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Lesson plan ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const updates = updateSchema.parse(body);

    // Find the lesson plan
    const [existingPlan] = await db
      .select()
      .from(lessonPlans)
      .where(
        and(
          eq(lessonPlans.id, id),
          tenantId ? eq(lessonPlans.tenantId, tenantId) : undefined
        )
      )
      .limit(1);

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'Lesson plan not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.status) {
      updateData.status = updates.status;
    }
    if (updates.title) {
      updateData.title = updates.title;
    }
    if (updates.topic) {
      updateData.topic = updates.topic;
    }
    if (updates.jsonPlan) {
      updateData.jsonPlan = updates.jsonPlan;
    }

    // Update the plan
    const [updatedPlan] = await db
      .update(lessonPlans)
      .set(updateData)
      .where(eq(lessonPlans.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedPlan,
    });
  } catch (error) {
    console.error('Error updating lesson plan:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update lesson plan' },
      { status: 500 }
    );
  }
}
