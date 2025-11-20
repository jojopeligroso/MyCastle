/**
 * Admin Class API - Update and delete individual class
 * PATCH /api/admin/classes/[id] - Update class
 * DELETE /api/admin/classes/[id] - Delete class
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classes } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

const updateClassSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  level: z.string().optional(),
  subject: z.string().optional(),
  capacity: z.number().positive().optional(),
  teacher_id: z.string().uuid().nullable().optional(),
  schedule_description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().nullable().optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 400 }
      );
    }

    // Verify admin role
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole?.startsWith('admin_');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateClassSchema.parse(body);

    // Check if class exists and belongs to tenant
    const [existingClass] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, params.id), eq(classes.tenant_id, tenantId)))
      .limit(1);

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Update class
    const [updatedClass] = await db
      .update(classes)
      .set({
        ...validatedData,
        updated_at: new Date(),
      })
      .where(and(eq(classes.id, params.id), eq(classes.tenant_id, tenantId)))
      .returning();

    return NextResponse.json({
      success: true,
      class: updatedClass,
    });
  } catch (error: any) {
    console.error('Error updating class:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update class' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 400 }
      );
    }

    // Verify admin role
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole?.startsWith('admin_');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Check if class exists and belongs to tenant
    const [existingClass] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, params.id), eq(classes.tenant_id, tenantId)))
      .limit(1);

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting status to cancelled
    await db
      .update(classes)
      .set({
        status: 'cancelled',
        updated_at: new Date(),
      })
      .where(and(eq(classes.id, params.id), eq(classes.tenant_id, tenantId)));

    return NextResponse.json({
      success: true,
      message: 'Class cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error deleting class:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to delete class' },
      { status: 500 }
    );
  }
}
