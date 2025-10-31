import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

/**
 * Input schema for plan-roster tool
 */
export const PlanRosterInputSchema = z.object({
  classId: z.string().uuid('Valid class ID is required'),
  teacherId: z.string().uuid('Valid teacher ID is required'),
  start: z.string().datetime('Valid ISO 8601 datetime is required'),
  end: z.string().datetime('Valid ISO 8601 datetime is required'),
});

/**
 * Output schema for plan-roster tool
 */
export const PlanRosterOutputSchema = z.object({
  rosterId: z.string(),
});

/**
 * Tool metadata for MCP registration
 */
export const planRosterMetadata: MCPTool = {
  name: 'plan-roster',
  description: 'Plan a roster assignment for a teacher to a class. Validates teacher availability and workload. Requires admin.write.roster scope.',
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
      start: {
        type: 'string',
        format: 'date-time',
        description: 'Start date/time of the roster assignment',
      },
      end: {
        type: 'string',
        format: 'date-time',
        description: 'End date/time of the roster assignment',
      },
    },
    required: ['classId', 'teacherId', 'start', 'end'],
  },
};

/**
 * Validate teacher availability for the proposed roster period
 *
 * @param supabase - Supabase client
 * @param teacherId - Teacher ID
 * @param start - Start date
 * @param end - End date
 * @throws {Error} If teacher has conflicts
 */
async function validateTeacherAvailability(
  supabase: ReturnType<typeof createSupabaseClient>,
  teacherId: string,
  start: string,
  end: string
): Promise<void> {
  // Check for overlapping roster assignments
  const { data: conflicts } = await supabase
    .from('rosters')
    .select('*')
    .eq('teacher_id', teacherId)
    .or(`and(start.lte.${end},end.gte.${start})`);

  if (conflicts && conflicts.length > 0) {
    throw new Error(
      `Teacher has ${conflicts.length} conflicting roster assignment(s) during this period`
    );
  }

  // Check teacher's maximum load
  const { data: currentLoad } = await supabase
    .from('rosters')
    .select('*')
    .eq('teacher_id', teacherId)
    .gte('end', new Date().toISOString());

  if (currentLoad && currentLoad.length >= 5) {
    // Assuming max 5 concurrent classes
    throw new Error(
      `Teacher has reached maximum workload (${currentLoad.length} active assignments)`
    );
  }
}

/**
 * Plan a roster assignment
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Roster planning details
 * @returns Roster ID of the created assignment
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If validation fails or roster creation fails
 */
export async function executePlanRoster(
  context: AdminContext,
  input: z.infer<typeof PlanRosterInputSchema>
): Promise<z.infer<typeof PlanRosterOutputSchema>> {
  // 1. Validate input
  const validated = PlanRosterInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_WRITE_ROSTER);

  // 3. Validate date range
  if (new Date(validated.start) >= new Date(validated.end)) {
    throw new Error('Start date must be before end date');
  }

  // 4. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 5. Verify class exists
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('*')
    .eq('id', validated.classId)
    .single();

  if (classError || !classData) {
    throw new Error(`Class not found: ${validated.classId}`);
  }

  // 6. Verify teacher exists and has teacher role
  const { data: teacherData, error: teacherError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', validated.teacherId)
    .single();

  if (teacherError || !teacherData) {
    throw new Error(`Teacher not found: ${validated.teacherId}`);
  }

  if (!teacherData.role.includes('teacher')) {
    throw new Error(`User ${validated.teacherId} is not a teacher`);
  }

  // 7. Validate teacher availability
  await validateTeacherAvailability(
    supabase,
    validated.teacherId,
    validated.start,
    validated.end
  );

  // 8. Create roster assignment
  const { data: newRoster, error: rosterError } = await supabase
    .from('rosters')
    .insert({
      class_id: validated.classId,
      teacher_id: validated.teacherId,
      start: validated.start,
      end: validated.end,
    })
    .select()
    .single();

  if (rosterError || !newRoster) {
    throw new Error(`Failed to create roster: ${rosterError?.message || 'Unknown error'}`);
  }

  // 9. Capture after state
  const { data: after } = await supabase
    .from('rosters')
    .select('*')
    .eq('id', newRoster.id)
    .single();

  // 10. Emit audit entry
  audit({
    actor: context.actorId,
    action: 'roster.create',
    target: `roster/${newRoster.id}`,
    scope: SCOPES.ADMIN_WRITE_ROSTER,
    before: undefined,
    after,
    correlationId: generateCorrelationId(),
  });

  // 11. Return result
  return { rosterId: newRoster.id };
}
