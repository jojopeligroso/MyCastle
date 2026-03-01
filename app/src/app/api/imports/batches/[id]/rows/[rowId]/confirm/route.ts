/**
 * Row Confirmation API
 * POST /api/imports/batches/[id]/rows/[rowId]/confirm
 * Toggle row confirmation status (pending/confirmed/quarantined)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { stgRows, uploadBatches, ROW_CONFIRMATION } from '@/db/schema/imports';
import { requireAuth, getTenantId, setRLSContext, getUserId } from '@/lib/auth/utils';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string; rowId: string }>;
}

/**
 * POST /api/imports/batches/[id]/rows/[rowId]/confirm
 * Set row confirmation status
 * Body: { status: 'pending' | 'confirmed' | 'quarantined' }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(['admin']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const { id: batchId, rowId } = await params;

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Context required' }, { status: 400 });
    }

    await setRLSContext(db);

    // Verify batch exists and belongs to tenant
    const [batch] = await db
      .select({ id: uploadBatches.id, status: uploadBatches.status })
      .from(uploadBatches)
      .where(and(eq(uploadBatches.id, batchId), eq(uploadBatches.tenantId, tenantId)))
      .limit(1);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Don't allow confirmation changes on terminal batches
    const terminalStatuses = ['APPLIED', 'REJECTED', 'FAILED_VALIDATION', 'FAILED_SYSTEM'];
    if (terminalStatuses.includes(batch.status)) {
      return NextResponse.json({ error: 'Cannot modify rows in a terminal batch' }, { status: 400 });
    }

    // Verify row exists
    const [row] = await db
      .select({ id: stgRows.id })
      .from(stgRows)
      .where(and(eq(stgRows.id, rowId), eq(stgRows.batchId, batchId), eq(stgRows.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const newStatus = body.status;

    const validStatuses = Object.values(ROW_CONFIRMATION);
    if (!newStatus || !validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Update row confirmation status
    await db
      .update(stgRows)
      .set({
        confirmation: newStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(stgRows.id, rowId), eq(stgRows.tenantId, tenantId)));

    return NextResponse.json({
      success: true,
      rowId,
      confirmation: newStatus,
    });
  } catch (error) {
    console.error('[POST /api/imports/batches/[id]/rows/[rowId]/confirm] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
