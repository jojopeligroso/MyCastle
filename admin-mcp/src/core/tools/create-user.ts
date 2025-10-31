import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

/**
 * Input schema for create-user tool
 */
export const CreateUserInputSchema = z.object({
  email: z.string().email('Valid email address is required'),
  fullName: z.string().min(1, 'Full name is required'),
  roles: z.array(z.string()).min(1, 'At least one role is required'),
});

/**
 * Output schema for create-user tool
 */
export const CreateUserOutputSchema = z.object({
  userId: z.string(),
});

/**
 * Tool metadata for MCP registration
 */
export const createUserMetadata: MCPTool = {
  name: 'create-user',
  description: 'Create a new user with email, full name, and assigned roles. Requires admin.write.user scope.',
  inputSchema: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'Email address of the new user',
      },
      fullName: {
        type: 'string',
        description: 'Full name of the user',
      },
      roles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of role names to assign to the user',
      },
    },
    required: ['email', 'fullName', 'roles'],
  },
};

/**
 * Create a new user in the system
 *
 * @param context - Admin context with actor information and scopes
 * @param input - User creation details
 * @returns User ID of the created user
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If user creation fails
 */
export async function executeCreateUser(
  context: AdminContext,
  input: z.infer<typeof CreateUserInputSchema>
): Promise<z.infer<typeof CreateUserOutputSchema>> {
  // 1. Validate input
  const validated = CreateUserInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_WRITE_USER);

  // 3. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Check if user already exists
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', validated.email)
    .single();

  if (existingUser) {
    throw new Error(`User with email ${validated.email} already exists`);
  }

  // 5. Create user profile
  const { data: newUser, error: userError } = await supabase
    .from('profiles')
    .insert({
      email: validated.email,
      full_name: validated.fullName,
      role: validated.roles[0], // Primary role
    })
    .select()
    .single();

  if (userError || !newUser) {
    throw new Error(`Failed to create user: ${userError?.message || 'Unknown error'}`);
  }

  // 6. Capture after state
  const { data: after } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', newUser.id)
    .single();

  // 7. Generate correlation ID for related operations
  const correlationId = generateCorrelationId();

  // 8. Emit audit entry
  audit({
    actor: context.actorId,
    action: 'user.create',
    target: `user/${newUser.id}`,
    scope: SCOPES.ADMIN_WRITE_USER,
    before: undefined,
    after,
    correlationId,
  });

  // 9. Emit audit for role assignments
  for (const role of validated.roles) {
    audit({
      actor: context.actorId,
      action: 'user.role.assign',
      target: `user/${newUser.id}/role/${role}`,
      scope: SCOPES.ADMIN_WRITE_USER,
      before: undefined,
      after: { userId: newUser.id, role },
      correlationId,
    });
  }

  // 10. Return result
  return { userId: newUser.id };
}
