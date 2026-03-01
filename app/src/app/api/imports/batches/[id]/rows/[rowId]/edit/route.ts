/**
 * Row Edit API
 * PATCH /api/imports/batches/[id]/rows/[rowId]/edit
 * Save admin edits to a row's field values
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { stgRows, uploadBatches } from '@/db/schema/imports';
import { requireAuth, getTenantId, setRLSContext, getUserId } from '@/lib/auth/utils';
import { eq, and } from 'drizzle-orm';
import { getEditableFields } from '@/lib/imports/schema-registry';

interface RouteParams {
  params: Promise<{ id: string; rowId: string }>;
}

/**
 * PATCH /api/imports/batches/[id]/rows/[rowId]/edit
 * Save admin edits to row data
 * Body: { fieldName: newValue, ... }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(['admin']);
    const tenantId = await getTenantId();
    const userId = await getUserId();
    const { id: batchId, rowId } = await params;

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Context required' }, { status: 400 });
    }

    await setRLSContext(db);

    // Verify batch exists and is editable
    const [batch] = await db
      .select({ id: uploadBatches.id, status: uploadBatches.status })
      .from(uploadBatches)
      .where(and(eq(uploadBatches.id, batchId), eq(uploadBatches.tenantId, tenantId)))
      .limit(1);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Don't allow edits on terminal batches
    const terminalStatuses = ['APPLIED', 'REJECTED', 'FAILED_VALIDATION', 'FAILED_SYSTEM'];
    if (terminalStatuses.includes(batch.status)) {
      return NextResponse.json({ error: 'Cannot modify rows in a terminal batch' }, { status: 400 });
    }

    // Get current row
    const [row] = await db
      .select({ id: stgRows.id, editedData: stgRows.editedData })
      .from(stgRows)
      .where(and(eq(stgRows.id, rowId), eq(stgRows.batchId, batchId), eq(stgRows.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }

    // Parse request body
    const edits = await request.json();

    if (!edits || typeof edits !== 'object' || Object.keys(edits).length === 0) {
      return NextResponse.json({ error: 'No edits provided' }, { status: 400 });
    }

    // Validate that only editable fields are being modified
    const editableFieldNames = new Set(getEditableFields().map((f) => f.name));
    const invalidFields = Object.keys(edits).filter((key) => !editableFieldNames.has(key));

    if (invalidFields.length > 0) {
      return NextResponse.json(
        { error: `Cannot edit non-editable fields: ${invalidFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Merge edits with existing editedData
    const existingEdits = (row.editedData as Record<string, unknown>) || {};
    const mergedEdits = { ...existingEdits, ...edits };

    // Remove null values (reset to original)
    for (const key of Object.keys(mergedEdits)) {
      if (mergedEdits[key] === null) {
        delete mergedEdits[key];
      }
    }

    // Update row
    await db
      .update(stgRows)
      .set({
        editedData: Object.keys(mergedEdits).length > 0 ? mergedEdits : null,
        editedAt: new Date(),
        editedBy: userId,
        updatedAt: new Date(),
      })
      .where(and(eq(stgRows.id, rowId), eq(stgRows.tenantId, tenantId)));

    return NextResponse.json({
      success: true,
      rowId,
      editedData: mergedEdits,
    });
  } catch (error) {
    console.error('[PATCH /api/imports/batches/[id]/rows/[rowId]/edit] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
