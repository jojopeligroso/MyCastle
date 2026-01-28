/**
 * Admin Room Allocation Detail API - Delete individual allocation
 * DELETE /api/admin/room-allocations/[id] - Remove room allocation
 * Ref: Task 1.8.3 - Room Allocation/Booking View
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roomAllocations } from '@/db/schema';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { eq, and } from 'drizzle-orm';

/**
 * DELETE /api/admin/room-allocations/[id]
 * Remove a room allocation
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

    // Check if allocation exists
    const [existingAllocation] = await db
      .select()
      .from(roomAllocations)
      .where(and(eq(roomAllocations.id, id), eq(roomAllocations.tenantId, tenantId)))
      .limit(1);

    if (!existingAllocation) {
      return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
    }

    // Delete allocation
    await db.delete(roomAllocations).where(eq(roomAllocations.id, id));

    return NextResponse.json({
      success: true,
      message: 'Room allocation removed successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting room allocation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete allocation' },
      { status: 500 }
    );
  }
}
