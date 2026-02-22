/**
 * Imports Batch Rows API
 * GET /api/imports/batches/[id]/rows - List staged rows
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { stgRows, proposedChanges, uploadBatches } from '@/db/schema/imports';
import { requireAuth, getTenantId, setRLSContext } from '@/lib/auth/utils';
import { eq, and, asc } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/imports/batches/[id]/rows
 * List all staged rows for a batch
 * Query params:
 * - status: VALID | INVALID | AMBIGUOUS | EXCLUDED (optional filter)
 * - limit: number (default 100)
 * - offset: number (default 0)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(['admin']);
    const tenantId = await getTenantId();
    const { id: batchId } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    await setRLSContext(db);

    // Verify batch exists and belongs to tenant
    const [batch] = await db
      .select({ id: uploadBatches.id })
      .from(uploadBatches)
      .where(and(eq(uploadBatches.id, batchId), eq(uploadBatches.tenantId, tenantId)))
      .limit(1);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = db
      .select({
        id: stgRows.id,
        rowNumber: stgRows.rowNumber,
        rowStatus: stgRows.rowStatus,
        rawData: stgRows.rawData,
        parsedData: stgRows.parsedData,
        validationErrors: stgRows.validationErrors,
        matchCandidates: stgRows.matchCandidates,
        resolvedAt: stgRows.resolvedAt,
        resolutionType: stgRows.resolutionType,
        linkedEnrollmentId: stgRows.linkedEnrollmentId,
        // Proposed change info
        changeId: proposedChanges.id,
        action: proposedChanges.action,
        targetEnrollmentId: proposedChanges.targetEnrollmentId,
        diff: proposedChanges.diff,
        isExcluded: proposedChanges.isExcluded,
      })
      .from(stgRows)
      .leftJoin(proposedChanges, eq(stgRows.id, proposedChanges.stgRowId))
      .where(and(eq(stgRows.batchId, batchId), eq(stgRows.tenantId, tenantId)))
      .$dynamic();

    // Apply status filter if provided
    if (statusFilter && ['VALID', 'INVALID', 'AMBIGUOUS', 'EXCLUDED'].includes(statusFilter)) {
      query = query.where(
        and(
          eq(stgRows.batchId, batchId),
          eq(stgRows.tenantId, tenantId),
          eq(stgRows.rowStatus, statusFilter)
        )
      );
    }

    // Execute with ordering, limit, offset
    const rows = await query.orderBy(asc(stgRows.rowNumber)).limit(limit).offset(offset);

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: stgRows.id })
      .from(stgRows)
      .where(
        statusFilter
          ? and(
              eq(stgRows.batchId, batchId),
              eq(stgRows.tenantId, tenantId),
              eq(stgRows.rowStatus, statusFilter)
            )
          : and(eq(stgRows.batchId, batchId), eq(stgRows.tenantId, tenantId))
      );

    return NextResponse.json({
      rows,
      pagination: {
        total: rows.length, // Note: Would need COUNT(*) for accurate total
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('[GET /api/imports/batches/[id]/rows] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
