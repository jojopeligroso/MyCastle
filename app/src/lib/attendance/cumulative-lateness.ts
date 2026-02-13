/**
 * Cumulative Lateness Tracking
 *
 * Handles programme-specific cumulative lateness policies where students accumulate
 * late minutes over a calendar week and receive "absence equivalents" based on
 * configurable thresholds.
 *
 * Business Rules:
 * - Week defined as Monday 00:00 - Sunday 23:59 (calendar week, not academic week)
 * - Cumulative minutes = SUM(minutes_late + minutes_left_early) for the week
 * - Absence equivalents = FLOOR(cumulative_minutes / threshold_minutes)
 * - late_absent status records DO NOT count toward cumulative (already marked absent)
 * - Policy is programme-specific (stored in programmes.metadata)
 * - Resets every Monday at start of new week
 */

import { db } from '@/db';
import { attendance, classSessions, classes, programmes } from '@/db/schema';
import { eq, and, gte, lt, inArray, sql } from 'drizzle-orm';

/**
 * Programme-specific lateness policy configuration
 * Stored in programmes.metadata JSONB field
 */
export interface ProgrammeLatenessPolicy {
  cumulativeLatenessEnabled?: boolean; // Default: false
  latenessThresholdMinutes?: number; // Default: 15 (minutes = 1 absence)
  lateAbsentThresholdMinutes?: number; // Default: 17 (when to mark late_absent)
}

/**
 * Result of cumulative lateness calculation for a student
 */
export interface CumulativeLatenessResult {
  studentId: string;
  weekStart: Date;
  weekEnd: Date;
  totalMinutesLate: number;
  totalMinutesEarly: number;
  cumulativeMinutes: number;
  absenceEquivalents: number;
  thresholdMinutes: number;
  policyEnabled: boolean;
}

/**
 * Get the calendar week boundaries (Monday-Sunday) for a given date
 *
 * @param date - Any date within the week
 * @returns Object with weekStart (Monday 00:00) and weekEnd (Sunday 23:59)
 *
 * @example
 * getWeekBoundaries(new Date('2026-01-21')) // Wednesday
 * // Returns: { weekStart: Mon 2026-01-19 00:00, weekEnd: Sun 2026-01-25 23:59 }
 */
export function getWeekBoundaries(date: Date): { weekStart: Date; weekEnd: Date } {
  const d = new Date(date);

  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = d.getDay();

  // Calculate days to subtract to get to Monday
  // If Sunday (0), go back 6 days; if Monday (1), go back 0 days; etc.
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Set to Monday at 00:00:00
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);

  // Set to Sunday at 23:59:59
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/**
 * Get programme lateness policy from programme metadata
 *
 * @param programmeId - Programme UUID
 * @param tenantId - Tenant UUID
 * @returns Policy configuration with defaults
 */
async function getProgrammeLatenessPolicy(
  programmeId: string,
  tenantId: string
): Promise<ProgrammeLatenessPolicy> {
  const programme = await db
    .select({ metadata: programmes.metadata })
    .from(programmes)
    .where(and(eq(programmes.id, programmeId), eq(programmes.tenantId, tenantId)))
    .limit(1);

  if (!programme.length || !programme[0].metadata) {
    // Return defaults if no policy configured
    return {
      cumulativeLatenessEnabled: false,
      latenessThresholdMinutes: 15,
      lateAbsentThresholdMinutes: 17,
    };
  }

  const metadata = programme[0].metadata as Record<string, unknown>;

  return {
    cumulativeLatenessEnabled: (metadata.cumulativeLatenessEnabled as boolean) ?? false,
    latenessThresholdMinutes: (metadata.latenessThresholdMinutes as number) ?? 15,
    lateAbsentThresholdMinutes: (metadata.lateAbsentThresholdMinutes as number) ?? 17,
  };
}

/**
 * Calculate cumulative lateness for a single student in a specific class for a given week
 *
 * @param studentId - Student UUID
 * @param classId - Class UUID
 * @param weekDate - Any date within the target week
 * @param tenantId - Tenant UUID
 * @returns Cumulative lateness result with absence equivalents
 *
 * @example
 * const result = await calculateWeeklyCumulativeLateness(
 *   'student-uuid',
 *   'class-uuid',
 *   new Date('2026-01-21'),
 *   'tenant-uuid'
 * );
 * // result.cumulativeMinutes = 25 (e.g., 15 late + 10 early)
 * // result.absenceEquivalents = 1 (25 ÷ 15 = 1.67, floor = 1)
 */
