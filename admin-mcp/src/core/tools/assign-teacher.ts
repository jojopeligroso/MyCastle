import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

/**
 * Input schema for assign-teacher tool
 */
export const AssignTeacherInputSchema = z.object({
  classId: z.string().uuid('Valid class ID is required'),
  teacherId: z.string().uuid('Valid teacher ID is required'),
});

/**
 * Output schema for assign-teacher tool
 */
export const AssignTeacherOutputSchema = z.object({
  success: z.boolean(),
  classId: z.string(),
  teacherId: z.string(),
});

/**
 * Tool metadata for MCP registration
 */
export const assignTeacherMetadata: MCPTool = {
  name: 'assign-teacher',
  description: 'Assign a teacher to a class. Validates teacher exists, has teacher role, and checks for scheduling conflicts. Requires admin.write.class scope.',
  inputSchema: {
    type: 'object',
    properties: {
      classId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the class',
      },
      teacherId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the teacher to assign',
      },
    },
    required: ['classId', 'teacherId'],
  },
};

/**
 * Check if teacher has scheduling conflicts
 *
 * @param supabase - Supabase client
 * @param teacherId - Teacher ID to check
 * @param classId - Class ID to assign
 * @returns Conflict check result
 */
async function checkTeacherAvailability(
  supabase: ReturnType<typeof createSupabaseClient>,
  teacherId: string,
  classId: string
): Promise<{ available: boolean; conflictDetails?: string }> {
  // Get the class schedule we're trying to assign
  const { data: targetClass, error: classError } = await supabase
    .from('classes')
    .select('schedule, start_date, end_date, schedule_description')
    .eq('id', classId)
    .single();

  if (classError || !targetClass) {
    throw new Error(`Class not found: ${classId}`);
  }

  // Get all other classes this teacher is assigned to
  const { data: teacherClasses, error: teacherClassError } = await supabase
    .from('classes')
    .select('id, name, schedule, start_date, end_date, schedule_description')
    .eq('teacher_id', teacherId)
    .eq('status', 'active')
    .neq('id', classId); // Exclude the class we're assigning (in case of reassignment)

  if (teacherClassError) {
    throw new Error(`Failed to check teacher availability: ${teacherClassError.message}`);
  }

  if (!teacherClasses || teacherClasses.length === 0) {
    // No other classes, teacher is available
    return { available: true };
  }

  // Check for date range overlaps and schedule conflicts
  // This is a simplified check - in production you'd need more sophisticated time overlap logic
  for (const existingClass of teacherClasses) {
    const targetStart = new Date(targetClass.start_date);
    const targetEnd = targetClass.end_date ? new Date(targetClass.end_date) : null;
    const existingStart = new Date(existingClass.start_date);
    const existingEnd = existingClass.end_date ? new Date(existingClass.end_date) : null;

    // Check for date range overlap
    const hasDateOverlap =
      (existingEnd === null || targetStart <= existingEnd) &&
      (targetEnd === null || existingStart <= targetEnd);

    if (hasDateOverlap) {
      // In production, would check detailed schedule times here
      // For now, we'll warn about potential conflicts
      return {
        available: false,
        conflictDetails: `Teacher has overlapping assignment to class "${existingClass.name}" (${existingClass.schedule_description || 'Schedule TBD'})`,
      };
    }
  }

  return { available: true };
}

/**
 * Assign a teacher to a class
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Teacher assignment details
 * @returns Assignment confirmation
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If class/teacher not found, teacher not qualified, or scheduling conflict
 */
export async function executeAssignTeacher(
  context: AdminContext,
  input: z.infer<typeof AssignTeacherInputSchema>
): Promise<z.infer<typeof AssignTeacherOutputSchema>> {
  // 1. Validate input
  const validated = AssignTeacherInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_WRITE_CLASS);

  // 3. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Verify teacher exists and has teacher role
  const { data: teacher, error: teacherError } = await supabase
    .from('users')
    .select('id, role, full_name, is_active')
    .eq('id', validated.teacherId)
    .single();

  if (teacherError || !teacher) {
    throw new Error(`Teacher not found: ${validated.teacherId}`);
  }

  if (teacher.role !== 'teacher' && teacher.role !== 'admin') {
    throw new Error(`User ${teacher.full_name} does not have teacher role (current role: ${teacher.role})`);
  }

  if (!teacher.is_active) {
    throw new Error(`Teacher ${teacher.full_name} is not active`);
  }

  // 5. Verify class exists
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('*')
    .eq('id', validated.classId)
    .single();

  if (classError || !classData) {
    throw new Error(`Class not found: ${validated.classId}`);
  }

  // 6. Capture before state
  const before = {
    classId: classData.id,
    className: classData.name,
    previousTeacherId: classData.teacher_id,
  };

  // 7. Check teacher availability
  const availabilityCheck = await checkTeacherAvailability(
    supabase,
    validated.teacherId,
    validated.classId
  );

  if (!availabilityCheck.available) {
    throw new Error(`Teacher assignment conflict: ${availabilityCheck.conflictDetails}`);
  }

  // 8. Assign teacher to class
  const { data: updated, error: updateError } = await supabase
    .from('classes')
    .update({
      teacher_id: validated.teacherId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.classId)
    .select()
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to assign teacher: ${updateError?.message || 'Unknown error'}`);
  }

  // 9. Capture after state
  const after = {
    classId: updated.id,
    className: updated.name,
    teacherId: updated.teacher_id,
    teacherName: teacher.full_name,
  };

  // 10. Emit audit entry
  audit({
    actor: context.actorId,
    action: 'class.assign_teacher',
    target: `class/${validated.classId}`,
    scope: SCOPES.ADMIN_WRITE_CLASS,
    before,
    after,
    correlationId: generateCorrelationId(),
  });

  // 11. Return result
  return {
    success: true,
    classId: validated.classId,
    teacherId: validated.teacherId,
  };
}
