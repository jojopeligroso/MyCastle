/**
 * Correct Attendance Tool
 * Allows admin to correct attendance records (with audit trail)
 */

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { auditLog } from '../lib/audit.js';
import type { User } from '../types/user.js';

// Input schema
export const CorrectAttendanceSchema = z.object({
  attendance_id: z.string().uuid('Invalid attendance ID format'),
  status: z.enum(['present', 'absent', 'late', 'excused'], {
    errorMap: () => ({ message: 'Status must be: present, absent, late, or excused' }),
  }),
  notes: z.string().optional(),
  reason: z.string().min(1, 'Reason for correction is required'),
});

export type CorrectAttendanceInput = z.infer<typeof CorrectAttendanceSchema>;

// Output schema
export const CorrectAttendanceOutputSchema = z.object({
  success: z.boolean(),
  record: z.object({
    id: z.string(),
    student_id: z.string(),
    student_name: z.string(),
    session_id: z.string(),
    old_status: z.string(),
    new_status: z.string(),
    corrected_by: z.string(),
    corrected_at: z.string(),
    reason: z.string(),
  }).optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type CorrectAttendanceOutput = z.infer<typeof CorrectAttendanceOutputSchema>;

export const correctAttendance = {
  name: 'correct-attendance-admin',
  description: 'Correct attendance record with admin override (requires reason for audit)',
  scopes: ['admin.write.attendance'],
  inputSchema: CorrectAttendanceSchema,
  outputSchema: CorrectAttendanceOutputSchema,

  execute: async (
    input: CorrectAttendanceInput,
    user: User
  ): Promise<CorrectAttendanceOutput> => {
    // Validate input
    const validated = CorrectAttendanceSchema.parse(input);

    // Create Supabase client with user JWT for RLS
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${user.jwt}`,
          },
        },
      }
    );

    try {
      // Get existing attendance record
      const { data: existingRecord, error: fetchError } = await supabase
        .from('attendance')
        .select(`
          *,
          students:student_id (id, name, email),
          sessions:session_id (id, session_date, start_time, class_id)
        `)
        .eq('id', validated.attendance_id)
        .eq('tenant_id', user.tenant_id)
        .single();

      if (fetchError || !existingRecord) {
        throw new Error(`Attendance record not found: ${validated.attendance_id}`);
      }

      const oldStatus = existingRecord.status;

      // Check if status is actually changing
      if (oldStatus === validated.status) {
        return {
          success: true,
          message: `Attendance status is already ${validated.status}. No changes made.`,
        };
      }

      // Update attendance record
      const { data: updatedRecord, error: updateError } = await supabase
        .from('attendance')
        .update({
          status: validated.status,
          notes: validated.notes || existingRecord.notes,
          corrected_by: user.id,
          corrected_at: new Date().toISOString(),
          correction_reason: validated.reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', validated.attendance_id)
        .eq('tenant_id', user.tenant_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Create correction history record (if table exists)
      try {
        await supabase
          .from('attendance_corrections')
          .insert({
            attendance_id: validated.attendance_id,
            old_status: oldStatus,
            new_status: validated.status,
            corrected_by: user.id,
            corrected_at: new Date().toISOString(),
            reason: validated.reason,
            notes: validated.notes,
            tenant_id: user.tenant_id,
          });
      } catch (e) {
        // Table might not exist, continue
        console.warn('[correct-attendance] Could not create correction history:', e);
      }

      // Audit log
      await auditLog({
        supabase,
        actor_id: user.id,
        action: 'correct-attendance-admin',
        resource_type: 'attendance',
        resource_id: updatedRecord.id,
        changes: {
          before: { status: oldStatus },
          after: { status: validated.status },
          reason: validated.reason,
          student_id: existingRecord.student_id,
          session_id: existingRecord.session_id,
        },
        tenant_id: user.tenant_id,
      });

      const student = existingRecord.students as any;

      return {
        success: true,
        record: {
          id: updatedRecord.id,
          student_id: existingRecord.student_id,
          student_name: student?.name || 'Unknown',
          session_id: existingRecord.session_id,
          old_status: oldStatus,
          new_status: validated.status,
          corrected_by: user.id,
          corrected_at: updatedRecord.corrected_at,
          reason: validated.reason,
        },
        message: `Attendance corrected from ${oldStatus} to ${validated.status} for ${student?.name}`,
      };
    } catch (error: any) {
      console.error('[correct-attendance] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to correct attendance',
      };
    }
  },
};
