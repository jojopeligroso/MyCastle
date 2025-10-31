import { z } from 'zod';
import { createHash } from 'crypto';
import type { AdminContext, MCPResource } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';

/**
 * Input schema for weekly operations resource
 */
export const WeeklyOpsParamsSchema = z.object({
  week: z.string().optional(), // ISO week format: 2025-W01
});

/**
 * Output data schema for weekly operations
 */
export const WeeklyOpsDataSchema = z.object({
  week: z.string(),
  attendance: z.object({
    total_sessions: z.number(),
    attended: z.number(),
    absent: z.number(),
    attendance_rate: z.number(),
  }),
  occupancy: z.object({
    total_capacity: z.number(),
    enrolled: z.number(),
    occupancy_percent: z.number(),
  }),
  noShow: z.object({
    count: z.number(),
    rate: z.number(),
  }),
  revenue: z.object({
    current_week: z.number(),
    previous_week: z.number(),
    delta_percent: z.number(),
  }),
  timestamp: z.string(),
});

/**
 * Resource metadata
 */
export const weeklyOpsMetadata: MCPResource = {
  uri: 'res://admin/reports/weekly-ops',
  name: 'Weekly Operations Snapshot',
  description: 'Weekly operations snapshot with attendance, occupancy, no-show rate, and revenue delta',
  mimeType: 'application/json',
};

/**
 * Get weekly operations snapshot
 *
 * @param context - Admin context with authentication
 * @param params - Optional week parameter (defaults to current week)
 * @returns Weekly operations data with ETag and cache hint
 */
export async function getWeeklyOpsResource(
  context: AdminContext,
  params: z.infer<typeof WeeklyOpsParamsSchema> = {}
): Promise<{
  data: z.infer<typeof WeeklyOpsDataSchema>;
  etag: string;
  cacheHint?: number;
}> {
  // 1. Validate params
  const validated = WeeklyOpsParamsSchema.parse(params);

  // 2. Check scope
  requireScope(context, SCOPES.ADMIN_READ_SYSTEM);

  // 3. Create Supabase client with user token
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Determine week (current or specified)
  const targetWeek = validated.week || getCurrentISOWeek();
  const { startDate, endDate } = getWeekDateRange(targetWeek);
  const previousWeek = getPreviousISOWeek(targetWeek);
  const { startDate: prevStartDate, endDate: prevEndDate } = getWeekDateRange(previousWeek);

  // 5. Query attendance data
  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance_records')
    .select('status')
    .gte('session_date', startDate)
    .lte('session_date', endDate);

  if (attendanceError) {
    throw new Error(`Failed to fetch attendance data: ${attendanceError.message}`);
  }

  // 6. Query class capacity and enrollment
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('capacity, enrolled_count')
    .eq('active', true);

  if (classError) {
    throw new Error(`Failed to fetch class data: ${classError.message}`);
  }

  // 7. Query revenue data for current and previous week
  const { data: currentRevenue, error: currentRevenueError } = await supabase
    .from('invoices')
    .select('amount')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)
    .eq('status', 'paid');

  if (currentRevenueError) {
    throw new Error(`Failed to fetch current revenue: ${currentRevenueError.message}`);
  }

  const { data: previousRevenue, error: previousRevenueError } = await supabase
    .from('invoices')
    .select('amount')
    .gte('invoice_date', prevStartDate)
    .lte('invoice_date', prevEndDate)
    .eq('status', 'paid');

  if (previousRevenueError) {
    throw new Error(`Failed to fetch previous revenue: ${previousRevenueError.message}`);
  }

  // 8. Transform and aggregate data
  const totalSessions = attendanceData?.length || 0;
  const attended = attendanceData?.filter(r => r.status === 'present').length || 0;
  const absent = attendanceData?.filter(r => r.status === 'absent').length || 0;
  const noShowCount = attendanceData?.filter(r => r.status === 'no_show').length || 0;
  const attendanceRate = totalSessions > 0 ? (attended / totalSessions) * 100 : 0;
  const noShowRate = totalSessions > 0 ? (noShowCount / totalSessions) * 100 : 0;

  const totalCapacity = classData?.reduce((sum, c) => sum + (c.capacity || 0), 0) || 0;
  const totalEnrolled = classData?.reduce((sum, c) => sum + (c.enrolled_count || 0), 0) || 0;
  const occupancyPercent = totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0;

  const currentWeekRevenue = currentRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
  const previousWeekRevenue = previousRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
  const revenueDeltaPercent = previousWeekRevenue > 0
    ? ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100
    : 0;

  const result = {
    week: targetWeek,
    attendance: {
      total_sessions: totalSessions,
      attended,
      absent,
      attendance_rate: Math.round(attendanceRate * 100) / 100,
    },
    occupancy: {
      total_capacity: totalCapacity,
      enrolled: totalEnrolled,
      occupancy_percent: Math.round(occupancyPercent * 100) / 100,
    },
    noShow: {
      count: noShowCount,
      rate: Math.round(noShowRate * 100) / 100,
    },
    revenue: {
      current_week: currentWeekRevenue,
      previous_week: previousWeekRevenue,
      delta_percent: Math.round(revenueDeltaPercent * 100) / 100,
    },
    timestamp: new Date().toISOString(),
  };

  // 9. Validate output
  const validatedResult = WeeklyOpsDataSchema.parse(result);

  // 10. Generate ETag
  const etag = generateETag(validatedResult);

  return { data: validatedResult, etag, cacheHint: 300 }; // 5 min cache
}

/**
 * Generate ETag from data
 */
function generateETag(data: any): string {
  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .slice(0, 16);
}

/**
 * Get current ISO week string (YYYY-Www)
 */
function getCurrentISOWeek(): string {
  const now = new Date();
  const year = now.getFullYear();
  const week = getISOWeekNumber(now);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Get previous ISO week string
 */
function getPreviousISOWeek(isoWeek: string): string {
  const [year, week] = isoWeek.split('-W').map(Number);
  if (week === 1) {
    return `${year - 1}-W52`;
  }
  return `${year}-W${String(week - 1).padStart(2, '0')}`;
}

/**
 * Get ISO week number for a date
 */
function getISOWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Get date range for an ISO week
 */
function getWeekDateRange(isoWeek: string): { startDate: string; endDate: string } {
  const [year, week] = isoWeek.split('-W').map(Number);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  const ISOweekEnd = new Date(ISOweekStart);
  ISOweekEnd.setDate(ISOweekStart.getDate() + 6);

  return {
    startDate: ISOweekStart.toISOString().split('T')[0],
    endDate: ISOweekEnd.toISOString().split('T')[0],
  };
}
