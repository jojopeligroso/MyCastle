import { z } from 'zod';
import { createHash } from 'crypto';
import type { AdminContext, MCPResource } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';

/**
 * Input schema for attendance register
 */
export const RegisterParamsSchema = z.object({
  classId: z.string(),
  isoWeek: z.string(), // ISO week format: 2025-W01
});

/**
 * Attendance record schema
 */
export const AttendanceRecordSchema = z.object({
  session_date: z.string(),
  session_time: z.string().optional(),
  student_id: z.string(),
  student_name: z.string(),
  status: z.string(), // 'present', 'absent', 'late', 'excused', 'no_show'
  notes: z.string().nullable().optional(),
  marked_by: z.string().optional(),
  marked_at: z.string().optional(),
});

/**
 * Daily summary schema
 */
export const DailySummarySchema = z.object({
  date: z.string(),
  total_expected: z.number(),
  present: z.number(),
  absent: z.number(),
  late: z.number(),
  excused: z.number(),
  no_show: z.number(),
  attendance_rate: z.number(),
});

/**
 * Output data schema for attendance register
 */
export const RegisterDataSchema = z.object({
  class_id: z.string(),
  class_name: z.string(),
  week: z.string(),
  date_range: z.object({
    start: z.string(),
    end: z.string(),
  }),
  summary: z.object({
    total_sessions: z.number(),
    total_records: z.number(),
    overall_attendance_rate: z.number(),
    unique_students: z.number(),
  }),
  daily_summaries: z.array(DailySummarySchema),
  records: z.array(AttendanceRecordSchema),
  timestamp: z.string(),
});

/**
 * Resource metadata
 */
export const registerMetadata: MCPResource = {
  uri: 'res://admin/registers/{class_id}/{iso_week}',
  name: 'Attendance Register',
  description: 'Compiled attendance records for a class/week',
  mimeType: 'application/json',
};

/**
 * Get attendance register for a class and week
 *
 * @param context - Admin context with authentication
 * @param classId - Class identifier
 * @param isoWeek - ISO week string (e.g., "2025-W01")
 * @returns Attendance register data with ETag and cache hint
 */
export async function getRegisterResource(
  context: AdminContext,
  classId: string,
  isoWeek: string
): Promise<{
  data: z.infer<typeof RegisterDataSchema>;
  etag: string;
  cacheHint?: number;
}> {
  // 1. Validate params
  const validated = RegisterParamsSchema.parse({ classId, isoWeek });

  // 2. Check scope
  requireScope(context, SCOPES.ADMIN_READ_SYSTEM);

  // 3. Create Supabase client with user token
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Get week date range
  const { startDate, endDate } = getWeekDateRange(validated.isoWeek);

  // 5. Query class information
  const { data: classInfo, error: classError } = await supabase
    .from('classes')
    .select('id, name')
    .eq('id', validated.classId)
    .single();

  if (classError || !classInfo) {
    throw new Error(`Failed to fetch class: ${classError?.message || 'Class not found'}`);
  }

  // 6. Query attendance records for the week
  const { data: attendanceRecords, error: attendanceError } = await supabase
    .from('attendance_records')
    .select(`
      session_date,
      session_time,
      student_id,
      status,
      notes,
      marked_by,
      marked_at,
      profiles!attendance_records_student_id_fkey (
        full_name
      )
    `)
    .eq('class_id', validated.classId)
    .gte('session_date', startDate)
    .lte('session_date', endDate)
    .order('session_date', { ascending: true })
    .order('session_time', { ascending: true });

  if (attendanceError) {
    throw new Error(`Failed to fetch attendance records: ${attendanceError.message}`);
  }

  // 7. Process attendance records
  const processedRecords = (attendanceRecords || []).map((record: any) => ({
    session_date: record.session_date,
    session_time: record.session_time || undefined,
    student_id: record.student_id,
    student_name: record.profiles?.full_name || 'Unknown',
    status: record.status,
    notes: record.notes || null,
    marked_by: record.marked_by || undefined,
    marked_at: record.marked_at || undefined,
  }));

  // 8. Calculate daily summaries
  const dailySummaries = calculateDailySummaries(processedRecords, startDate, endDate);

  // 9. Calculate overall summary
  const uniqueStudents = new Set(processedRecords.map(r => r.student_id)).size;
  const totalRecords = processedRecords.length;
  const totalPresent = processedRecords.filter(r => r.status === 'present').length;
  const overallAttendanceRate = totalRecords > 0
    ? (totalPresent / totalRecords) * 100
    : 0;

  const result = {
    class_id: validated.classId,
    class_name: classInfo.name,
    week: validated.isoWeek,
    date_range: {
      start: startDate,
      end: endDate,
    },
    summary: {
      total_sessions: dailySummaries.length,
      total_records: totalRecords,
      overall_attendance_rate: Math.round(overallAttendanceRate * 100) / 100,
      unique_students: uniqueStudents,
    },
    daily_summaries: dailySummaries,
    records: processedRecords,
    timestamp: new Date().toISOString(),
  };

  // 10. Validate output
  const validatedResult = RegisterDataSchema.parse(result);

  // 11. Generate ETag
  const etag = generateETag(validatedResult);

  return { data: validatedResult, etag, cacheHint: 300 }; // 5 min cache
}

/**
 * Calculate daily summaries from attendance records
 */
function calculateDailySummaries(
  records: any[],
  startDate: string,
  endDate: string
): any[] {
  const summaries: any[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Group records by date
  const recordsByDate = records.reduce((acc: any, record: any) => {
    const date = record.session_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(record);
    return acc;
  }, {});

  // Generate summary for each day in the week
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayRecords = recordsByDate[dateStr] || [];

    const present = dayRecords.filter((r: any) => r.status === 'present').length;
    const absent = dayRecords.filter((r: any) => r.status === 'absent').length;
    const late = dayRecords.filter((r: any) => r.status === 'late').length;
    const excused = dayRecords.filter((r: any) => r.status === 'excused').length;
    const noShow = dayRecords.filter((r: any) => r.status === 'no_show').length;
    const total = dayRecords.length;

    const attendanceRate = total > 0 ? (present / total) * 100 : 0;

    summaries.push({
      date: dateStr,
      total_expected: total,
      present,
      absent,
      late,
      excused,
      no_show: noShow,
      attendance_rate: Math.round(attendanceRate * 100) / 100,
    });
  }

  return summaries;
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
