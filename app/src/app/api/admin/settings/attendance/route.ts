/**
 * Attendance Settings API - Manage tenant attendance configuration
 * GET /api/admin/settings/attendance - Get current settings
 * PUT /api/admin/settings/attendance - Update settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { z } from 'zod';
import {
  getTenantAttendanceSettings,
  updateTenantAttendanceSettings,
  TenantAttendanceSettings,
} from '@/lib/attendance/tenant-settings';

export async function GET(): Promise<NextResponse> {
  try {
    await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    const settings = await getTenantAttendanceSettings(tenantId);

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[Attendance Settings GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

const UpdateSettingsSchema = z.object({
  lateAbsentThresholdMinutes: z.number().int().min(1).max(89).optional(),
  cumulativeLatenessEnabled: z.boolean().optional(),
  cumulativeDeductionMinutes: z.number().int().min(1).max(180).optional(),
});

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth();
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    const body = await request.json();
    const validation = UpdateSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const updates: Partial<TenantAttendanceSettings> = {};

    if (validation.data.lateAbsentThresholdMinutes !== undefined) {
      updates.lateAbsentThresholdMinutes = validation.data.lateAbsentThresholdMinutes;
    }
    if (validation.data.cumulativeLatenessEnabled !== undefined) {
      updates.cumulativeLatenessEnabled = validation.data.cumulativeLatenessEnabled;
    }
    if (validation.data.cumulativeDeductionMinutes !== undefined) {
      updates.cumulativeDeductionMinutes = validation.data.cumulativeDeductionMinutes;
    }

    const settings = await updateTenantAttendanceSettings(tenantId, updates);

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[Attendance Settings PUT] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
