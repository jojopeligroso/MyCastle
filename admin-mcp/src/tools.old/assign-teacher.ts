/**
 * Assign Teacher Tool
 * Assigns a teacher to a class
 */

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { auditLog } from '../lib/audit.js';
import type { User } from '../types/user.js';

// Input schema
export const AssignTeacherSchema = z.object({
  class_id: z.string().uuid('Invalid class ID format'),
  teacher_id: z.string().uuid('Invalid teacher ID format'),
  start_date: z.string().optional().describe('Effective start date (ISO8601)'),
  end_date: z.string().optional().describe('Effective end date (ISO8601)'),
  notes: z.string().optional(),
});

export type AssignTeacherInput = z.infer<typeof AssignTeacherSchema>;

// Output schema
export const AssignTeacherOutputSchema = z.object({
  success: z.boolean(),
  assignment: z.object({
    class_id: z.string(),
    class_name: z.string(),
    teacher_id: z.string(),
    teacher_name: z.string(),
    teacher_email: z.string(),
    assigned_at: z.string(),
  }).optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type AssignTeacherOutput = z.infer<typeof AssignTeacherOutputSchema>;

export const assignTeacher = {
  name: 'assign-teacher',
  description: 'Assign a teacher to a class',
  scopes: ['admin.write.class', 'admin.write.assignment'],
  inputSchema: AssignTeacherSchema,
  outputSchema: AssignTeacherOutputSchema,

  execute: async (
    input: AssignTeacherInput,
    user: User
  ): Promise<AssignTeacherOutput> => {
    // Validate input
    const validated = AssignTeacherSchema.parse(input);

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
      // Verify teacher exists and has teacher role
      const { data: teacher, error: teacherError } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('id', validated.teacher_id)
        .eq('tenant_id', user.tenant_id)
        .single();

      if (teacherError || !teacher) {
        throw new Error(`Teacher not found: ${validated.teacher_id}`);
      }

      if (teacher.role !== 'teacher' && teacher.role !== 'admin') {
        throw new Error(`User ${teacher.email} is not a teacher (role: ${teacher.role})`);
      }

      // Verify class exists
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name, teacher_id')
        .eq('id', validated.class_id)
        .eq('tenant_id', user.tenant_id)
        .single();

      if (classError || !classData) {
        throw new Error(`Class not found: ${validated.class_id}`);
      }

      // Store previous assignment for audit
      const previousTeacherId = classData.teacher_id;

      // Update class with new teacher
      const { data: updatedClass, error: updateError } = await supabase
        .from('classes')
        .update({
          teacher_id: validated.teacher_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', validated.class_id)
        .eq('tenant_id', user.tenant_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Create assignment record in class_teachers table (if it exists)
      try {
        await supabase
          .from('class_teachers')
          .insert({
            class_id: validated.class_id,
            teacher_id: validated.teacher_id,
            assigned_by: user.id,
            assigned_at: new Date().toISOString(),
            start_date: validated.start_date || new Date().toISOString(),
            end_date: validated.end_date,
            notes: validated.notes,
            tenant_id: user.tenant_id,
          });
      } catch (e) {
        // Table might not exist, continue
        console.warn('[assign-teacher] Could not create class_teachers record:', e);
      }

      // Audit log
      await auditLog({
        supabase,
        actor_id: user.id,
        action: 'assign-teacher',
        resource_type: 'class',
        resource_id: validated.class_id,
        changes: {
          before: { teacher_id: previousTeacherId },
          after: { teacher_id: validated.teacher_id },
          teacher_name: teacher.name,
          class_name: classData.name,
        },
        tenant_id: user.tenant_id,
      });

      return {
        success: true,
        assignment: {
          class_id: updatedClass.id,
          class_name: updatedClass.name,
          teacher_id: teacher.id,
          teacher_name: teacher.name,
          teacher_email: teacher.email,
          assigned_at: updatedClass.updated_at,
        },
        message: `Teacher ${teacher.name} (${teacher.email}) has been assigned to class ${classData.name}`,
      };
    } catch (error: any) {
      console.error('[assign-teacher] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to assign teacher',
      };
    }
  },
};
