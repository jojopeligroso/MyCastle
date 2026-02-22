/**
 * Imports Row Resolve API
 * POST /api/imports/batches/[id]/rows/[rowId]/resolve - Resolve an ambiguous row
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  stgRows,
  proposedChanges,
  uploadBatches,
  ROW_STATUS,
  CHANGE_ACTION,
  RESOLUTION_TYPE,
} from '@/db/schema/imports';
import { requireAuth, getTenantId, setRLSContext, getCurrentUser } from '@/lib/auth/utils';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { updateBatchCounts } from '@/lib/imports/apply-service';
import { calculateDiff } from '@/lib/imports/matcher';
import { computeStatusAfterResolution, type BatchSummary } from '@/lib/imports/state-machine';

interface RouteParams {
  params: Promise<{ id: string; rowId: string }>;
}

const resolveSchema = z.object({
  // Either link to existing enrollment or treat as new
  resolutionType: z.enum(['linked', 'new']),
  // Required if resolutionType is 'linked'
  enrollmentId: z.string().uuid().optional(),
});

/**
 * POST /api/imports/batches/[id]/rows/[rowId]/resolve
 * Resolve an ambiguous row by linking to candidate or treating as new
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    await requireAuth(['admin']);
    const tenantId = await getTenantId();
    const { id: batchId, rowId } = await params;

    if (!tenantId || !user) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    await setRLSContext(db);

    // Parse request body
    const body = await request.json();
    const validation = resolveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { resolutionType, enrollmentId } = validation.data;

    // Validate: if linking, enrollmentId is required
    if (resolutionType === 'linked' && !enrollmentId) {
      return NextResponse.json(
        { error: 'enrollmentId is required when resolutionType is "linked"' },
        { status: 400 }
      );
    }

    // Verify batch exists and is in a state that allows resolution
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
        parsedData: stgRows.parsedData,
        matchCandidates: stgRows.matchCandidates,
      })
      .from(stgRows)
      .where(
        and(eq(stgRows.id, rowId), eq(stgRows.batchId, batchId), eq(stgRows.tenantId, tenantId))
      )
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }

    // Only AMBIGUOUS rows can be resolved
    if (row.rowStatus !== ROW_STATUS.AMBIGUOUS) {
      return NextResponse.json(
        { error: `Only ambiguous rows can be resolved. Row status is ${row.rowStatus}` },
        { status: 400 }
      );
    }

    // If linking, verify the enrollment is one of the candidates
    if (resolutionType === 'linked' && enrollmentId) {
      const candidates = row.matchCandidates as Array<{ enrollmentId: string }> | null;
      const isValidCandidate = candidates?.some(c => c.enrollmentId === enrollmentId);

      if (!isValidCandidate) {
        return NextResponse.json(
          { error: 'Selected enrollment is not a valid candidate for this row' },
          { status: 400 }
        );
      }
    }

    // Update row with resolution
    await db
      .update(stgRows)
      .set({
        rowStatus: ROW_STATUS.VALID,
        resolvedAt: new Date(),
        resolvedBy: user.id,
        resolutionType: resolutionType as string,
        linkedEnrollmentId: resolutionType === 'linked' ? enrollmentId : null,
      })
      .where(eq(stgRows.id, rowId));

    // Update proposed change based on resolution type
    if (resolutionType === 'linked' && enrollmentId) {
      // Calculate diff for UPDATE
      const parsedData = row.parsedData as {
        studentName: string | null;
        startDate: Date | null;
        className: string | null;
        endDate: Date | null;
        registerFlag: string | null;
      };

      const diff = await calculateDiff(tenantId, parsedData, enrollmentId);
      const action = Object.keys(diff).length > 0 ? CHANGE_ACTION.UPDATE : CHANGE_ACTION.NOOP;

      await db
        .update(proposedChanges)
        .set({
          action,
          targetEnrollmentId: enrollmentId,
          diff: Object.keys(diff).length > 0 ? diff : null,
        })
        .where(and(eq(proposedChanges.stgRowId, rowId), eq(proposedChanges.tenantId, tenantId)));
    } else {
      // Treat as new - INSERT action
      await db
        .update(proposedChanges)
        .set({
          action: CHANGE_ACTION.INSERT,
          targetEnrollmentId: null,
          diff: null,
        })
        .where(and(eq(proposedChanges.stgRowId, rowId), eq(proposedChanges.tenantId, tenantId)));
    }

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
      resolutionType,
      linkedEnrollmentId: resolutionType === 'linked' ? enrollmentId : null,
      newRowStatus: ROW_STATUS.VALID,
      batchStatus: newStatus,
      counts: {
        invalidRows: updatedBatch.invalidRows,
        ambiguousRows: updatedBatch.ambiguousRows,
        excludedRows: updatedBatch.excludedRows,
      },
    });
  } catch (error) {
    console.error('[POST /api/imports/batches/[id]/rows/[rowId]/resolve] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
