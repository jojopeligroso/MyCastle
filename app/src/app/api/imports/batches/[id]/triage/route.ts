/**
 * Imports Batch Triage API
 * POST /api/imports/batches/[id]/triage - Set review outcome
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { uploadBatches, BATCH_STATUS, REVIEW_OUTCOME } from '@/db/schema/imports';
import { requireAuth, getTenantId, setRLSContext } from '@/lib/auth/utils';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { canTriage, canReject, computeStatusAfterResolution } from '@/lib/imports/state-machine';
import type { BatchSummary } from '@/lib/imports/state-machine';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const triageSchema = z.object({
  reviewOutcome: z.enum(['CONFIRM', 'DENY', 'NEEDS_REVIEW']),
  reviewComment: z.string().optional(),
});

/**
 * POST /api/imports/batches/[id]/triage
 * Set review outcome (CONFIRM, DENY, NEEDS_REVIEW)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(['admin']);
    const tenantId = await getTenantId();
    const { id } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    await setRLSContext(db);

    // Parse request body
    const body = await request.json();
    const validation = triageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { reviewOutcome, reviewComment } = validation.data;

    // Get current batch
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
      .where(and(eq(uploadBatches.id, id), eq(uploadBatches.tenantId, tenantId)))
      .limit(1);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const currentStatus = batch.status as (typeof BATCH_STATUS)[keyof typeof BATCH_STATUS];

    // Handle DENY - reject the batch
    if (reviewOutcome === REVIEW_OUTCOME.DENY) {
      if (!canReject(currentStatus)) {
        return NextResponse.json(
          { error: `Cannot reject batch in ${currentStatus} status` },
          { status: 400 }
        );
      }

      await db
        .update(uploadBatches)
        .set({
          status: BATCH_STATUS.REJECTED,
          reviewOutcome: REVIEW_OUTCOME.DENY,
          reviewComment: reviewComment || null,
        })
        .where(eq(uploadBatches.id, id));

      return NextResponse.json({
        batchId: id,
        status: BATCH_STATUS.REJECTED,
        reviewOutcome: REVIEW_OUTCOME.DENY,
      });
    }

    // Handle CONFIRM or NEEDS_REVIEW
    if (!canTriage(currentStatus)) {
      return NextResponse.json(
        { error: `Cannot triage batch in ${currentStatus} status` },
        { status: 400 }
      );
    }

    // Build batch summary for status computation
    const batchSummary: BatchSummary = {
      status: currentStatus,
      invalidRows: batch.invalidRows,
      ambiguousRows: batch.ambiguousRows,
      excludedRows: batch.excludedRows,
      validRows: batch.validRows,
      totalRows: batch.totalRows,
      reviewOutcome: reviewOutcome as BatchSummary['reviewOutcome'],
    };

    // Compute new status
    const newStatus = computeStatusAfterResolution(batchSummary);

    await db
      .update(uploadBatches)
      .set({
        status: newStatus,
        reviewOutcome,
        reviewComment: reviewComment || null,
      })
      .where(eq(uploadBatches.id, id));

    return NextResponse.json({
      batchId: id,
      status: newStatus,
      reviewOutcome,
    });
  } catch (error) {
    console.error('[POST /api/imports/batches/[id]/triage] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
