import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

/**
 * Attendance entry schema
 */
const AttendanceEntrySchema = z.object({
  studentId: z.string().uuid('Valid student ID is required'),
  status: z.enum(['present', 'absent', 'late', 'excused'], {
    errorMap: () => ({ message: 'Status must be one of: present, absent, late, excused' })
  }),
  note: z.string().optional(),
});

/**
 * Input schema for record-attendance tool
 */
export const RecordAttendanceInputSchema = z.object({
  registerDate: z.string().datetime('Valid ISO 8601 date is required'),
  classId: z.string().uuid('Valid class ID is required'),
  entries: z.array(AttendanceEntrySchema).min(1, 'At least one attendance entry is required'),
});

/**
 * Output schema for record-attendance tool
 */
export const RecordAttendanceOutputSchema = z.object({
  saved: z.number().int().nonnegative(),
});

/**
 * Tool metadata for MCP registration
 */
export const recordAttendanceMetadata: MCPTool = {
  name: 'record-attendance',
  description: 'Record attendance for multiple students in a class. Batch inserts attendance records and emits audit per student. Requires admin.write.attendance scope.',
  inputSchema: {
    type: 'object',
    properties: {
      registerDate: {
        type: 'string',
        format: 'date-time',
        description: 'Date of the attendance register',
      },
      classId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the class',
      },
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            studentId: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the student',
            },
            status: {
              type: 'string',
              enum: ['present', 'absent', 'late', 'excused'],
              description: 'Attendance status',
            },
            note: {
              type: 'string',
              description: 'Optional note about the attendance',
            },
          },
          required: ['studentId', 'status'],
        },
        description: 'Array of attendance entries',
      },
    },
    required: ['registerDate', 'classId', 'entries'],
  },
};

/**
 * Record attendance for a class
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Attendance record details
 * @returns Number of attendance records saved
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If class not found or attendance recording fails
 */
export async function executeRecordAttendance(
  context: AdminContext,
  input: z.infer<typeof RecordAttendanceInputSchema>
): Promise<z.infer<typeof RecordAttendanceOutputSchema>> {
  // 1. Validate input
  const validated = RecordAttendanceInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_WRITE_ATTENDANCE);

  // 3. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Verify class exists
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('*')
    .eq('id', validated.classId)
    .single();

  if (classError || !classData) {
    throw new Error(`Class not found: ${validated.classId}`);
  }

  // 5. Generate correlation ID for batch operation
  const correlationId = generateCorrelationId();

  // 6. Prepare attendance records
  const attendanceRecords = validated.entries.map(entry => ({
    class_id: validated.classId,
    student_id: entry.studentId,
    register_date: validated.registerDate,
    status: entry.status,
    note: entry.note || null,
    recorded_by: context.actorId,
  }));

  // 7. Check for existing attendance records (prevent duplicates)
  const { data: existing } = await supabase
    .from('attendance')
    .select('student_id')
    .eq('class_id', validated.classId)
    .eq('register_date', validated.registerDate);

  if (existing && existing.length > 0) {
    const existingStudentIds = new Set(existing.map(r => r.student_id));
    const duplicates = validated.entries.filter(e => existingStudentIds.has(e.studentId));
    if (duplicates.length > 0) {
      throw new Error(
        `Attendance already recorded for ${duplicates.length} student(s) on this date`
      );
    }
  }

  // 8. Batch insert attendance records
  const { data: inserted, error: insertError } = await supabase
    .from('attendance')
    .insert(attendanceRecords)
    .select();

  if (insertError) {
    throw new Error(`Failed to record attendance: ${insertError.message}`);
  }

  if (!inserted || inserted.length === 0) {
    throw new Error('No attendance records were saved');
  }

  // 9. Emit audit entry per student
  for (const entry of validated.entries) {
    const recordedEntry = inserted.find(r => r.student_id === entry.studentId);

    audit({
      actor: context.actorId,
      action: 'attendance.record',
      target: `attendance/${recordedEntry?.id || entry.studentId}`,
      scope: SCOPES.ADMIN_WRITE_ATTENDANCE,
      before: undefined,
      after: {
        classId: validated.classId,
        studentId: entry.studentId,
        registerDate: validated.registerDate,
        status: entry.status,
        note: entry.note,
      },
      correlationId,
    });
  }

  // 10. Return result
  return { saved: inserted.length };
}
