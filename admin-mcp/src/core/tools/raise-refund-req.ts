import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

/**
 * Input schema for raise-refund-req tool
 */
export const RaiseRefundReqInputSchema = z.object({
  invoiceId: z.string().uuid('Valid invoice ID is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  amount: z.number().positive('Amount must be positive'),
});

/**
 * Output schema for raise-refund-req tool
 */
export const RaiseRefundReqOutputSchema = z.object({
  requestId: z.string(),
  status: z.literal('pending_approval'),
});

/**
 * Tool metadata for MCP registration
 */
export const raiseRefundReqMetadata: MCPTool = {
  name: 'raise-refund-req',
  description: 'Raise a refund request for an invoice. Creates approval request without executing refund. Requires admin.write.refund scope.',
  inputSchema: {
    type: 'object',
    properties: {
      invoiceId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the invoice to refund',
      },
      reason: {
        type: 'string',
        minLength: 10,
        description: 'Reason for the refund (minimum 10 characters)',
      },
      amount: {
        type: 'number',
        minimum: 0,
        exclusiveMinimum: true,
        description: 'Amount to refund',
      },
    },
    required: ['invoiceId', 'reason', 'amount'],
  },
};

/**
 * Raise a refund request
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Refund request details
 * @returns Request ID and status
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If invoice not found or request creation fails
 */
export async function executeRaiseRefundReq(
  context: AdminContext,
  input: z.infer<typeof RaiseRefundReqInputSchema>
): Promise<z.infer<typeof RaiseRefundReqOutputSchema>> {
  // 1. Validate input
  const validated = RaiseRefundReqInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_WRITE_REFUND);

  // 3. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Verify invoice exists
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', validated.invoiceId)
    .single();

  if (invoiceError || !invoice) {
    throw new Error(`Invoice not found: ${validated.invoiceId}`);
  }

  // 5. Validate refund amount
  const paidAmount = invoice.paid_amount || 0;
  if (validated.amount > paidAmount) {
    throw new Error(
      `Refund amount (${validated.amount}) exceeds paid amount (${paidAmount})`
    );
  }

  // 6. Check for existing pending refund requests
  const { data: existingRequests } = await supabase
    .from('refund_requests')
    .select('*')
    .eq('invoice_id', validated.invoiceId)
    .eq('status', 'pending_approval');

  if (existingRequests && existingRequests.length > 0) {
    throw new Error(
      `Invoice ${validated.invoiceId} already has a pending refund request`
    );
  }

  // 7. Create refund request
  const { data: request, error: requestError } = await supabase
    .from('refund_requests')
    .insert({
      invoice_id: validated.invoiceId,
      requested_by: context.actorId,
      amount: validated.amount,
      reason: validated.reason,
      status: 'pending_approval',
    })
    .select()
    .single();

  if (requestError || !request) {
    throw new Error(`Failed to create refund request: ${requestError?.message || 'Unknown error'}`);
  }

  // 8. Capture after state
  const { data: after } = await supabase
    .from('refund_requests')
    .select('*')
    .eq('id', request.id)
    .single();

  // 9. Emit audit entry
  audit({
    actor: context.actorId,
    action: 'refund.request',
    target: `refund_request/${request.id}`,
    scope: SCOPES.ADMIN_WRITE_REFUND,
    before: undefined,
    after,
    correlationId: generateCorrelationId(),
  });

  // 10. Return result
  return {
    requestId: request.id,
    status: 'pending_approval',
  };
}
