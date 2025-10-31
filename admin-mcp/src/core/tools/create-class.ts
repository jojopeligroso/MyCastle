import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

/**
 * Schedule schema for class times
 */
const ScheduleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6), // 0 = Sunday, 6 = Saturday
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  room: z.string().optional(),
});

/**
 * Input schema for create-class tool
 */
export const CreateClassInputSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  level: z.string().min(1, 'Level is required'),
  schedule: z.array(ScheduleSchema).min(1, 'At least one schedule entry is required'),
  capacity: z.number().int().positive('Capacity must be a positive integer'),
});

/**
 * Output schema for create-class tool
 */
export const CreateClassOutputSchema = z.object({
  classId: z.string(),
});

/**
 * Tool metadata for MCP registration
 */
export const createClassMetadata: MCPTool = {
  name: 'create-class',
  description: 'Create a new class with name, level, schedule, and capacity. Checks for schedule conflicts. Requires admin.write.class scope.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the class',
      },
      level: {
        type: 'string',
        description: 'Level of the class (e.g., A1, A2, B1, B2)',
      },
      schedule: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            dayOfWeek: { type: 'number', minimum: 0, maximum: 6 },
            startTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
            endTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
            room: { type: 'string' },
          },
          required: ['dayOfWeek', 'startTime', 'endTime'],
        },
        description: 'Schedule entries for the class',
      },
      capacity: {
        type: 'number',
        description: 'Maximum number of students in the class',
      },
    },
    required: ['name', 'level', 'schedule', 'capacity'],
  },
};

/**
 * Check for schedule conflicts with existing classes
 *
 * @param supabase - Supabase client
 * @param schedule - Proposed schedule
 * @returns True if conflict detected
 */
async function hasScheduleConflict(
  supabase: ReturnType<typeof createSupabaseClient>,
  schedule: z.infer<typeof ScheduleSchema>[]
): Promise<{ hasConflict: boolean; conflictDetails?: string }> {
  // Note: This is a simplified conflict check
  // In production, you'd query a classes table with schedule data
  // and check for overlapping times on the same day/room

  for (const entry of schedule) {
    if (entry.room) {
      // Check if same room is used at overlapping times
      // This would require a proper classes/schedules table
      // For now, we'll do a basic check
      const { data: existingClasses } = await supabase
        .from('classes')
        .select('*')
        .contains('schedule', [{ dayOfWeek: entry.dayOfWeek, room: entry.room }]);

      if (existingClasses && existingClasses.length > 0) {
        // Would need more sophisticated time overlap checking
        return {
          hasConflict: true,
          conflictDetails: `Room ${entry.room} may have scheduling conflict on day ${entry.dayOfWeek}`,
        };
      }
    }
  }

  return { hasConflict: false };
}

/**
 * Create a new class
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Class creation details
 * @returns Class ID of the created class
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If class creation fails or schedule conflict detected
 */
export async function executeCreateClass(
  context: AdminContext,
  input: z.infer<typeof CreateClassInputSchema>
): Promise<z.infer<typeof CreateClassOutputSchema>> {
  // 1. Validate input
  const validated = CreateClassInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_WRITE_CLASS);

  // 3. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Check for schedule conflicts
  const conflictCheck = await hasScheduleConflict(supabase, validated.schedule);
  if (conflictCheck.hasConflict) {
    throw new Error(`Schedule conflict detected: ${conflictCheck.conflictDetails}`);
  }

  // 5. Create class
  const { data: newClass, error: classError } = await supabase
    .from('classes')
    .insert({
      name: validated.name,
      level: validated.level,
      schedule: validated.schedule,
      capacity: validated.capacity,
    })
    .select()
    .single();

  if (classError || !newClass) {
    throw new Error(`Failed to create class: ${classError?.message || 'Unknown error'}`);
  }

  // 6. Capture after state
  const { data: after } = await supabase
    .from('classes')
    .select('*')
    .eq('id', newClass.id)
    .single();

  // 7. Emit audit entry
  audit({
    actor: context.actorId,
    action: 'class.create',
    target: `class/${newClass.id}`,
    scope: SCOPES.ADMIN_WRITE_CLASS,
    before: undefined,
    after,
    correlationId: generateCorrelationId(),
  });

  // 8. Return result
  return { classId: newClass.id };
}
