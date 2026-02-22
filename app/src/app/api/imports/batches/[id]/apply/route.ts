/**
 * Imports Batch Apply API
 * POST /api/imports/batches/[id]/apply - Apply batch changes transactionally
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getTenantId, setRLSContext } from '@/lib/auth/utils';
import { applyBatchChanges } from '@/lib/imports/apply-service';
import { db } from '@/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/imports/batches/[id]/apply
 * Apply all proposed changes transactionally
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(['admin']);
    const tenantId = await getTenantId();
    const { id } = await params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    await setRLSContext(db);

    // Apply changes using the service
    const result = await applyBatchChanges(id, tenantId, user.id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      appliedCount: result.appliedCount,
      insertedCount: result.insertedCount,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
      enrollmentIds: result.enrollmentIds,
    });
  } catch (error) {
    console.error('[POST /api/imports/batches/[id]/apply] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
