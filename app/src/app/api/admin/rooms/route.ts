/**
 * Admin Rooms API - Create and list rooms
 * GET /api/admin/rooms - List all rooms
 * POST /api/admin/rooms - Create new room
 * Ref: Task 1.8.1, 1.8.2 - Rooms Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rooms } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { z } from 'zod';

const createRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  description: z.string().optional(),
  capacity: z.number().positive('Capacity must be a positive number').default(20),
  equipment: z.record(z.unknown()).optional().default({}),
  facilities: z.array(z.string()).optional().default([]),
  accessibility: z.boolean().default(false),
  status: z.enum(['available', 'maintenance', 'unavailable']).default('available'),
});

/**
 * GET /api/admin/rooms
 * List all rooms for the current tenant
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Verify admin or teacher role (teachers need to see rooms for scheduling)
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const isAuthorized =
      userRole === 'admin' ||
      userRole === 'super_admin' ||
      userRole?.startsWith('admin_') ||
      userRole === 'teacher';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all non-deleted rooms for this tenant
    const roomsList = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.tenantId, tenantId), isNull(rooms.deletedAt)))
      .orderBy(desc(rooms.createdAt));

    return NextResponse.json({
      success: true,
      rooms: roomsList,
      count: roomsList.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/rooms
 * Create a new room
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Verify admin role (only admins can create rooms)
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const isAdmin =
      userRole === 'admin' || userRole === 'super_admin' || userRole?.startsWith('admin_');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createRoomSchema.parse(body);

    // Check for duplicate room name within this tenant
    const existingRoom = await db
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

    if (existingRoom.length > 0) {
      return NextResponse.json(
        {
          error: `A room with the name "${validatedData.name}" already exists. Please choose a different name.`,
        },
        { status: 409 }
      );
    }

    // Create room
    const [newRoom] = await db
      .insert(rooms)
      .values({
        tenantId: tenantId,
        name: validatedData.name,
        description: validatedData.description || null,
        capacity: validatedData.capacity,
        equipment: validatedData.equipment,
        facilities: validatedData.facilities,
        accessibility: validatedData.accessibility,
        status: validatedData.status,
      })
      .returning();

    return NextResponse.json({
      success: true,
      room: newRoom,
    });
  } catch (error: unknown) {
    console.error('Error creating room:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create room' },
      { status: 500 }
    );
  }
}