export async function calculateWeeklyCumulativeLateness(
  studentId: string,
  classId: string,
  weekDate: Date,
  tenantId: string
): Promise<CumulativeLatenessResult> {
  // Get week boundaries
  const { weekStart, weekEnd } = getWeekBoundaries(weekDate);

  // Get class to find programme
  const classInfo = await db
    .select({ programmeId: classes.programmeId })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.tenantId, tenantId)))
    .limit(1);

  if (!classInfo.length || !classInfo[0].programmeId) {
    // No programme configured, return disabled policy
    return {
      studentId,
      weekStart,
      weekEnd,
      totalMinutesLate: 0,
      totalMinutesEarly: 0,
      cumulativeMinutes: 0,
      absenceEquivalents: 0,
      thresholdMinutes: 15,
      policyEnabled: false,
    };
  }

  // Get programme policy
  const policy = await getProgrammeLatenessPolicy(classInfo[0].programmeId, tenantId);

  if (!policy.cumulativeLatenessEnabled) {
    // Policy disabled for this programme
    return {
      studentId,
      weekStart,
      weekEnd,
      totalMinutesLate: 0,
      totalMinutesEarly: 0,
      cumulativeMinutes: 0,
      absenceEquivalents: 0,
      thresholdMinutes: policy.latenessThresholdMinutes || 15,
      policyEnabled: false,
    };
  }

  // Query attendance records for the week
  // IMPORTANT: Exclude 'late_absent' status as those minutes don't count toward cumulative
  const records = await db
    .select({
      minutesLate: attendance.minutesLate,
      minutesLeftEarly: attendance.minutesLeftEarly,
    })
    .from(attendance)
    .innerJoin(classSessions, eq(attendance.classSessionId, classSessions.id))
    .where(
      and(
        eq(attendance.studentId, studentId),
        eq(attendance.tenantId, tenantId),
        eq(classSessions.classId, classId),
        gte(classSessions.sessionDate, sql`${weekStart}::date`),
        lt(classSessions.sessionDate, sql`${weekEnd}::date + INTERVAL '1 day'`),
        // Exclude late_absent - these students are already marked absent
        inArray(attendance.status, ['present', 'late', 'excused'])
      )
    );

  // Sum up the minutes
  const totalMinutesLate = records.reduce((sum, r) => sum + (r.minutesLate || 0), 0);
  const totalMinutesEarly = records.reduce((sum, r) => sum + (r.minutesLeftEarly || 0), 0);
  const cumulativeMinutes = totalMinutesLate + totalMinutesEarly;

  // Calculate absence equivalents
  const threshold = policy.latenessThresholdMinutes || 15;
  const absenceEquivalents = Math.floor(cumulativeMinutes / threshold);

  return {
    studentId,
    weekStart,
    weekEnd,
    totalMinutesLate,
    totalMinutesEarly,
    cumulativeMinutes,
    absenceEquivalents,
    thresholdMinutes: threshold,
    policyEnabled: true,
  };
}

/**
 * Calculate cumulative lateness for all students in a class for a given week
 * Useful for displaying weekly summaries in reports or attendance register
 *
 * @param classId - Class UUID
 * @param weekDate - Any date within the target week
 * @param tenantId - Tenant UUID
 * @returns Map of studentId -> CumulativeLatenessResult
 *
 * @example
 * const results = await calculateClassWeeklyCumulativeLateness(
 *   'class-uuid',
 *   new Date(),
 *   'tenant-uuid'
 * );
 * // results.get('student-1-uuid') -> { cumulativeMinutes: 25, absenceEquivalents: 1, ... }
 */
export async function calculateClassWeeklyCumulativeLateness(
  classId: string,
  weekDate: Date,
  tenantId: string
): Promise<Map<string, CumulativeLatenessResult>> {
  // Get week boundaries
  const { weekStart, weekEnd } = getWeekBoundaries(weekDate);

  // Get class to find programme
  const classInfo = await db
    .select({ programmeId: classes.programmeId })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.tenantId, tenantId)))
    .limit(1);

  const resultMap = new Map<string, CumulativeLatenessResult>();

  if (!classInfo.length || !classInfo[0].programmeId) {
    // No programme configured
    return resultMap;
  }

  // Get programme policy
  const policy = await getProgrammeLatenessPolicy(classInfo[0].programmeId, tenantId);

  if (!policy.cumulativeLatenessEnabled) {
    // Policy disabled for this programme
    return resultMap;
  }

  // Query attendance records for all students in the class for the week
  const records = await db
    .select({
      studentId: attendance.studentId,
      minutesLate: attendance.minutesLate,
      minutesLeftEarly: attendance.minutesLeftEarly,
    })
    .from(attendance)
    .innerJoin(classSessions, eq(attendance.classSessionId, classSessions.id))
    .where(
      and(
        eq(attendance.tenantId, tenantId),
        eq(classSessions.classId, classId),
        gte(classSessions.sessionDate, sql`${weekStart}::date`),
        lt(classSessions.sessionDate, sql`${weekEnd}::date + INTERVAL '1 day'`),
        // Exclude late_absent
        inArray(attendance.status, ['present', 'late', 'excused'])
      )
    );

  // Group by student and calculate totals
  const studentTotals = new Map<string, { late: number; early: number }>();

  for (const record of records) {
    const existing = studentTotals.get(record.studentId) || { late: 0, early: 0 };
    studentTotals.set(record.studentId, {
      late: existing.late + (record.minutesLate || 0),
      early: existing.early + (record.minutesLeftEarly || 0),
    });
  }

  // Calculate absence equivalents for each student
  const threshold = policy.latenessThresholdMinutes || 15;

  for (const [studentId, totals] of studentTotals.entries()) {
    const cumulativeMinutes = totals.late + totals.early;
    const absenceEquivalents = Math.floor(cumulativeMinutes / threshold);

    resultMap.set(studentId, {
      studentId,
      weekStart,
      weekEnd,
      totalMinutesLate: totals.late,
      totalMinutesEarly: totals.early,
      cumulativeMinutes,
      absenceEquivalents,
      thresholdMinutes: threshold,
      policyEnabled: true,
    });
  }

  return resultMap;
}
