/**
 * Imports Batches API
 * GET /api/imports/batches - List all batches
 * POST /api/imports/batches - Upload new file and create batch
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  uploadBatches,
  stgRows,
  proposedChanges,
  BATCH_STATUS,
  ROW_STATUS,
  CHANGE_ACTION,
} from '@/db/schema/imports';
import { requireAuth, getTenantId, setRLSContext } from '@/lib/auth/utils';
import { desc, eq, and } from 'drizzle-orm';
import { parseClassesFile, validateFileType, type ParsedRow } from '@/lib/imports/parser';
import { processRowsForMatching } from '@/lib/imports/matcher';

/**
 * GET /api/imports/batches
 * List all import batches for the current tenant
 */
export async function GET() {
  try {
    const user = await requireAuth(['admin']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    await setRLSContext(db);

    const batches = await db
      .select({
        id: uploadBatches.id,
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
        createdBy: uploadBatches.createdBy,
        createdAt: uploadBatches.createdAt,
        appliedAt: uploadBatches.appliedAt,
      })
      .from(uploadBatches)
      .where(eq(uploadBatches.tenantId, tenantId))
      .orderBy(desc(uploadBatches.createdAt))
      .limit(100);

    return NextResponse.json({ batches, user: user.email });
  } catch (error) {
    console.error('[GET /api/imports/batches] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/imports/batches
 * Upload a new file and create import batch
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(['admin']);
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    await setRLSContext(db);

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type and size
    const validation = validateFileType(file.name, file.size);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Create batch record in RECEIVED status
    const [batch] = await db
      .insert(uploadBatches)
      .values({
        tenantId,
        fileType: 'classes',
        fileName: file.name,
        status: BATCH_STATUS.RECEIVED,
        createdBy: user.id,
      })
      .returning();

    // Update to PARSING
    await db
      .update(uploadBatches)
      .set({ status: BATCH_STATUS.PARSING })
      .where(eq(uploadBatches.id, batch.id));

    try {
      // Parse the file
      const fileBuffer = await file.arrayBuffer();
      const parseResult = await parseClassesFile(fileBuffer);

      if (!parseResult.success) {
        // Failed validation - update batch and return
        await db
          .update(uploadBatches)
          .set({
            status: BATCH_STATUS.FAILED_VALIDATION,
            parseError: parseResult.error,
          })
          .where(eq(uploadBatches.id, batch.id));

        return NextResponse.json(
          {
            batchId: batch.id,
            status: BATCH_STATUS.FAILED_VALIDATION,
            error: parseResult.error,
          },
          { status: 400 }
        );
      }

      // Store staged rows
      const stgRowValues = parseResult.rows.map((row: ParsedRow) => ({
        tenantId,
        batchId: batch.id,
        rowNumber: row.rowNumber,
        rowStatus: row.isValid ? ROW_STATUS.VALID : ROW_STATUS.INVALID,
        rawData: row.rawData,
        parsedData: row.parsedData,
        validationErrors: row.validationErrors,
      }));

      const insertedRows = await db.insert(stgRows).values(stgRowValues).returning();

      // Process rows for matching (only valid rows)
      const validRows = parseResult.rows.filter((r: ParsedRow) => r.isValid);
      const matchResults = await processRowsForMatching(tenantId, validRows);

      // Update staged rows with match results and create proposed changes
      for (const result of matchResults.rowResults) {
        const stgRow = insertedRows.find(r => r.rowNumber === result.rowNumber);
        if (!stgRow) continue;

        // Update row status if ambiguous
        if (result.rowStatus === 'AMBIGUOUS') {
          await db
            .update(stgRows)
            .set({
              rowStatus: ROW_STATUS.AMBIGUOUS,
              matchCandidates: result.matchResult.candidates,
            })
            .where(eq(stgRows.id, stgRow.id));
        }

        // Create proposed change
        await db.insert(proposedChanges).values({
          tenantId,
          batchId: batch.id,
          stgRowId: stgRow.id,
          action: result.action,
          targetEnrollmentId: result.matchResult.bestMatch?.enrollmentId || null,
          diff: result.diff || null,
        });
      }

      // Count invalid rows from parse
      const invalidCount = parseResult.invalidRows;

      // Compute final counts
      const finalCounts = {
        totalRows: parseResult.totalRows,
        validRows: matchResults.counts.valid,
        invalidRows: invalidCount,
        ambiguousRows: matchResults.counts.ambiguous,
        newRows: matchResults.counts.inserts,
        updateRows: matchResults.counts.updates,
        excludedRows: 0,
      };

      // Determine final status
      const hasIssues = finalCounts.invalidRows > 0 || finalCounts.ambiguousRows > 0;
      const finalStatus = hasIssues ? BATCH_STATUS.PROPOSED_NEEDS_REVIEW : BATCH_STATUS.PROPOSED_OK;

      // Update batch with final status and counts
      await db
        .update(uploadBatches)
        .set({
          status: finalStatus,
          ...finalCounts,
          ignoredColumns: parseResult.ignoredColumns,
        })
        .where(eq(uploadBatches.id, batch.id));

      return NextResponse.json({
        batchId: batch.id,
        status: finalStatus,
        counts: finalCounts,
        ignoredColumns: parseResult.ignoredColumns,
      });
    } catch (parseError) {
      // System error during processing
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
      await db
        .update(uploadBatches)
        .set({
          status: BATCH_STATUS.FAILED_SYSTEM,
          parseError: errorMessage,
        })
        .where(eq(uploadBatches.id, batch.id));

      return NextResponse.json(
        {
          batchId: batch.id,
          status: BATCH_STATUS.FAILED_SYSTEM,
          error: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[POST /api/imports/batches] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
