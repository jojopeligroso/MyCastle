/**
 * Imports Row Exclude API
 * POST /api/imports/batches/[id]/rows/[rowId]/exclude - Exclude an invalid row
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { stgRows, proposedChanges, uploadBatches, ROW_STATUS } from '@/db/schema/imports';
import { requireAuth, getTenantId, setRLSContext } from '@/lib/auth/utils';
import { eq, and } from 'drizzle-orm';
import { updateBatchCounts } from '@/lib/imports/apply-service';
import { computeStatusAfterResolution, type BatchSummary } from '@/lib/imports/state-machine';

interface RouteParams {
  params: Promise<{ id: string; rowId: string }>;
}

/**
 * POST /api/imports/batches/[id]/rows/[rowId]/exclude
 * Exclude an invalid row from processing
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(['admin']);
    const tenantId = await getTenantId();
    const { id: batchId, rowId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    await setRLSContext(db);

    // Verify batch exists and is in a state that allows exclusion
    const [batch] = await db
      .select({
        id: uploadBatches.id,
        status: uploadBatches.status,
        invalidRows: uploadBatches.invalidRows,
        ambiguousRows: uploadBatches.ambiguousRows,
        excludedRows: uploadBatches.excludedRows,
        validRows: uploadBatches.validRows,
        totalRows: uploadBatches.totalRows,
        reviewOutcome: uploadBatches.reviewOutcome,
      })
      .from(uploadBatches)
      .where(and(eq(uploadBatches.id, batchId), eq(uploadBatches.tenantId, tenantId)))
      .limit(1);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Check batch status allows modification
    const allowedStatuses = ['PROPOSED_NEEDS_REVIEW', 'PROPOSED_OK'];
    if (!allowedStatuses.includes(batch.status)) {
      return NextResponse.json(
        { error: `Cannot modify rows in ${batch.status} status` },
        { status: 400 }
      );
    }

    // Get the row
    const [row] = await db
      .select({
        id: stgRows.id,
        rowStatus: stgRows.rowStatus,
      })
      .from(stgRows)
      .where(
        and(eq(stgRows.id, rowId), eq(stgRows.batchId, batchId), eq(stgRows.tenantId, tenantId))
      )
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }

    // Only INVALID rows can be excluded
    if (row.rowStatus !== ROW_STATUS.INVALID) {
      return NextResponse.json(
        { error: `Only invalid rows can be excluded. Row status is ${row.rowStatus}` },
        { status: 400 }
      );
    }

    // Update row status to EXCLUDED
    await db.update(stgRows).set({ rowStatus: ROW_STATUS.EXCLUDED }).where(eq(stgRows.id, rowId));

    // Mark proposed change as excluded
    await db
      .update(proposedChanges)
      .set({ isExcluded: true })
      .where(and(eq(proposedChanges.stgRowId, rowId), eq(proposedChanges.tenantId, tenantId)));

    // Update batch counts
    await updateBatchCounts(batchId, tenantId);

    // Recompute batch status
    const [updatedBatch] = await db
      .select({
        status: uploadBatches.status,
        invalidRows: uploadBatches.invalidRows,
        ambiguousRows: uploadBatches.ambiguousRows,
        excludedRows: uploadBatches.excludedRows,
        validRows: uploadBatches.validRows,
        totalRows: uploadBatches.totalRows,
        reviewOutcome: uploadBatches.reviewOutcome,
      })
      .from(uploadBatches)
      .where(eq(uploadBatches.id, batchId))
      .limit(1);

    const batchSummary: BatchSummary = {
      status: updatedBatch.status as BatchSummary['status'],
      invalidRows: updatedBatch.invalidRows,
      ambiguousRows: updatedBatch.ambiguousRows,
      excludedRows: updatedBatch.excludedRows,
      validRows: updatedBatch.validRows,
      totalRows: updatedBatch.totalRows,
      reviewOutcome: updatedBatch.reviewOutcome as BatchSummary['reviewOutcome'],
    };

    const newStatus = computeStatusAfterResolution(batchSummary);

    if (newStatus !== updatedBatch.status) {
      await db
        .update(uploadBatches)
        .set({ status: newStatus })
        .where(eq(uploadBatches.id, batchId));
    }

    return NextResponse.json({
      success: true,
      rowId,
      newRowStatus: ROW_STATUS.EXCLUDED,
      batchStatus: newStatus,
      counts: {
        invalidRows: updatedBatch.invalidRows,
        ambiguousRows: updatedBatch.ambiguousRows,
        excludedRows: updatedBatch.excludedRows,
      },
    });
  } catch (error) {
    console.error('[POST /api/imports/batches/[id]/rows/[rowId]/exclude] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
