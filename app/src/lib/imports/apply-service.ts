/**
 * Import Apply Service - OPTIMIZED VERSION
 * Key changes:
 * 1. Pre-fetch all classes, courses, agencies, accommodation_types in single queries
 * 2. Batch insert users, students, bookings, enrollments
 * 3. Reduce transaction round-trips from ~1000 to ~10
 * 4. Multi-table operations per comprehensive import plan
 * 5. Only update explicit fields (preserve existing data)
 */

import { db } from '@/db';
import {
  uploadBatches,
  stgRows,
  proposedChanges,
  BATCH_STATUS,
  CHANGE_ACTION,
  ROW_CONFIRMATION,
} from '@/db/schema/imports';
import { enrollments, classes } from '@/db/schema';
import { users, students } from '@/db/schema/core';
import { bookings, courses, agencies, accommodationTypes } from '@/db/schema/business';
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

      // Get all non-excluded, non-quarantined proposed changes
      // Only process rows that are confirmed (or pending for backwards compatibility)
      console.time('fetchChanges');
      const changes = await tx
        .select({
          id: proposedChanges.id,
          action: proposedChanges.action,
          targetEnrollmentId: proposedChanges.targetEnrollmentId,
          diff: proposedChanges.diff,
          stgRowId: proposedChanges.stgRowId,
          // Include confirmation status to filter
          confirmation: stgRows.confirmation,
        })
        .from(proposedChanges)
        .innerJoin(stgRows, eq(proposedChanges.stgRowId, stgRows.id))
        .where(
          and(
            eq(proposedChanges.batchId, batchId),
            eq(proposedChanges.tenantId, tenantId),
            eq(proposedChanges.isExcluded, false),
            // Skip quarantined rows
            sql`${stgRows.confirmation} != ${ROW_CONFIRMATION.QUARANTINED}`
          )
        );
      console.timeEnd('fetchChanges');

      const insertChanges = changes.filter(c => c.action === CHANGE_ACTION.INSERT);
      const updateChanges = changes.filter(c => c.action === CHANGE_ACTION.UPDATE);
      const noopChanges = changes.filter(c => c.action === CHANGE_ACTION.NOOP);

      // Get staging rows for INSERTs (including editedData for admin overrides)
      console.time('fetchStagingRows');
      const stgRowIds = insertChanges.map(c => c.stgRowId);
      const stagingRows =
        stgRowIds.length > 0
          ? await tx
              .select({
                id: stgRows.id,
                parsedData: stgRows.parsedData,
                editedData: stgRows.editedData,
                linkedEnrollmentId: stgRows.linkedEnrollmentId,
              })
              .from(stgRows)
              .where(inArray(stgRows.id, stgRowIds))
          : [];
      const stagingRowMap = new Map(stagingRows.map(r => [r.id, r]));
      console.timeEnd('fetchStagingRows');

      // OPTIMIZATION 1: Pre-fetch ALL lookup tables for tenant in single queries
      console.time('prefetchLookups');

      // Classes
      const allClasses = await tx
        .select({ id: classes.id, name: classes.name })
        .from(classes)
        .where(eq(classes.tenantId, tenantId));
      const classMap = new Map(allClasses.map(c => [c.name.toLowerCase(), c.id]));

      // Courses
      const allCourses = await tx
        .select({ id: courses.id, name: courses.name })
        .from(courses)
        .where(eq(courses.tenantId, tenantId));
      const courseMap = new Map(allCourses.map(c => [c.name.toLowerCase(), c.id]));

      // Agencies
      const allAgencies = await tx
        .select({ id: agencies.id, name: agencies.name })
        .from(agencies)
        .where(eq(agencies.tenantId, tenantId));
      const agencyMap = new Map(allAgencies.map(a => [a.name.toLowerCase(), a.id]));

      // Accommodation Types
      const allAccommodationTypes = await tx
        .select({ id: accommodationTypes.id, name: accommodationTypes.name })
        .from(accommodationTypes)
        .where(eq(accommodationTypes.tenantId, tenantId));
      const accommodationTypeMap = new Map(
        allAccommodationTypes.map(a => [a.name.toLowerCase(), a.id])
      );

      console.timeEnd('prefetchLookups');
      console.log(
        `Prefetched: ${allClasses.length} classes, ${allCourses.length} courses, ` +
          `${allAgencies.length} agencies, ${allAccommodationTypes.length} accommodation types`
      );

      // Helper: Get effective value (editedData takes precedence over parsedData)
      const getEffectiveValue = <T>(
        stgRow: {
          parsedData: Record<string, unknown> | null;
          editedData?: Record<string, unknown> | null;
        },
        fieldName: string
      ): T | null => {
        if (stgRow.editedData && stgRow.editedData[fieldName] !== undefined) {
          return stgRow.editedData[fieldName] as T;
        }
        if (stgRow.parsedData && stgRow.parsedData[fieldName] !== undefined) {
          return stgRow.parsedData[fieldName] as T;
        }
        return null;
      };

      // Prepare batch data for inserts - handle all 27 columns
      console.time('prepareInsertData');

      // Extended user insert type with new fields
      const usersToInsert: Array<{
        tenantId: string;
        email: string;
        name: string | null;
        role: string;
        isActive: boolean;
        metadata: Record<string, unknown>;
        // New fields per plan
        nationality?: string | null;
        visaType?: string | null;
      }> = [];

      // Extended metadata for linking inserts across tables
      const insertMetadata: Array<{
        changeId: string;
        classId: string | undefined;
        courseId: string | undefined;
        agencyId: string | undefined;
        accommodationTypeId: string | undefined;
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

        // Build effective data object using editedData overrides
        // This allows admin edits to take precedence over parsed values
        const getVal = <T>(field: string): T | null => getEffectiveValue<T>(stgRow, field);

        // Get name from new or legacy field (using effective values)
        const studentName = getVal<string>('name') || getVal<string>('studentName');
        if (!studentName) {
          errors.push(`Missing student name for row`);
          skippedCount++;
          continue;
        }

        // Lookup class (optional - class may be assigned later)
        // Use effective values (edited overrides parsed)
        const className = getVal<string>('className');
        const classId = className ? classMap.get(className.toLowerCase()) : null;

        // Lookup course (using effective values)
        const courseName = getVal<string>('courseName') || getVal<string>('course');
        const courseId = courseName ? courseMap.get(courseName.toLowerCase()) : null;

        // Lookup agency (handle "Direct" as null, using effective values)
        const agencyName = getVal<string>('agencyName');
        const isDirectSale =
          !agencyName ||
          agencyName.toLowerCase() === 'direct' ||
          agencyName.toLowerCase() === 'direct sale';
        const agencyId =
          !isDirectSale && agencyName ? agencyMap.get(agencyName.toLowerCase()) : null;

        // Lookup accommodation type (using effective values)
        const accomTypeName = getVal<string>('accommodationType');
        const accommodationTypeId = accomTypeName
          ? accommodationTypeMap.get(accomTypeName.toLowerCase())
          : null;

        // Generate provisional email with unique offset
        const nameParts = studentName.trim().toLowerCase().split(/\s+/);
        const firstName = nameParts[0] || 'unknown';
        const lastName = nameParts[nameParts.length - 1] || 'student';
        const timestamp = Date.now() + usersToInsert.length; // Ensure unique
        const provisionalEmail = `${firstName}.${lastName}.${timestamp}@provisional.import`;

        usersToInsert.push({
          tenantId,
          email: provisionalEmail,
          name: studentName,
          role: 'student',
          isActive: true,
          nationality: getVal<string>('nationality') || null,
          visaType: getVal<string>('visaType') || null,
          metadata: {
            provisionalImport: true,
            importedAt: new Date().toISOString(),
            includeOnRegister: getVal<boolean>('includeOnRegister') ?? true,
            dateOfBirth: getVal<string>('dateOfBirth') || null,
          },
        });

        // Build effective data combining parsed + edited for downstream processing
        const effectiveData: Record<string, unknown> = {
          ...(stgRow.parsedData || {}),
          ...(stgRow.editedData || {}),
        };

        insertMetadata.push({
          changeId: change.id,
          classId: classId || undefined,
          courseId: courseId || undefined,
          agencyId: agencyId || undefined,
          accommodationTypeId: accommodationTypeId || undefined,
          parsedData: effectiveData,
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

      // OPTIMIZATION 3: Batch insert students with visa info
      let insertedStudents: { id: string }[] = [];
      if (insertedUsers.length > 0) {
        console.time('batchInsertStudents');
        const studentsToInsert = insertedUsers.map((u, i) => {
          const meta = insertMetadata[i];
          const parsed = meta.parsedData as {
            isVisaStudent?: boolean | null;
            visaType?: string | null;
          };
          return {
            tenantId,
            userId: u.id,
            status: 'active' as const,
            isVisaStudent: parsed.isVisaStudent ?? false,
            visaType: parsed.visaType || null,
          };
        });
        insertedStudents = await tx
          .insert(students)
          .values(studentsToInsert)
          .returning({ id: students.id });
        console.timeEnd('batchInsertStudents');
        console.log(`Batch inserted ${insertedStudents.length} students`);
      }

      // OPTIMIZATION 4: Batch insert bookings (financial records)
      // Note: Only create bookings when course is assigned (bookings require courseId)
      if (insertedStudents.length > 0) {
        console.time('batchInsertBookings');
        const bookingsToInsert: Array<Record<string, unknown>> = [];

        for (let i = 0; i < insertedStudents.length; i++) {
          const studentRecord = insertedStudents[i];
          const meta = insertMetadata[i];
          const parsed = meta.parsedData as {
            courseStartDate?: string | null;
            startDate?: string | null;
            courseEndDate?: string | null;
            endDate?: string | null;
            weeks?: number | null;
            saleDate?: string | null;
            placementTestScore?: string | null;
            accommodationStartDate?: string | null;
            accommodationEndDate?: string | null;
            depositPaidEur?: number | null;
            totalPaidEur?: number | null;
            courseFeeEur?: number | null;
            accommodationFeeEur?: number | null;
            transferFeeEur?: number | null;
            examFeeEur?: number | null;
            registrationFeeEur?: number | null;
            learnerProtectionFeeEur?: number | null;
            medicalInsuranceFeeEur?: number | null;
            totalBookingEur?: number | null;
          };

          // Skip booking if no course is assigned (required field)
          if (!meta.courseId) {
            console.log(`Skipping booking for student ${i} - no course assigned`);
            continue;
          }

          const startDate = parsed.courseStartDate || parsed.startDate;
          if (!startDate) {
            console.log(`Skipping booking for student ${i} - no start date`);
            continue;
          }

          // Calculate end date - required field for bookings
          const endDate = parsed.courseEndDate || parsed.endDate;
          const weeks = parsed.weeks || 1;
          // If no end date provided, calculate from start date + weeks
          let courseEndDate = endDate;
          if (!courseEndDate) {
            const startDateObj = new Date(startDate);
            startDateObj.setDate(startDateObj.getDate() + weeks * 7);
            courseEndDate = startDateObj.toISOString().split('T')[0];
          }

          // Generate unique booking number
          const bookingNumber = `IMP-${Date.now()}-${i}`;

          bookingsToInsert.push({
            tenantId,
            bookingNumber,
            saleDate: parsed.saleDate || startDate, // Default to start date if no sale date
            studentId: studentRecord.id,
            agencyId: meta.agencyId || undefined,
            courseId: meta.courseId,
            weeks,
            courseStartDate: startDate,
            courseEndDate,
            placementTestScore: parsed.placementTestScore || undefined,
            accommodationTypeId: meta.accommodationTypeId || undefined,
            accommodationStartDate: parsed.accommodationStartDate || undefined,
            accommodationEndDate: parsed.accommodationEndDate || undefined,
            // Financial fields - convert to string for decimal
            depositPaidEur: String(parsed.depositPaidEur ?? 0),
            totalPaidEur: String(parsed.totalPaidEur ?? 0),
            courseFeeEur: String(parsed.courseFeeEur ?? 0),
            accommodationFeeEur: String(parsed.accommodationFeeEur ?? 0),
            transferFeeEur: String(parsed.transferFeeEur ?? 0),
            examFeeEur: String(parsed.examFeeEur ?? 0),
            registrationFeeEur: String(parsed.registrationFeeEur ?? 0),
            learnerProtectionFeeEur: String(parsed.learnerProtectionFeeEur ?? 0),
            medicalInsuranceFeeEur: String(parsed.medicalInsuranceFeeEur ?? 0),
            totalBookingEur: String(parsed.totalBookingEur ?? 0),
            status: 'confirmed',
          });
        }

        if (bookingsToInsert.length > 0) {
          await tx.insert(bookings).values(bookingsToInsert as any);
          console.log(`Batch inserted ${bookingsToInsert.length} bookings`);
        }
        console.timeEnd('batchInsertBookings');
      }

      // OPTIMIZATION 5: Batch insert enrollments (class assignments)
      if (insertedUsers.length > 0) {
        console.time('batchInsertEnrollments');
        const enrollmentsToInsert: Array<Record<string, unknown>> = [];

        for (let i = 0; i < insertedUsers.length; i++) {
          const user = insertedUsers[i];
          const meta = insertMetadata[i];
          const parsed = meta.parsedData as {
            courseStartDate?: string | null;
            startDate?: string | null;
            courseEndDate?: string | null;
            endDate?: string | null;
            weeks?: number | null;
          };

          // Skip enrollment if no class is assigned
          if (!meta.classId) {
            console.log(`Skipping enrollment for user ${i} - no class assigned`);
            continue;
          }

          const startDate = parsed.courseStartDate || parsed.startDate;
          if (!startDate) {
            console.log(`Skipping enrollment for user ${i} - no start date`);
            continue;
          }

          enrollmentsToInsert.push({
            tenantId,
            studentId: user.id,
            classId: meta.classId,
            enrollmentDate: startDate,
            expectedEndDate: parsed.courseEndDate || parsed.endDate || undefined,
            bookedWeeks: parsed.weeks || undefined,
            status: 'active',
          });
        }

        if (enrollmentsToInsert.length > 0) {
          const insertedEnrollments = await tx
            .insert(enrollments)
            .values(enrollmentsToInsert as any)
            .returning({ id: enrollments.id });
          enrollmentIds.push(...insertedEnrollments.map(e => e.id));
          insertedCount = insertedEnrollments.length;
          console.log(`Batch inserted ${insertedEnrollments.length} enrollments`);
        }
        console.timeEnd('batchInsertEnrollments');
      }

      // Fetch staging rows with editedData for UPDATEs
      console.time('fetchUpdateStagingRows');
      const updateStgRowIds = updateChanges.map(c => c.stgRowId);
      const updateStagingRows =
        updateStgRowIds.length > 0
          ? await tx
              .select({
                id: stgRows.id,
                editedData: stgRows.editedData,
              })
              .from(stgRows)
              .where(inArray(stgRows.id, updateStgRowIds))
          : [];
      const updateStagingRowMap = new Map(updateStagingRows.map(r => [r.id, r]));
      console.timeEnd('fetchUpdateStagingRows');

      // Process UPDATEs (still sequential for diff application)
      // Only updates explicit fields - empty fields preserve existing data
      // Admin edits override diff values
      console.time('processUpdates');
      for (const change of updateChanges) {
        if (!change.targetEnrollmentId) {
          errors.push(`Missing target enrollment for UPDATE`);
          skippedCount++;
          continue;
        }

        const diff = change.diff as Record<string, { old: unknown; new: unknown }> | null;
        const updateStgRow = updateStagingRowMap.get(change.stgRowId);
        const editedData = (updateStgRow?.editedData as Record<string, unknown>) || {};

        if ((!diff || Object.keys(diff).length === 0) && Object.keys(editedData).length === 0) {
          skippedCount++;
          continue;
        }

        // Helper to get effective value: editedData > diff.new > null
        const getEffectiveUpdateValue = (fieldName: string): unknown => {
          if (editedData[fieldName] !== undefined) {
            return editedData[fieldName];
          }
          if (diff && diff[fieldName]) {
            return diff[fieldName].new;
          }
          return null;
        };

        // Build update values from diff + edits - use new field names with fallback to legacy
        const updateValues: Record<string, unknown> = {};

        // Course start date (check edited first, then diff)
        const effectiveStartDate =
          getEffectiveUpdateValue('courseStartDate') || getEffectiveUpdateValue('startDate');
        if (effectiveStartDate !== null) {
          updateValues.enrollmentDate = effectiveStartDate;
        }

        // Course end date
        const effectiveEndDate =
          getEffectiveUpdateValue('courseEndDate') || getEffectiveUpdateValue('endDate');
        if (effectiveEndDate !== null) {
          updateValues.expectedEndDate = effectiveEndDate;
        }

        // Weeks
        const effectiveWeeks = getEffectiveUpdateValue('weeks');
        if (effectiveWeeks !== null) {
          updateValues.bookedWeeks = effectiveWeeks;
        }

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
