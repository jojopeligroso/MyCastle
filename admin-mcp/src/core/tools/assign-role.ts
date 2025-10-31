import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES, isSuperAdmin } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';
import { AuthorizationError } from '../../types/index.js';

/**
 * Input schema for assign-role tool
 */
export const AssignRoleInputSchema = z.object({
  userId: z.string().uuid('Valid user ID is required'),
  role: z.string().min(1, 'Role name is required'),
});

/**
 * Output schema for assign-role tool
 */
export const AssignRoleOutputSchema = z.object({
  assigned: z.boolean(),
});

/**
 * Tool metadata for MCP registration
 */
export const assignRoleMetadata: MCPTool = {
  name: 'assign-role',
  description: 'Assign a role to a user. Requires admin.write.role scope. Cannot escalate beyond caller scope.',
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the user to assign role to',
      },
      role: {
        type: 'string',
        description: 'Role name to assign',
      },
    },
    required: ['userId', 'role'],
  },
};

/**
 * Check if caller can assign the target role
 * Prevents privilege escalation
 *
 * @param context - Admin context
 * @param targetRole - Role to be assigned
 * @throws {AuthorizationError} If caller cannot assign this role
 */
function validateRoleEscalation(context: AdminContext, targetRole: string): void {
  // Super admin can assign any role
  if (isSuperAdmin(context)) {
    return;
  }

  // Regular admin cannot assign super_admin role
  if (targetRole === 'super_admin' || targetRole === 'admin') {
    throw new AuthorizationError(
      `Cannot assign role '${targetRole}' - insufficient privileges. Only super admins can assign admin roles.`
    );
  }

  // Additional role hierarchy checks could be added here
  // For example, ensuring teacher_admin can only assign teacher/student roles
}

/**
 * Assign a role to a user
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Role assignment details
 * @returns Assignment success status
 * @throws {AuthorizationError} If missing required scope or attempting privilege escalation
 * @throws {Error} If user not found or assignment fails
 */
export async function executeAssignRole(
  context: AdminContext,
  input: z.infer<typeof AssignRoleInputSchema>
): Promise<z.infer<typeof AssignRoleOutputSchema>> {
  // 1. Validate input
  const validated = AssignRoleInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_WRITE_ROLE);

  // 3. Check role escalation
  validateRoleEscalation(context, validated.role);

  // 4. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 5. Capture before state
  const { data: before, error: beforeError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', validated.userId)
    .single();

  if (beforeError || !before) {
    throw new Error(`User not found: ${validated.userId}`);
  }

  // 6. Update user role
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: validated.role })
    .eq('id', validated.userId);

  if (updateError) {
    throw new Error(`Failed to assign role: ${updateError.message}`);
  }

  // 7. Capture after state
  const { data: after } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', validated.userId)
    .single();

  // 8. Emit audit entry
  audit({
    actor: context.actorId,
    action: 'user.role.assign',
    target: `user/${validated.userId}/role/${validated.role}`,
    scope: SCOPES.ADMIN_WRITE_ROLE,
    before,
    after,
    correlationId: generateCorrelationId(),
  });

  // 9. Return result
  return { assigned: true };
}
