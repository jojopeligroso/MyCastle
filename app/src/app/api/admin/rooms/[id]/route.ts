/**
 * Admin Room Detail API - Get, update, and delete individual rooms
 * GET /api/admin/rooms/[id] - Get room details
 * PUT /api/admin/rooms/[id] - Update room
 * DELETE /api/admin/rooms/[id] - Soft delete room
 * Ref: Task 1.8.1, 1.8.2 - Rooms Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rooms } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

const updateRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').optional(),
  description: z.string().optional(),
  capacity: z.number().positive('Capacity must be a positive number').optional(),
  equipment: z.record(z.string(), z.unknown()).optional(),
  facilities: z.array(z.string()).optional(),
  accessibility: z.boolean().optional(),
  status: z.enum(['available', 'maintenance', 'unavailable']).optional(),
});

/**
 * GET /api/admin/rooms/[id]
 * Get details for a specific room
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Await params (Next.js 15 pattern)
    const { id } = await context.params;

    // Verify authentication
    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Verify admin or teacher role
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const isAuthorized =
      userRole === 'admin' ||
      userRole === 'super_admin' ||
      userRole?.startsWith('admin_') ||
      userRole === 'teacher';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch room
    const [room] = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.id, id), eq(rooms.tenantId, tenantId), isNull(rooms.deletedAt)))
      .limit(1);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      room,
    });
  } catch (error: unknown) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch room' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/rooms/[id]
 * Update a room
 */
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Await params (Next.js 15 pattern)
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateRoomSchema.parse(body);

    // Check if room exists
    const [existingRoom] = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.id, id), eq(rooms.tenantId, tenantId), isNull(rooms.deletedAt)))
      .limit(1);

    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // If name is being changed, check for duplicates
    if (validatedData.name && validatedData.name !== existingRoom.name) {
      const [duplicateRoom] = await db
        .select({ id: rooms.id })
        .from(rooms)
        .where(
          and(
            eq(rooms.tenantId, tenantId),
            eq(rooms.name, validatedData.name),
            isNull(rooms.deletedAt)
          )
        )
        .limit(1);

      if (duplicateRoom) {
        return NextResponse.json(
          {
            error: `A room with the name "${validatedData.name}" already exists. Please choose a different name.`,
          },
          { status: 409 }
        );
      }
    }

    // Update room
    const [updatedRoom] = await db
      .update(rooms)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(rooms.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      room: updatedRoom,
    });
  } catch (error: unknown) {
    console.error('Error updating room:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update room' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/rooms/[id]
 * Soft delete a room
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Await params (Next.js 15 pattern)
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

    // Check if room exists
    const [existingRoom] = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.id, id), eq(rooms.tenantId, tenantId), isNull(rooms.deletedAt)))
      .limit(1);

    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Soft delete (set deletedAt timestamp)
    await db
      .update(rooms)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(rooms.id, id));

    return NextResponse.json({
      success: true,
      message: 'Room deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting room:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete room' },
      { status: 500 }
    );
  }
}
