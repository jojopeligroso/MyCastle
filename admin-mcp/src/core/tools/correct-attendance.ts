import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

/**
 * Input schema for correct-attendance tool
 */
export const CorrectAttendanceInputSchema = z.object({
  attendanceId: z.string().uuid('Valid attendance record ID is required'),
  newStatus: z.enum(['present', 'absent', 'late', 'excused'], {
    errorMap: () => ({ message: 'Status must be one of: present, absent, late, excused' }),
  }),
  correctionReason: z.string().min(10, 'Correction reason must be at least 10 characters'),
  note: z.string().optional(),
});

/**
 * Output schema for correct-attendance tool
 */
export const CorrectAttendanceOutputSchema = z.object({
  success: z.boolean(),
  attendanceId: z.string(),
  previousStatus: z.string(),
  newStatus: z.string(),
});

/**
 * Tool metadata for MCP registration
 */
export const correctAttendanceMetadata: MCPTool = {
  name: 'correct-attendance',
  description: 'Correct a previously recorded attendance entry. Requires admin override scope and mandatory correction reason for audit trail. Preserves original record history.',
  inputSchema: {
    type: 'object',
    properties: {
      attendanceId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the attendance record to correct',
      },
      newStatus: {
        type: 'string',
        enum: ['present', 'absent', 'late', 'excused'],
        description: 'Corrected attendance status',
      },
      correctionReason: {
        type: 'string',
        minLength: 10,
        description: 'Mandatory reason for the correction (min 10 characters)',
      },
      note: {
        type: 'string',
        description: 'Optional additional note',
      },
    },
    required: ['attendanceId', 'newStatus', 'correctionReason'],
  },
};

/**
 * Correct an attendance record
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Attendance correction details
 * @returns Correction confirmation with before/after status
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If attendance record not found or correction fails
 */
export async function executeCorrectAttendance(
  context: AdminContext,
  input: z.infer<typeof CorrectAttendanceInputSchema>
): Promise<z.infer<typeof CorrectAttendanceOutputSchema>> {
  // 1. Validate input
  const validated = CorrectAttendanceInputSchema.parse(input);

  // 2. Check required scope - admin override required for corrections
  requireScope(context, SCOPES.ADMIN_WRITE_ATTENDANCE);

  // 3. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Fetch existing attendance record
  const { data: existingRecord, error: fetchError } = await supabase
    .from('attendance')
    .select('*')
    .eq('id', validated.attendanceId)
    .single();

  if (fetchError || !existingRecord) {
    throw new Error(`Attendance record not found: ${validated.attendanceId}`);
  }

  // 5. Check if status is actually changing
  if (existingRecord.status === validated.newStatus) {
    throw new Error(
      `New status "${validated.newStatus}" is the same as current status. No correction needed.`
    );
  }

  // 6. Capture before state for audit
  const before = {
    attendanceId: existingRecord.id,
    studentId: existingRecord.student_id,
    classId: existingRecord.class_id,
    registerDate: existingRecord.register_date,
    status: existingRecord.status,
    note: existingRecord.note,
    recordedBy: existingRecord.recorded_by,
  };

  // 7. Update attendance record with correction
  const correctionNote = [
    `[ADMIN CORRECTION by ${context.actorId}]`,
    `Reason: ${validated.correctionReason}`,
    `Previous status: ${existingRecord.status}`,
    validated.note ? `Note: ${validated.note}` : null,
    existingRecord.note ? `Original note: ${existingRecord.note}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const { data: updated, error: updateError } = await supabase
    .from('attendance')
    .update({
      status: validated.newStatus,
      note: correctionNote,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.attendanceId)
    .select()
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to correct attendance: ${updateError?.message || 'Unknown error'}`);
  }

  // 8. Capture after state for audit
  const after = {
    attendanceId: updated.id,
    studentId: updated.student_id,
    classId: updated.class_id,
    registerDate: updated.register_date,
    status: updated.status,
    note: updated.note,
    correctedBy: context.actorId,
    correctionReason: validated.correctionReason,
  };

  // 9. Emit audit entry with high-priority flag for admin corrections
  audit({
    actor: context.actorId,
    action: 'attendance.admin_correction',
    target: `attendance/${validated.attendanceId}`,
    scope: SCOPES.ADMIN_WRITE_ATTENDANCE,
    before,
    after,
    correlationId: generateCorrelationId(),
  });

  // 10. Return result
  return {
    success: true,
    attendanceId: validated.attendanceId,
    previousStatus: existingRecord.status,
    newStatus: validated.newStatus,
  };
}
