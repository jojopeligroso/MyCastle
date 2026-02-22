/**
 * Imports Batch Detail API
 * GET /api/imports/batches/[id] - Get batch details
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { uploadBatches } from '@/db/schema/imports';
import { users } from '@/db/schema/core';
import { requireAuth, getTenantId, setRLSContext } from '@/lib/auth/utils';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/imports/batches/[id]
 * Get batch details with creator info
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(['admin']);
    const tenantId = await getTenantId();
    const { id } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    await setRLSContext(db);

    // Get batch with creator info
    const [batch] = await db
      .select({
        id: uploadBatches.id,
        tenantId: uploadBatches.tenantId,
        fileType: uploadBatches.fileType,
        fileName: uploadBatches.fileName,
        status: uploadBatches.status,
        totalRows: uploadBatches.totalRows,
        validRows: uploadBatches.validRows,
        invalidRows: uploadBatches.invalidRows,
        ambiguousRows: uploadBatches.ambiguousRows,
        newRows: uploadBatches.newRows,
        updateRows: uploadBatches.updateRows,
        excludedRows: uploadBatches.excludedRows,
        reviewOutcome: uploadBatches.reviewOutcome,
        reviewComment: uploadBatches.reviewComment,
        ignoredColumns: uploadBatches.ignoredColumns,
        parseError: uploadBatches.parseError,
        createdBy: uploadBatches.createdBy,
        createdAt: uploadBatches.createdAt,
        appliedBy: uploadBatches.appliedBy,
        appliedAt: uploadBatches.appliedAt,
        updatedAt: uploadBatches.updatedAt,
        creatorName: users.name,
        creatorEmail: users.email,
      })
      .from(uploadBatches)
      .leftJoin(users, eq(uploadBatches.createdBy, users.id))
      .where(and(eq(uploadBatches.id, id), eq(uploadBatches.tenantId, tenantId)))
      .limit(1);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    return NextResponse.json({ batch });
  } catch (error) {
    console.error('[GET /api/imports/batches/[id]] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
