import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

/**
 * Valid vendor statuses
 */
const VendorStatus = z.enum(['active', 'inactive', 'suspended', 'terminated']);

/**
 * Input schema for vendor-status tool
 */
export const VendorStatusInputSchema = z.object({
  providerId: z.string().uuid('Valid provider ID is required'),
  status: VendorStatus,
});

/**
 * Output schema for vendor-status tool
 */
export const VendorStatusOutputSchema = z.object({
  updated: z.boolean(),
});

/**
 * Tool metadata for MCP registration
 */
export const vendorStatusMetadata: MCPTool = {
  name: 'vendor-status',
  description: 'Update vendor/provider status. Cascades visibility changes to related entities. Requires admin.write.vendor scope.',
  inputSchema: {
    type: 'object',
    properties: {
      providerId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the vendor/provider',
      },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'suspended', 'terminated'],
        description: 'New status for the vendor',
      },
    },
    required: ['providerId', 'status'],
  },
};

/**
 * Cascade visibility changes based on vendor status
 *
 * @param supabase - Supabase client
 * @param providerId - Provider ID
 * @param status - New status
 * @param correlationId - Correlation ID for audit trail
 * @param actorId - Actor performing the change
 */
async function cascadeVisibilityChanges(
  supabase: ReturnType<typeof createSupabaseClient>,
  providerId: string,
  status: string,
  correlationId: string,
  actorId: string
): Promise<void> {
  // If vendor is suspended or terminated, mark future placements as affected
  if (status === 'suspended' || status === 'terminated') {
    const now = new Date().toISOString();

    // Update future accommodation placements
    const { data: affectedPlacements, error: updateError } = await supabase
      .from('accommodation_placements')
      .update({
        status: 'provider_suspended',
        updated_at: now,
      })
      .eq('provider_id', providerId)
      .gte('end', now)
      .select();

    if (updateError) {
      throw new Error(`Failed to cascade visibility changes: ${updateError.message}`);
    }

    // Emit audit for affected placements
    for (const placement of affectedPlacements || []) {
      audit({
        actor: actorId,
        action: 'accommodation.cascade_suspend',
        target: `accommodation/${placement.id}`,
        scope: SCOPES.ADMIN_WRITE_VENDOR,
        before: undefined,
        after: { providerId, status, placementId: placement.id },
        correlationId,
      });
    }
  }

  // If vendor is reactivated, update placements
  if (status === 'active') {
    const { data: reactivatedPlacements } = await supabase
      .from('accommodation_placements')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('provider_id', providerId)
      .eq('status', 'provider_suspended')
      .select();

    // Emit audit for reactivated placements
    for (const placement of reactivatedPlacements || []) {
      audit({
        actor: actorId,
        action: 'accommodation.cascade_reactivate',
        target: `accommodation/${placement.id}`,
        scope: SCOPES.ADMIN_WRITE_VENDOR,
        before: undefined,
        after: { providerId, status, placementId: placement.id },
        correlationId,
      });
    }
  }
}

/**
 * Update vendor status
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Vendor status update details
 * @returns Update success status
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If vendor not found or update fails
 */
export async function executeVendorStatus(
  context: AdminContext,
  input: z.infer<typeof VendorStatusInputSchema>
): Promise<z.infer<typeof VendorStatusOutputSchema>> {
  // 1. Validate input
  const validated = VendorStatusInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_WRITE_VENDOR);

  // 3. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Capture before state
  const { data: before, error: beforeError } = await supabase
    .from('accommodation_providers')
    .select('*')
    .eq('id', validated.providerId)
    .single();

  if (beforeError || !before) {
    throw new Error(`Vendor not found: ${validated.providerId}`);
  }

  // 5. Check if status is actually changing
  if (before.status === validated.status) {
    return { updated: false };
  }

  // 6. Update vendor status
  const { error: updateError } = await supabase
    .from('accommodation_providers')
    .update({
      status: validated.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.providerId);

  if (updateError) {
    throw new Error(`Failed to update vendor status: ${updateError.message}`);
  }

  // 7. Capture after state
  const { data: after } = await supabase
    .from('accommodation_providers')
    .select('*')
    .eq('id', validated.providerId)
    .single();

  // 8. Generate correlation ID
  const correlationId = generateCorrelationId();

  // 9. Emit audit entry
  audit({
    actor: context.actorId,
    action: 'vendor.status_update',
    target: `vendor/${validated.providerId}`,
    scope: SCOPES.ADMIN_WRITE_VENDOR,
    before,
    after,
    correlationId,
  });

  // 10. Cascade visibility changes
  await cascadeVisibilityChanges(
    supabase,
    validated.providerId,
    validated.status,
    correlationId,
    context.actorId
  );

  // 11. Return result
  return { updated: true };
}
