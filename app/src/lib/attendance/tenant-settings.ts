/**
 * Tenant Attendance Settings
 *
 * Manages tenant-specific attendance configuration stored in tenants.settings JSONB.
 * Settings include late thresholds and cumulative lateness tracking options.
 */

import { db } from '@/db';
import { tenants } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Attendance settings stored in tenant.settings JSONB
 */
export interface TenantAttendanceSettings {
  /** Minutes late threshold before marking as absent (default: 15) */
  lateAbsentThresholdMinutes: number;
  /** Whether cumulative lateness tracking is enabled (default: false) */
  cumulativeLatenessEnabled: boolean;
  /** Cumulative minutes threshold for deduction (default: 16) */
  cumulativeDeductionMinutes: number;
}

/**
 * Default attendance settings
 */
export const DEFAULT_ATTENDANCE_SETTINGS: TenantAttendanceSettings = {
  lateAbsentThresholdMinutes: 15,
  cumulativeLatenessEnabled: false,
  cumulativeDeductionMinutes: 16,
};

/**
 * Get attendance settings for a tenant
 *
 * @param tenantId - Tenant UUID
 * @returns TenantAttendanceSettings with defaults for missing values
 *
 * @example
 * const settings = await getTenantAttendanceSettings('tenant-uuid');
 * // settings.lateAbsentThresholdMinutes = 15 (default or configured)
 */
export async function getTenantAttendanceSettings(
  tenantId: string
): Promise<TenantAttendanceSettings> {
  const [tenant] = await db
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant || !tenant.settings) {
    return { ...DEFAULT_ATTENDANCE_SETTINGS };
  }

  const settings = tenant.settings as Record<string, unknown>;
  const attendance = (settings.attendance as Record<string, unknown>) || {};

  return {
    lateAbsentThresholdMinutes:
      typeof attendance.lateAbsentThresholdMinutes === 'number'
        ? attendance.lateAbsentThresholdMinutes
        : DEFAULT_ATTENDANCE_SETTINGS.lateAbsentThresholdMinutes,
    cumulativeLatenessEnabled:
      typeof attendance.cumulativeLatenessEnabled === 'boolean'
        ? attendance.cumulativeLatenessEnabled
        : DEFAULT_ATTENDANCE_SETTINGS.cumulativeLatenessEnabled,
    cumulativeDeductionMinutes:
      typeof attendance.cumulativeDeductionMinutes === 'number'
        ? attendance.cumulativeDeductionMinutes
        : DEFAULT_ATTENDANCE_SETTINGS.cumulativeDeductionMinutes,
  };
}

/**
 * Update attendance settings for a tenant
 *
 * @param tenantId - Tenant UUID
 * @param updates - Partial settings to update
 * @returns Updated settings
 */
export async function updateTenantAttendanceSettings(
  tenantId: string,
  updates: Partial<TenantAttendanceSettings>
): Promise<TenantAttendanceSettings> {
  // Get current settings
  const [tenant] = await db
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const currentSettings = (tenant.settings as Record<string, unknown>) || {};
  const currentAttendance = (currentSettings.attendance as Record<string, unknown>) || {};

  // Merge updates
  const newAttendance = {
    ...currentAttendance,
    ...updates,
  };

  const newSettings = {
    ...currentSettings,
    attendance: newAttendance,
  };

  // Update tenant
  await db.update(tenants).set({ settings: newSettings }).where(eq(tenants.id, tenantId));

  return getTenantAttendanceSettings(tenantId);
}

/**
 * Determine if a student should be marked as late_absent based on minutes late
 *
 * @param minutesLate - Number of minutes late
 * @param thresholdMinutes - Threshold from tenant settings
 * @returns true if should be marked as late_absent (absent for attendance %)
 */
export function isLateAbsent(minutesLate: number, thresholdMinutes: number): boolean {
  return minutesLate > thresholdMinutes;
}

/**
 * Get the effective attendance status based on minutes late
 *
 * @param minutesLate - Number of minutes late (0 if not late)
 * @param requestedStatus - The status requested by the user
 * @param thresholdMinutes - Threshold from tenant settings
 * @returns The effective status to store
 */
export function getEffectiveAttendanceStatus(
  minutesLate: number,
  requestedStatus: string,
  thresholdMinutes: number
): string {
  // If no minutes specified or status isn't 'late', return as-is
  if (!minutesLate || minutesLate <= 0) {
    return requestedStatus;
  }

  // If minutes provided and above threshold, mark as late_absent
  if (minutesLate > thresholdMinutes) {
    return 'late_absent';
  }

  // Otherwise it's regular late
  return 'late';
}
