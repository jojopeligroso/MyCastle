/**
 * Admin Room Allocations API - Manage room assignments to class sessions
 * GET /api/admin/room-allocations - List all allocations (with optional date filtering)
 * POST /api/admin/room-allocations - Create new allocation
 * Ref: Task 1.8.3 - Room Allocation/Booking View
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roomAllocations, rooms, classSessions, classes } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { z } from 'zod';

const createAllocationSchema = z.object({
  room_id: z.string().uuid('Invalid room ID'),
  class_session_id: z.string().uuid('Invalid session ID'),
  notes: z.string().optional(),
});

/**
 * GET /api/admin/room-allocations
 * List all room allocations with optional date filtering
 * Query params: ?date=YYYY-MM-DD (optional)
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get optional date filter from query params
    const searchParams = request.nextUrl.searchParams;
    const dateFilter = searchParams.get('date');

    // Build query
    let query = db
      .select({
        allocation: roomAllocations,
        room: rooms,
        session: classSessions,
        class: classes,
      })
      .from(roomAllocations)
      .innerJoin(rooms, eq(roomAllocations.roomId, rooms.id))
      .innerJoin(classSessions, eq(roomAllocations.classSessionId, classSessions.id))
      .innerJoin(classes, eq(classSessions.classId, classes.id))
      .where(eq(roomAllocations.tenantId, tenantId))
      .$dynamic();

    // Apply date filter if provided
    if (dateFilter) {
      query = query.where(eq(classSessions.date, dateFilter));
    }

    const allocations = await query.orderBy(desc(roomAllocations.createdAt));

    return NextResponse.json({
      success: true,
      allocations,
      count: allocations.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching room allocations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch allocations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/room-allocations
 * Create a new room allocation
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Verify admin role (only admins can allocate rooms)
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const isAdmin =
      userRole === 'admin' || userRole === 'super_admin' || userRole?.startsWith('admin_');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createAllocationSchema.parse(body);

    // Check if this session already has a room allocated
    const [existingAllocation] = await db
      .select({ id: roomAllocations.id })
      .from(roomAllocations)
      .where(eq(roomAllocations.classSessionId, validatedData.class_session_id))
      .limit(1);

    if (existingAllocation) {
      return NextResponse.json(
        {
          error:
            'This session already has a room allocated. Please delete the existing allocation first.',
        },
        { status: 409 }
      );
    }

    // Verify the room exists and belongs to this tenant
    const [room] = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.id, validatedData.room_id), eq(rooms.tenantId, tenantId)))
      .limit(1);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Verify the session exists and belongs to this tenant
    const [session] = await db
      .select()
      .from(classSessions)
      .where(
        and(
          eq(classSessions.id, validatedData.class_session_id),
          eq(classSessions.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Create allocation
    const [newAllocation] = await db
      .insert(roomAllocations)
      .values({
        tenantId: tenantId,
        roomId: validatedData.room_id,
        classSessionId: validatedData.class_session_id,
        allocatedBy: user.id,
        notes: validatedData.notes || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      allocation: newAllocation,
    });
  } catch (error: unknown) {
    console.error('Error creating room allocation:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create allocation' },
      { status: 500 }
    );
  }
}
