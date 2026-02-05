/**
 * Admin Class API - Update and delete individual class
 * PUT /api/admin/classes/[id] - Update class (full update)
 * PATCH /api/admin/classes/[id] - Update class (partial update - legacy)
 * DELETE /api/admin/classes/[id] - Delete class
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classes, auditLogs } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

// Full update schema (for PUT)
const updateClassFullSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  level: z.string(),
  subject: z.string(),
  capacity: z.number().positive(),
  teacher_id: z.string().uuid().nullable(),
  programme_id: z.string().uuid(),
  schedule_description: z.string().optional(),
  start_time: z.string(),
  end_time: z.string(),
  break_duration_minutes: z.number().min(0).max(60).default(0),
  days_of_week: z.array(z.string()),
  start_date: z.string(),
  end_date: z.string().nullable(),
  show_capacity_publicly: z.boolean().default(true),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
});

// Partial update schema (for PATCH - legacy)
const updateClassSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  level: z.string().optional(),
  subject: z.string().optional(),
  capacity: z.number().positive().optional(),
  teacher_id: z.string().uuid().nullable().optional(),
  programme_id: z.string().uuid().optional(),
  schedule_description: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  break_duration_minutes: z.number().min(0).max(60).optional(),
  days_of_week: z.array(z.string()).optional(),
  start_date: z.string().optional(),
  end_date: z.string().nullable().optional(),
  show_capacity_publicly: z.boolean().optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
});

// PUT handler for full class update with audit logging
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    // Verify authentication
    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Verify admin role
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const isAdmin =
      userRole === 'admin' || userRole === 'super_admin' || userRole?.startsWith('admin_');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Fetch existing class to verify ownership and get old values for audit log
    const [existingClass] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, id), eq(classes.tenantId, tenantId)))
      .limit(1);

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Class not found or you do not have permission to edit it' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateClassFullSchema.parse(body);

    // Check for duplicate class name (excluding current class)
    if (validatedData.name !== existingClass.name) {
      const duplicateClass = await db
        .select({ id: classes.id })
        .from(classes)
        .where(and(eq(classes.tenantId, tenantId), eq(classes.name, validatedData.name)))
        .limit(1);

      if (duplicateClass.length > 0) {
        return NextResponse.json(
          {
            error: `A class with the name "${validatedData.name}" already exists. Please choose a different name.`,
          },
          { status: 409 }
        );
      }
    }

    // Validate capacity isn't reduced below enrolled count
    if (validatedData.capacity < existingClass.enrolledCount) {
      return NextResponse.json(
        {
          error: `Capacity cannot be reduced below ${existingClass.enrolledCount} (current enrollment count). Please unenroll students first.`,
        },
        { status: 400 }
      );
    }

    // Update class
    const [updatedClass] = await db
      .update(classes)
      .set({
        name: validatedData.name,
        code: validatedData.code || existingClass.code,
        level: validatedData.level,
        subject: validatedData.subject,
        capacity: validatedData.capacity,
        teacherId: validatedData.teacher_id,
        programmeId: validatedData.programme_id,
        scheduleDescription: validatedData.schedule_description || null,
        startTime: validatedData.start_time,
        endTime: validatedData.end_time,
        breakDurationMinutes: validatedData.break_duration_minutes,
        daysOfWeek: validatedData.days_of_week,
        startDate: validatedData.start_date,
        endDate: validatedData.end_date,
        showCapacityPublicly: validatedData.show_capacity_publicly,
        status: validatedData.status || existingClass.status,
        updatedAt: new Date(),
      })
      .where(eq(classes.id, id))
      .returning();

    // Track changes for audit log
    const changes: Record<string, { old: string | number | null; new: string | number | null }> =
      {};

    if (existingClass.name !== validatedData.name) {
      changes.name = { old: existingClass.name, new: validatedData.name };
    }
    if (existingClass.capacity !== validatedData.capacity) {
      changes.capacity = { old: existingClass.capacity, new: validatedData.capacity };
    }
    if (existingClass.teacherId !== validatedData.teacher_id) {
      changes.teacherId = { old: existingClass.teacherId, new: validatedData.teacher_id };
    }
    if (existingClass.programmeId !== validatedData.programme_id) {
      changes.programmeId = { old: existingClass.programmeId, new: validatedData.programme_id };
    }
    if (existingClass.level !== validatedData.level) {
      changes.level = { old: existingClass.level, new: validatedData.level };
    }
    if (existingClass.subject !== validatedData.subject) {
      changes.subject = { old: existingClass.subject, new: validatedData.subject };
    }
    if (existingClass.startTime !== validatedData.start_time) {
      changes.startTime = { old: existingClass.startTime, new: validatedData.start_time };
    }
    if (existingClass.endTime !== validatedData.end_time) {
      changes.endTime = { old: existingClass.endTime, new: validatedData.end_time };
    }
    if (validatedData.status && existingClass.status !== validatedData.status) {
      changes.status = { old: existingClass.status, new: validatedData.status };
    }

    // Log audit entry if there were changes
    if (Object.keys(changes).length > 0) {
      await db.insert(auditLogs).values({
        tenantId: tenantId,
        userId: user.id,
        action: 'class_updated',
        resourceType: 'class',
        resourceId: id,
        metadata: {
          changes,
          classCode: updatedClass.code,
          className: updatedClass.name,
        },
      });
    }

    return NextResponse.json({
      success: true,
      class: updatedClass,
    });
  } catch (error) {
    console.error('Error updating class:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Verify authentication

    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Verify admin role
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const isAdmin =
      userRole === 'admin' || userRole === 'super_admin' || userRole?.startsWith('admin_');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateClassSchema.parse(body);

    // Check if class exists and belongs to tenant
    const [existingClass] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, id), eq(classes.tenantId, tenantId)))
      .limit(1);

    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Map snake_case API fields to camelCase database fields
    const updateData: Record<string, string | number | boolean | string[] | Date | null> = {
      updatedAt: new Date(),
    };

    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.code) updateData.code = validatedData.code;
    if (validatedData.level) updateData.level = validatedData.level;
    if (validatedData.subject) updateData.subject = validatedData.subject;
    if (validatedData.capacity) updateData.capacity = validatedData.capacity;
    if (validatedData.teacher_id !== undefined) updateData.teacherId = validatedData.teacher_id;
    if (validatedData.programme_id) updateData.programmeId = validatedData.programme_id;
    if (validatedData.schedule_description)
      updateData.scheduleDescription = validatedData.schedule_description;
    if (validatedData.start_time) updateData.startTime = validatedData.start_time;
    if (validatedData.end_time) updateData.endTime = validatedData.end_time;
    if (validatedData.break_duration_minutes !== undefined)
      updateData.breakDurationMinutes = validatedData.break_duration_minutes;
    if (validatedData.days_of_week) updateData.daysOfWeek = validatedData.days_of_week;
    if (validatedData.start_date) updateData.startDate = validatedData.start_date;
    if (validatedData.end_date !== undefined) updateData.endDate = validatedData.end_date;
    if (validatedData.show_capacity_publicly !== undefined)
      updateData.showCapacityPublicly = validatedData.show_capacity_publicly;
    if (validatedData.status) updateData.status = validatedData.status;

    // Update class
    const [updatedClass] = await db
      .update(classes)
      .set(updateData)
      .where(and(eq(classes.id, id), eq(classes.tenantId, tenantId)))
      .returning();

    return NextResponse.json({
      success: true,
      class: updatedClass,
    });
  } catch (error) {
    console.error('Error updating class:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: (error as unknown as { errors: unknown }).errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update class' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Verify authentication

    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Verify admin role
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const isAdmin =
      userRole === 'admin' || userRole === 'super_admin' || userRole?.startsWith('admin_');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Check if class exists and belongs to tenant
    const [existingClass] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, id), eq(classes.tenantId, tenantId)))
      .limit(1);

    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Soft delete by setting status to cancelled
    await db
      .update(classes)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(and(eq(classes.id, id), eq(classes.tenantId, tenantId)));

    return NextResponse.json({
      success: true,
      message: 'Class cancelled successfully',
    });
  } catch (error) {
    console.error('Error deleting class:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete class' },
      { status: 500 }
    );
  }
}
