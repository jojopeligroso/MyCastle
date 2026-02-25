/**
 * Import Apply Service - OPTIMIZED VERSION
 * Key changes:
 * 1. Pre-fetch all classes in single query
 * 2. Batch insert users, students, enrollments
 * 3. Reduce transaction round-trips from ~1000 to ~10
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

export interface ApplyResult {
  success: boolean;
  appliedCount: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
  enrollmentIds: string[];
}

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

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * OPTIMIZED: Apply batch changes with batch DB operations
 */
export async function applyBatchChanges(
  batchId: string,
  tenantId: string,
  appliedBy: string
): Promise<ApplyResult> {
  console.time('applyBatchChanges');

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

  await db
    .update(uploadBatches)
    .set({ status: BATCH_STATUS.APPLYING })
    .where(and(eq(uploadBatches.id, batchId), eq(uploadBatches.tenantId, tenantId)));

  try {
    const result = await db.transaction(async (tx: Transaction) => {
      const enrollmentIds: string[] = [];
      let insertedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      // Get all non-excluded proposed changes
      console.time('fetchChanges');
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
      console.timeEnd('fetchChanges');

      const insertChanges = changes.filter(c => c.action === CHANGE_ACTION.INSERT);
      const updateChanges = changes.filter(c => c.action === CHANGE_ACTION.UPDATE);
      const noopChanges = changes.filter(c => c.action === CHANGE_ACTION.NOOP);

      // Get staging rows for INSERTs
      console.time('fetchStagingRows');
      const stgRowIds = insertChanges.map(c => c.stgRowId);
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
      console.timeEnd('fetchStagingRows');

      // OPTIMIZATION 1: Pre-fetch ALL classes for tenant in single query
      console.time('prefetchClasses');
      const allClasses = await tx
        .select({ id: classes.id, name: classes.name })
        .from(classes)
        .where(eq(classes.tenantId, tenantId));
      const classMap = new Map(allClasses.map(c => [c.name.toLowerCase(), c.id]));
      console.timeEnd('prefetchClasses');
      console.log(`Prefetched ${allClasses.length} classes`);

      // Prepare batch data for inserts
      console.time('prepareInsertData');
      const usersToInsert: Array<{
        tenantId: string;
        email: string;
        name: string;
        role: string;
        status: string;
        metadata: Record<string, unknown>;
      }> = [];

      const insertMetadata: Array<{
        changeId: string;
        classId: string;
        parsedData: Record<string, unknown>;
        userIndex: number;
      }> = [];

      for (const change of insertChanges) {
        const stgRow = stagingRowMap.get(change.stgRowId);
        if (!stgRow?.parsedData) {
          errors.push(`Missing parsed data for row ${change.stgRowId}`);
          skippedCount++;
          continue;
        }

        if (stgRow.linkedEnrollmentId) {
          enrollmentIds.push(stgRow.linkedEnrollmentId);
          skippedCount++;
          continue;
        }

        const parsed = stgRow.parsedData as {
          studentName: string;
          className: string;
          startDate: string;
          endDate?: string;
          course?: string;
          weeks?: number;
          isVisaStudent?: boolean;
          includeOnRegister?: boolean;
        };

        const classId = classMap.get(parsed.className.toLowerCase());
        if (!classId) {
          errors.push(`Class not found: ${parsed.className}`);
          skippedCount++;
          continue;
        }

        // Generate provisional email with unique offset
        const nameParts = parsed.studentName.trim().toLowerCase().split(/\s+/);
        const firstName = nameParts[0] || 'unknown';
        const lastName = nameParts[nameParts.length - 1] || 'student';
        const timestamp = Date.now() + usersToInsert.length; // Ensure unique
        const provisionalEmail = `${firstName}.${lastName}.${timestamp}@provisional.import`;

        usersToInsert.push({
          tenantId,
          email: provisionalEmail,
          name: parsed.studentName,
          role: 'student',
          status: 'active',
          metadata: {
            provisionalImport: true,
            importedAt: new Date().toISOString(),
            includeOnRegister: parsed.includeOnRegister ?? true,
          },
        });

        insertMetadata.push({
          changeId: change.id,
          classId,
          parsedData: stgRow.parsedData as Record<string, unknown>,
          userIndex: usersToInsert.length - 1,
        });
      }
      console.timeEnd('prepareInsertData');
      console.log(`Prepared ${usersToInsert.length} users for batch insert`);

      // OPTIMIZATION 2: Batch insert users
      let insertedUsers: { id: string }[] = [];
      if (usersToInsert.length > 0) {
        console.time('batchInsertUsers');
        insertedUsers = await tx.insert(users).values(usersToInsert).returning({ id: users.id });
        console.timeEnd('batchInsertUsers');
        console.log(`Batch inserted ${insertedUsers.length} users`);
      }

      // OPTIMIZATION 3: Batch insert students
      if (insertedUsers.length > 0) {
        console.time('batchInsertStudents');
        const studentsToInsert = insertedUsers.map((u, i) => {
          const meta = insertMetadata[i];
          const parsed = meta.parsedData as { isVisaStudent?: boolean };
          return {
            tenantId,
            userId: u.id,
            status: 'active' as const,
            isVisaStudent: parsed.isVisaStudent ?? false,
          };
        });
        await tx.insert(students).values(studentsToInsert);
        console.timeEnd('batchInsertStudents');
        console.log(`Batch inserted ${studentsToInsert.length} students`);
      }

      // OPTIMIZATION 4: Batch insert enrollments
      if (insertedUsers.length > 0) {
        console.time('batchInsertEnrollments');
        const enrollmentsToInsert = insertedUsers.map((u, i) => {
          const meta = insertMetadata[i];
          const parsed = meta.parsedData as {
            startDate: string;
            endDate?: string;
            weeks?: number;
          };
          return {
            tenantId,
            studentId: u.id,
            classId: meta.classId,
            enrollmentDate: parsed.startDate,
            expectedEndDate: parsed.endDate || null,
            bookedWeeks: parsed.weeks || null,
            status: 'active' as const,
          };
        });
        const insertedEnrollments = await tx
          .insert(enrollments)
          .values(enrollmentsToInsert)
          .returning({ id: enrollments.id });
        enrollmentIds.push(...insertedEnrollments.map(e => e.id));
        insertedCount = insertedEnrollments.length;
        console.timeEnd('batchInsertEnrollments');
        console.log(`Batch inserted ${insertedEnrollments.length} enrollments`);
      }

      // Process UPDATEs (still sequential for diff application)
      console.time('processUpdates');
      for (const change of updateChanges) {
        if (!change.targetEnrollmentId) {
          errors.push(`Missing target enrollment for UPDATE`);
          skippedCount++;
          continue;
        }

        const diff = change.diff as Record<string, { old: unknown; new: unknown }> | null;
        if (!diff || Object.keys(diff).length === 0) {
          skippedCount++;
          continue;
        }

        const updateValues: Record<string, unknown> = {};
        if (diff.startDate) updateValues.enrollmentDate = diff.startDate.new;
        if (diff.endDate) updateValues.expectedEndDate = diff.endDate.new;

        if (Object.keys(updateValues).length > 0) {
          await tx
            .update(enrollments)
            .set(updateValues)
            .where(
              and(eq(enrollments.id, change.targetEnrollmentId), eq(enrollments.tenantId, tenantId))
            );
        }

        enrollmentIds.push(change.targetEnrollmentId);
        updatedCount++;
      }
      console.timeEnd('processUpdates');
      console.log(`Processed ${updatedCount} updates`);

      // Process NOOPs
      for (const change of noopChanges) {
        if (change.targetEnrollmentId) {
          enrollmentIds.push(change.targetEnrollmentId);
        }
        skippedCount++;
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

    await db
      .update(uploadBatches)
      .set({ status: BATCH_STATUS.APPLIED, appliedBy, appliedAt: new Date() })
      .where(and(eq(uploadBatches.id, batchId), eq(uploadBatches.tenantId, tenantId)));

    console.timeEnd('applyBatchChanges');
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await db
      .update(uploadBatches)
      .set({ status: BATCH_STATUS.FAILED_SYSTEM, parseError: `Apply failed: ${errorMsg}` })
      .where(and(eq(uploadBatches.id, batchId), eq(uploadBatches.tenantId, tenantId)));
    console.timeEnd('applyBatchChanges');
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

// Keep updateBatchCounts unchanged
export async function updateBatchCounts(batchId: string, tenantId: string): Promise<void> {
  const counts = await db
    .select({ rowStatus: stgRows.rowStatus, count: sql<number>`COUNT(*)::int` })
    .from(stgRows)
    .where(and(eq(stgRows.batchId, batchId), eq(stgRows.tenantId, tenantId)))
    .groupBy(stgRows.rowStatus);

  const countMap: Record<string, number> = {};
  for (const c of counts) countMap[c.rowStatus] = c.count;

  const actionCounts = await db
    .select({ action: proposedChanges.action, count: sql<number>`COUNT(*)::int` })
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
  for (const c of actionCounts) actionMap[c.action] = c.count;

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
