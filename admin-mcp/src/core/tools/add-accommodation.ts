import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

/**
 * Input schema for add-accommodation tool
 */
export const AddAccommodationInputSchema = z.object({
  studentId: z.string().uuid('Valid student ID is required'),
  providerId: z.string().uuid('Valid provider ID is required'),
  start: z.string().datetime('Valid start date is required'),
  end: z.string().datetime('Valid end date is required'),
  cost: z.number().nonnegative('Cost must be non-negative'),
});

/**
 * Output schema for add-accommodation tool
 */
export const AddAccommodationOutputSchema = z.object({
  placementId: z.string(),
});

/**
 * Tool metadata for MCP registration
 */
export const addAccommodationMetadata: MCPTool = {
  name: 'add-accommodation',
  description: 'Add an accommodation placement for a student. Checks for date overlaps. Requires admin.write.accommodation scope.',
  inputSchema: {
    type: 'object',
    properties: {
      studentId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the student',
      },
      providerId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the accommodation provider',
      },
      start: {
        type: 'string',
        format: 'date-time',
        description: 'Start date of the accommodation',
      },
      end: {
        type: 'string',
        format: 'date-time',
        description: 'End date of the accommodation',
      },
      cost: {
        type: 'number',
        minimum: 0,
        description: 'Cost of the accommodation',
      },
    },
    required: ['studentId', 'providerId', 'start', 'end', 'cost'],
  },
};

/**
 * Check for overlapping accommodation placements
 *
 * @param supabase - Supabase client
 * @param studentId - Student ID
 * @param start - Start date
 * @param end - End date
 * @throws {Error} If overlapping placement found
 */
async function checkDateOverlaps(
  supabase: ReturnType<typeof createSupabaseClient>,
  studentId: string,
  start: string,
  end: string
): Promise<void> {
  // Find any accommodation placements for this student that overlap with the proposed dates
  const { data: overlapping } = await supabase
    .from('accommodation_placements')
    .select('*')
    .eq('student_id', studentId)
    .or(`and(start.lte.${end},end.gte.${start})`);

  if (overlapping && overlapping.length > 0) {
    throw new Error(
      `Student has ${overlapping.length} overlapping accommodation placement(s) during this period`
    );
  }
}

/**
 * Add an accommodation placement
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Accommodation placement details
 * @returns Placement ID
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If validation fails or placement creation fails
 */
export async function executeAddAccommodation(
  context: AdminContext,
  input: z.infer<typeof AddAccommodationInputSchema>
): Promise<z.infer<typeof AddAccommodationOutputSchema>> {
  // 1. Validate input
  const validated = AddAccommodationInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_WRITE_ACCOMMODATION);

  // 3. Validate date range
  if (new Date(validated.start) >= new Date(validated.end)) {
    throw new Error('Start date must be before end date');
  }

  // 4. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 5. Verify student exists
  const { data: student, error: studentError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', validated.studentId)
    .single();

  if (studentError || !student) {
    throw new Error(`Student not found: ${validated.studentId}`);
  }

  // 6. Verify provider exists and is active
  const { data: provider, error: providerError } = await supabase
    .from('accommodation_providers')
    .select('*')
    .eq('id', validated.providerId)
    .single();

  if (providerError || !provider) {
    throw new Error(`Accommodation provider not found: ${validated.providerId}`);
  }

  if (provider.status !== 'active') {
    throw new Error(`Accommodation provider ${validated.providerId} is not active (status: ${provider.status})`);
  }

  // 7. Check for date overlaps
  await checkDateOverlaps(supabase, validated.studentId, validated.start, validated.end);

  // 8. Create accommodation placement
  const { data: placement, error: placementError } = await supabase
    .from('accommodation_placements')
    .insert({
      student_id: validated.studentId,
      provider_id: validated.providerId,
      start: validated.start,
      end: validated.end,
      cost: validated.cost,
      created_by: context.actorId,
    })
    .select()
    .single();

  if (placementError || !placement) {
    throw new Error(`Failed to create accommodation placement: ${placementError?.message || 'Unknown error'}`);
  }

  // 9. Capture after state
  const { data: after } = await supabase
    .from('accommodation_placements')
    .select('*')
    .eq('id', placement.id)
    .single();

  // 10. Emit audit entry
  audit({
    actor: context.actorId,
    action: 'accommodation.create',
    target: `accommodation/${placement.id}`,
    scope: SCOPES.ADMIN_WRITE_ACCOMMODATION,
    before: undefined,
    after,
    correlationId: generateCorrelationId(),
  });

  // 11. Return result
  return { placementId: placement.id };
}
