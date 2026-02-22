/**
 * Import Apply Service
 * Applies proposed changes transactionally
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

import { db } from '@/db';
import {
  uploadBatches,
  stgRows,
  proposedChanges,
  BATCH_STATUS,
  CHANGE_ACTION,
} from '@/db/schema/imports';
import { enrollments, users, classes, students } from '@/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { canApply, type BatchSummary } from './state-machine';

/**
 * Apply result
 */
export interface ApplyResult {
  success: boolean;
  appliedCount: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
  enrollmentIds: string[];
}

/**
 * Get batch summary for gating checks
 */
export async function getBatchSummary(
  batchId: string,
  tenantId: string
): Promise<BatchSummary | null> {
  const [batch] = await db
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
    .where(and(eq(uploadBatches.id, batchId), eq(uploadBatches.tenantId, tenantId)))
    .limit(1);

  if (!batch) return null;

  return {
    status: batch.status as BatchSummary['status'],
    invalidRows: batch.invalidRows,
    ambiguousRows: batch.ambiguousRows,
    excludedRows: batch.excludedRows,
    validRows: batch.validRows,
    totalRows: batch.totalRows,
    reviewOutcome: batch.reviewOutcome as BatchSummary['reviewOutcome'],
  };
}

/**
 * Transaction type for Drizzle
 */
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Create provisional student for INSERT actions
 * Generates email: firstName.lastName.timestamp@provisional.import
 */
async function createProvisionalStudent(
  tenantId: string,
  studentName: string,
  tx: Transaction
): Promise<string> {
  // Generate provisional email
  const nameParts = studentName.trim().toLowerCase().split(/\s+/);
  const firstName = nameParts[0] || 'unknown';
  const lastName = nameParts[nameParts.length - 1] || 'student';
  const timestamp = Date.now();
  const provisionalEmail = `${firstName}.${lastName}.${timestamp}@provisional.import`;

  // Create user record
  const [newUser] = await tx
    .insert(users)
    .values({
      tenantId,
      email: provisionalEmail,
      name: studentName,
      primaryRole: 'student',
      status: 'provisional', // Special status for provisional students
      metadata: { provisionalImport: true, importedAt: new Date().toISOString() },
    })
    .returning({ id: users.id });

  // Create student record
  await tx.insert(students).values({
    tenantId,
    userId: newUser.id,
    status: 'provisional',
  });

  return newUser.id;
}

/**
 * Apply batch changes transactionally
 * All-or-nothing: rolls back on any error
 */
