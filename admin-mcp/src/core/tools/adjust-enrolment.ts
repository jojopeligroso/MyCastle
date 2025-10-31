import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

/**
 * Valid enrolment statuses
 */
const EnrolmentStatus = z.enum([
  'pending',
  'active',
  'suspended',
  'completed',
  'withdrawn',
  'cancelled',
]);

/**
 * Input schema for adjust-enrolment tool
 */
export const AdjustEnrolmentInputSchema = z.object({
  enrolmentId: z.string().uuid('Valid enrolment ID is required'),
  status: EnrolmentStatus,
  note: z.string().optional(),
});

/**
 * Output schema for adjust-enrolment tool
 */
export const AdjustEnrolmentOutputSchema = z.object({
  status: z.string(),
});

/**
 * Tool metadata for MCP registration
 */
export const adjustEnrolmentMetadata: MCPTool = {
  name: 'adjust-enrolment',
  description: 'Adjust enrolment status with validation of status transitions. Requires admin.write.enrolment scope.',
  inputSchema: {
    type: 'object',
    properties: {
      enrolmentId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the enrolment to adjust',
      },
      status: {
        type: 'string',
        enum: ['pending', 'active', 'suspended', 'completed', 'withdrawn', 'cancelled'],
        description: 'New status for the enrolment',
      },
      note: {
        type: 'string',
        description: 'Optional note explaining the status change',
      },
    },
    required: ['enrolmentId', 'status'],
  },
};

/**
 * Valid status transitions
 * Maps current status to allowed next statuses
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['active', 'cancelled'],
  active: ['suspended', 'completed', 'withdrawn'],
  suspended: ['active', 'withdrawn'],
  completed: [], // Terminal state
  withdrawn: [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * Validate status transition
 *
 * @param currentStatus - Current enrolment status
 * @param newStatus - Proposed new status
 * @throws {Error} If transition is invalid
 */
function validateStatusTransition(currentStatus: string, newStatus: string): void {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Invalid status transition from '${currentStatus}' to '${newStatus}'. ` +
      `Allowed transitions: ${allowedTransitions.join(', ') || 'none (terminal state)'}`
    );
  }
}

/**
 * Adjust an enrolment's status
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Enrolment adjustment details
 * @returns New status of the enrolment
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If enrolment not found, invalid transition, or update fails
 */
export async function executeAdjustEnrolment(
  context: AdminContext,
  input: z.infer<typeof AdjustEnrolmentInputSchema>
): Promise<z.infer<typeof AdjustEnrolmentOutputSchema>> {
  // 1. Validate input
  const validated = AdjustEnrolmentInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_WRITE_ENROLMENT);

  // 3. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Capture before state
  const { data: before, error: beforeError } = await supabase
    .from('enrolments')
    .select('*')
    .eq('id', validated.enrolmentId)
    .single();

  if (beforeError || !before) {
    throw new Error(`Enrolment not found: ${validated.enrolmentId}`);
  }

  // 5. Validate status transition
  validateStatusTransition(before.status, validated.status);

  // 6. Update enrolment
  const updateData: Record<string, unknown> = {
    status: validated.status,
    updated_at: new Date().toISOString(),
  };

  if (validated.note) {
    updateData.status_note = validated.note;
  }

  const { error: updateError } = await supabase
    .from('enrolments')
    .update(updateData)
    .eq('id', validated.enrolmentId);

  if (updateError) {
    throw new Error(`Failed to adjust enrolment: ${updateError.message}`);
  }

  // 7. Capture after state
  const { data: after } = await supabase
    .from('enrolments')
    .select('*')
    .eq('id', validated.enrolmentId)
    .single();

  // 8. Emit audit entry
  audit({
    actor: context.actorId,
    action: 'enrolment.adjust',
    target: `enrolment/${validated.enrolmentId}`,
    scope: SCOPES.ADMIN_WRITE_ENROLMENT,
    before,
    after,
    correlationId: generateCorrelationId(),
  });

  // 9. Return result
  return { status: validated.status };
}
