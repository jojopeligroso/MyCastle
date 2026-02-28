/**
 * Update User Tool
 * Updates existing user information
 */

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { auditLog } from '../lib/audit.js';
import type { User } from '../types/user.js';

// Input schema
export const UpdateUserSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// Output schema
export const UpdateUserOutputSchema = z.object({
  success: z.boolean(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
    phone: z.string().nullable().optional(),
    updated_at: z.string(),
  }).optional(),
  error: z.string().optional(),
});

export type UpdateUserOutput = z.infer<typeof UpdateUserOutputSchema>;

export const updateUser = {
  name: 'update-user',
  description: 'Update existing user information (name, email, phone, metadata)',
  scopes: ['admin.write.user'],
  inputSchema: UpdateUserSchema,
  outputSchema: UpdateUserOutputSchema,

  execute: async (
    input: UpdateUserInput,
    user: User
  ): Promise<UpdateUserOutput> => {
    // Validate input
    const validated = UpdateUserSchema.parse(input);

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
      // First, get the current user data
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', validated.user_id)
        .eq('tenant_id', user.tenant_id)
        .single();

      if (fetchError || !existingUser) {
        throw new Error(`User not found: ${validated.user_id}`);
      }

      // Build update object with only provided fields
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.email !== undefined) updateData.email = validated.email;
      if (validated.phone !== undefined) updateData.phone = validated.phone;
      if (validated.metadata !== undefined) updateData.metadata = validated.metadata;

      // Update user
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', validated.user_id)
        .eq('tenant_id', user.tenant_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Audit log
      await auditLog({
        supabase,
        actor_id: user.id,
        action: 'update-user',
        resource_type: 'user',
        resource_id: updatedUser.id,
        changes: {
          before: existingUser,
          after: updatedUser,
        },
        tenant_id: user.tenant_id,
      });

      return {
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          phone: updatedUser.phone,
          updated_at: updatedUser.updated_at,
        },
      };
    } catch (error: any) {
      console.error('[update-user] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update user',
      };
    }
  },
};