export async function applyBatchChanges(
  batchId: string,
  tenantId: string,
  appliedBy: string
): Promise<ApplyResult> {
  // First, check gating rules
  const batchSummary = await getBatchSummary(batchId, tenantId);
  if (!batchSummary) {
    return {
      success: false,
      appliedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: ['Batch not found'],
      enrollmentIds: [],
    };
  }

  const gateCheck = canApply(batchSummary);
  if (!gateCheck.allowed) {
    return {
      success: false,
      appliedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: gateCheck.reasons,
      enrollmentIds: [],
    };
  }

  // Set status to APPLYING
  await db
    .update(uploadBatches)
    .set({ status: BATCH_STATUS.APPLYING })
    .where(and(eq(uploadBatches.id, batchId), eq(uploadBatches.tenantId, tenantId)));

  try {
    // Execute in transaction
    const result = await db.transaction(async tx => {
      const enrollmentIds: string[] = [];
      let insertedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      // Get all non-excluded proposed changes
      const changes = await tx
        .select({
          id: proposedChanges.id,
          action: proposedChanges.action,
          targetEnrollmentId: proposedChanges.targetEnrollmentId,
          diff: proposedChanges.diff,
          stgRowId: proposedChanges.stgRowId,
        })
        .from(proposedChanges)
        .where(
          and(
            eq(proposedChanges.batchId, batchId),
            eq(proposedChanges.tenantId, tenantId),
            eq(proposedChanges.isExcluded, false)
          )
        );

      // Get staging rows for INSERT actions (need parsed data)
      const stgRowIds = changes.filter(c => c.action === CHANGE_ACTION.INSERT).map(c => c.stgRowId);

      const stagingRows =
        stgRowIds.length > 0
          ? await tx
              .select({
                id: stgRows.id,
                parsedData: stgRows.parsedData,
                linkedEnrollmentId: stgRows.linkedEnrollmentId,
              })
              .from(stgRows)
              .where(inArray(stgRows.id, stgRowIds))
          : [];

      const stagingRowMap = new Map(stagingRows.map(r => [r.id, r]));

      for (const change of changes) {
        try {
          if (change.action === CHANGE_ACTION.INSERT) {
            // Get parsed data from staging row
            const stgRow = stagingRowMap.get(change.stgRowId);
            if (!stgRow?.parsedData) {
              errors.push(`Missing parsed data for row ${change.stgRowId}`);
              skippedCount++;
              continue;
            }

            const parsed = stgRow.parsedData as {
              studentName: string;
              className: string;
              startDate: string;
              endDate?: string;
            };

            // Check if resolved to existing enrollment (linked)
            if (stgRow.linkedEnrollmentId) {
              // This was resolved by linking to existing - skip insert
              enrollmentIds.push(stgRow.linkedEnrollmentId);
              skippedCount++;
              continue;
            }

            // Find or create class
            const [classRecord] = await tx
              .select({ id: classes.id })
              .from(classes)
              .where(
                and(
                  eq(classes.tenantId, tenantId),
                  sql`LOWER(${classes.name}) = LOWER(${parsed.className})`
                )
              )
              .limit(1);

            if (!classRecord) {
              errors.push(`Class not found: ${parsed.className}`);
              skippedCount++;
              continue;
            }

            // Create provisional student
            const studentId = await createProvisionalStudent(tenantId, parsed.studentName, tx);

            // Create enrollment
            const [newEnrollment] = await tx
              .insert(enrollments)
              .values({
                tenantId,
                studentId,
                classId: classRecord.id,
                enrollmentDate: parsed.startDate,
                expectedEndDate: parsed.endDate || null,
                status: 'active',
              })
              .returning({ id: enrollments.id });

            enrollmentIds.push(newEnrollment.id);
            insertedCount++;
          } else if (change.action === CHANGE_ACTION.UPDATE) {
            if (!change.targetEnrollmentId) {
              errors.push(`Missing target enrollment for UPDATE`);
              skippedCount++;
              continue;
            }

            const diff = change.diff as Record<string, { old: unknown; new: unknown }> | null;
            if (!diff || Object.keys(diff).length === 0) {
              // No changes to apply
              skippedCount++;
              continue;
            }

            // Build update object
            const updateValues: Record<string, unknown> = {};

            if (diff.startDate) {
              updateValues.enrollmentDate = diff.startDate.new;
            }
            if (diff.endDate) {
              updateValues.expectedEndDate = diff.endDate.new;
            }

            // Note: Student name and class changes would require more complex logic
            // For MVP, we only update enrollment date fields
            if (Object.keys(updateValues).length > 0) {
              await tx
                .update(enrollments)
                .set(updateValues)
                .where(
                  and(
                    eq(enrollments.id, change.targetEnrollmentId),
                    eq(enrollments.tenantId, tenantId)
                  )
                );
            }

            enrollmentIds.push(change.targetEnrollmentId);
            updatedCount++;
          } else if (change.action === CHANGE_ACTION.NOOP) {
            // No operation needed
            if (change.targetEnrollmentId) {
              enrollmentIds.push(change.targetEnrollmentId);
            }
            skippedCount++;
          }
          // NEEDS_RESOLUTION should not reach here (would fail gate check)
        } catch (changeError) {
          const errorMsg = changeError instanceof Error ? changeError.message : 'Unknown error';
          errors.push(`Error processing change ${change.id}: ${errorMsg}`);
          throw changeError; // Re-throw to trigger rollback
        }
      }

      return {
        success: true,
        appliedCount: insertedCount + updatedCount,
        insertedCount,
        updatedCount,
        skippedCount,
        errors,
        enrollmentIds,
      };
    });

    // Transaction succeeded - update batch status to APPLIED
    await db
      .update(uploadBatches)
      .set({
        status: BATCH_STATUS.APPLIED,
        appliedBy,
        appliedAt: new Date(),
      })
      .where(and(eq(uploadBatches.id, batchId), eq(uploadBatches.tenantId, tenantId)));

    return result;
  } catch (error) {
    // Transaction failed - update batch status to FAILED_SYSTEM
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    await db
      .update(uploadBatches)
      .set({
        status: BATCH_STATUS.FAILED_SYSTEM,
        parseError: `Apply failed: ${errorMsg}`,
      })
      .where(and(eq(uploadBatches.id, batchId), eq(uploadBatches.tenantId, tenantId)));

    return {
      success: false,
      appliedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: [errorMsg],
      enrollmentIds: [],
    };
  }
}

/**
 * Update batch counts after row changes
 * Called after excluding/resolving rows
 */
export async function updateBatchCounts(batchId: string, tenantId: string): Promise<void> {
  // Count rows by status
  const counts = await db
    .select({
      rowStatus: stgRows.rowStatus,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(stgRows)
    .where(and(eq(stgRows.batchId, batchId), eq(stgRows.tenantId, tenantId)))
    .groupBy(stgRows.rowStatus);

  const countMap: Record<string, number> = {};
  for (const c of counts) {
    countMap[c.rowStatus] = c.count;
  }

  // Count actions from proposed changes (excluding excluded)
  const actionCounts = await db
    .select({
      action: proposedChanges.action,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(proposedChanges)
    .where(
      and(
        eq(proposedChanges.batchId, batchId),
        eq(proposedChanges.tenantId, tenantId),
        eq(proposedChanges.isExcluded, false)
      )
    )
    .groupBy(proposedChanges.action);

  const actionMap: Record<string, number> = {};
  for (const c of actionCounts) {
    actionMap[c.action] = c.count;
  }

  // Update batch
  await db
    .update(uploadBatches)
    .set({
      validRows: countMap['VALID'] || 0,
      invalidRows: countMap['INVALID'] || 0,
      ambiguousRows: countMap['AMBIGUOUS'] || 0,
      excludedRows: countMap['EXCLUDED'] || 0,
      newRows: actionMap[CHANGE_ACTION.INSERT] || 0,
      updateRows: actionMap[CHANGE_ACTION.UPDATE] || 0,
    })
    .where(and(eq(uploadBatches.id, batchId), eq(uploadBatches.tenantId, tenantId)));
}
