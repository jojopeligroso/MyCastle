import { z } from 'zod';
import { createHash } from 'crypto';
import type { AdminContext, MCPResource } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';

/**
 * Input schema for class load resource
 */
export const ClassLoadParamsSchema = z.object({
  week: z.string(), // ISO week format: 2025-W01
});

/**
 * Class load item schema
 */
export const ClassLoadItemSchema = z.object({
  class_id: z.string(),
  class_name: z.string(),
  capacity: z.number(),
  enrolled: z.number(),
  utilization_percent: z.number(),
  attendance_rate: z.number().optional(),
  sessions_count: z.number().optional(),
});

/**
 * Output data schema for class load
 */
export const ClassLoadDataSchema = z.object({
  week: z.string(),
  summary: z.object({
    total_capacity: z.number(),
    total_enrolled: z.number(),
    overall_utilization_percent: z.number(),
    overall_attendance_rate: z.number().optional(),
  }),
  classes: z.array(ClassLoadItemSchema),
  timestamp: z.string(),
});

/**
 * Resource metadata
 */
export const classLoadMetadata: MCPResource = {
  uri: 'res://admin/reports/class-load/{week}',
  name: 'Class Load Report',
  description: 'Class capacity vs utilization with attendance rates',
  mimeType: 'application/json',
};

/**
 * Get class load report for a specific week
 *
 * @param context - Admin context with authentication
 * @param week - ISO week string (e.g., "2025-W01")
 * @returns Class load data with ETag and cache hint
 */
export async function getClassLoadResource(
  context: AdminContext,
  week: string
): Promise<{
  data: z.infer<typeof ClassLoadDataSchema>;
  etag: string;
  cacheHint?: number;
}> {
  // 1. Validate params
  const validated = ClassLoadParamsSchema.parse({ week });

  // 2. Check scope
  requireScope(context, SCOPES.ADMIN_READ_SYSTEM);

  // 3. Create Supabase client with user token
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Get week date range
  const { startDate, endDate } = getWeekDateRange(validated.week);

  // 5. Query class data with enrollment counts
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      capacity,
      enrolled_count
    `)
    .eq('active', true);

  if (classError) {
    throw new Error(`Failed to fetch classes: ${classError.message}`);
  }

  // 6. Query attendance data for the week
  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance_records')
    .select('class_id, status')
    .gte('session_date', startDate)
    .lte('session_date', endDate);

  if (attendanceError) {
    throw new Error(`Failed to fetch attendance: ${attendanceError.message}`);
  }

  // 7. Calculate attendance rates per class
  const attendanceByClass = (attendanceData || []).reduce((acc: any, record: any) => {
    if (!acc[record.class_id]) {
      acc[record.class_id] = { total: 0, present: 0 };
    }
    acc[record.class_id].total++;
    if (record.status === 'present') {
      acc[record.class_id].present++;
    }
    return acc;
  }, {});

  // 8. Transform class data
  const classItems = (classes || []).map((cls: any) => {
    const attendance = attendanceByClass[cls.id] || { total: 0, present: 0 };
    const attendanceRate = attendance.total > 0
      ? (attendance.present / attendance.total) * 100
      : 0;
    const utilization = cls.capacity > 0
      ? (cls.enrolled_count / cls.capacity) * 100
      : 0;

    return {
      class_id: cls.id,
      class_name: cls.name,
      capacity: cls.capacity,
      enrolled: cls.enrolled_count,
      utilization_percent: Math.round(utilization * 100) / 100,
      attendance_rate: Math.round(attendanceRate * 100) / 100,
      sessions_count: attendance.total,
    };
  });

  // 9. Calculate summary
  const totalCapacity = classItems.reduce((sum, c) => sum + c.capacity, 0);
  const totalEnrolled = classItems.reduce((sum, c) => sum + c.enrolled, 0);
  const overallUtilization = totalCapacity > 0
    ? (totalEnrolled / totalCapacity) * 100
    : 0;

  const totalSessions = Object.values(attendanceByClass).reduce(
    (sum: number, a: any) => sum + a.total,
    0
  );
  const totalPresent = Object.values(attendanceByClass).reduce(
    (sum: number, a: any) => sum + a.present,
    0
  );
  const overallAttendanceRate = totalSessions > 0
    ? (totalPresent / totalSessions) * 100
    : 0;

  const result = {
    week: validated.week,
    summary: {
      total_capacity: totalCapacity,
      total_enrolled: totalEnrolled,
      overall_utilization_percent: Math.round(overallUtilization * 100) / 100,
      overall_attendance_rate: Math.round(overallAttendanceRate * 100) / 100,
    },
    classes: classItems.sort((a, b) => b.utilization_percent - a.utilization_percent),
    timestamp: new Date().toISOString(),
  };

  // 10. Validate output
  const validatedResult = ClassLoadDataSchema.parse(result);

  // 11. Generate ETag
  const etag = generateETag(validatedResult);

  return { data: validatedResult, etag, cacheHint: 300 }; // 5 min cache
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

/**
 * Generate ETag from data
 */
function generateETag(data: any): string {
  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .slice(0, 16);
}
