/**
 * Suspend User Tool
 * Suspends user account and revokes active sessions
 */

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { auditLog } from '../lib/audit.js';
import type { User } from '../types/user.js';

// Input schema
export const SuspendUserSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
  reason: z.string().min(1, 'Reason is required'),
  notify: z.boolean().default(true).describe('Send notification email to user'),
});

export type SuspendUserInput = z.infer<typeof SuspendUserSchema>;

// Output schema
export const SuspendUserOutputSchema = z.object({
  success: z.boolean(),
  user_id: z.string().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type SuspendUserOutput = z.infer<typeof SuspendUserOutputSchema>;

export const suspendUser = {
  name: 'suspend-user',
  description: 'Suspend user account and revoke active sessions',
  scopes: ['admin.write.user'],
  inputSchema: SuspendUserSchema,
  outputSchema: SuspendUserOutputSchema,

  execute: async (
    input: SuspendUserInput,
    user: User
  ): Promise<SuspendUserOutput> => {
    // Validate input
    const validated = SuspendUserSchema.parse(input);

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
      // Get current user data
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', validated.user_id)
        .eq('tenant_id', user.tenant_id)
        .single();

      if (fetchError || !existingUser) {
        throw new Error(`User not found: ${validated.user_id}`);
      }

      // Prevent suspending yourself
      if (validated.user_id === user.id) {
        throw new Error('Cannot suspend your own account');
      }

      // Prevent suspending the last admin
      if (existingUser.role === 'admin') {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin')
          .eq('status', 'active')
          .eq('tenant_id', user.tenant_id);

        if (count && count <= 1) {
          throw new Error('Cannot suspend the last active admin');
        }
      }

      // Update user status to suspended
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspended_by: user.id,
          suspension_reason: validated.reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', validated.user_id)
        .eq('tenant_id', user.tenant_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Revoke active sessions (if sessions table exists)
      // This is optional - depends on your auth implementation
      try {
        await supabase
          .from('sessions')
          .update({ revoked: true, revoked_at: new Date().toISOString() })
          .eq('user_id', validated.user_id)
          .eq('revoked', false);
      } catch (e) {
        // Sessions table might not exist, continue
        console.warn('[suspend-user] Could not revoke sessions:', e);
      }

      // Audit log
      await auditLog({
        supabase,
        actor_id: user.id,
        action: 'suspend-user',
        resource_type: 'user',
        resource_id: updatedUser.id,
        changes: {
          before: existingUser,
          after: updatedUser,
          reason: validated.reason,
        },
        tenant_id: user.tenant_id,
      });

      // TODO: Send notification email if validated.notify is true
      // This would integrate with your email service

      return {
        success: true,
        user_id: updatedUser.id,
        message: `User ${existingUser.email} has been suspended. Reason: ${validated.reason}`,
      };
    } catch (error: any) {
      console.error('[suspend-user] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to suspend user',
      };
    }
  },
};
