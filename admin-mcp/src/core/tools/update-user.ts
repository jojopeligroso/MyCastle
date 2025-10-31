import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

/**
 * Input schema for update-user tool
 */
export const UpdateUserInputSchema = z.object({
  userId: z.string().uuid('Valid user ID is required'),
  fullName: z.string().min(1).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  roles: z.array(z.string()).optional(),
});

/**
 * Output schema for update-user tool
 */
export const UpdateUserOutputSchema = z.object({
  updated: z.boolean(),
});

/**
 * Tool metadata for MCP registration
 */
export const updateUserMetadata: MCPTool = {
  name: 'update-user',
  description: 'Update user profile fields including full name, status, and roles. Requires admin.write.user scope.',
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the user to update',
      },
      fullName: {
        type: 'string',
        description: 'Updated full name (optional)',
      },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'suspended'],
        description: 'Updated status (optional)',
      },
      roles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Updated roles array (optional)',
      },
    },
    required: ['userId'],
  },
};

/**
 * Update an existing user's profile
 *
 * @param context - Admin context with actor information and scopes
 * @param input - User update details
 * @returns Update success status
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If user not found or update fails
 */
export async function executeUpdateUser(
  context: AdminContext,
  input: z.infer<typeof UpdateUserInputSchema>
): Promise<z.infer<typeof UpdateUserOutputSchema>> {
  // 1. Validate input
  const validated = UpdateUserInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_WRITE_USER);

  // 3. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Capture before state
  const { data: before, error: beforeError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', validated.userId)
    .single();

  if (beforeError || !before) {
    throw new Error(`User not found: ${validated.userId}`);
  }

  // 5. Build update object
  const updateData: Record<string, unknown> = {};
  if (validated.fullName !== undefined) {
    updateData.full_name = validated.fullName;
  }
  if (validated.status !== undefined) {
    // Note: 'status' field might not exist in profiles table,
    // adjust based on actual schema
    updateData.status = validated.status;
  }
  if (validated.roles !== undefined && validated.roles.length > 0) {
    // Update primary role
    updateData.role = validated.roles[0];
  }

  // 6. Perform update
  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', validated.userId);

  if (updateError) {
    throw new Error(`Failed to update user: ${updateError.message}`);
  }

  // 7. Capture after state
  const { data: after } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', validated.userId)
    .single();

  // 8. Emit audit entry
  const correlationId = generateCorrelationId();
  audit({
    actor: context.actorId,
    action: 'user.update',
    target: `user/${validated.userId}`,
    scope: SCOPES.ADMIN_WRITE_USER,
    before,
    after,
    correlationId,
  });

  // 9. Return result
  return { updated: true };
}
