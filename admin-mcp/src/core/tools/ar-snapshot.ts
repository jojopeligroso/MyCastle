import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

/**
 * Input schema for ar-snapshot tool
 */
export const ArSnapshotInputSchema = z.object({
  asOfDate: z.string().datetime().optional(),
});

/**
 * Aging buckets for AR
 */
const AgingBucketsSchema = z.object({
  current: z.number(),
  days30: z.number(),
  days60: z.number(),
  days90: z.number(),
  days90Plus: z.number(),
  total: z.number(),
});

/**
 * Output schema for ar-snapshot tool
 */
export const ArSnapshotOutputSchema = z.object({
  agingBuckets: AgingBucketsSchema,
});

/**
 * Tool metadata for MCP registration
 */
export const arSnapshotMetadata: MCPTool = {
  name: 'ar-snapshot',
  description: 'Generate accounts receivable aging snapshot. Queries payment data and categorizes outstanding amounts by age. Requires admin.read.finance scope.',
  inputSchema: {
    type: 'object',
    properties: {
      asOfDate: {
        type: 'string',
        format: 'date-time',
        description: 'Date to generate snapshot as of (defaults to current date)',
      },
    },
  },
};

/**
 * Calculate days between two dates
 *
 * @param from - Start date
 * @param to - End date
 * @returns Number of days
 */
function daysBetween(from: Date, to: Date): number {
  const diff = to.getTime() - from.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Generate AR aging snapshot
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Snapshot parameters
 * @returns Aging buckets with outstanding amounts
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If snapshot generation fails
 */
export async function executeArSnapshot(
  context: AdminContext,
  input: z.infer<typeof ArSnapshotInputSchema>
): Promise<z.infer<typeof ArSnapshotOutputSchema>> {
  // 1. Validate input
  const validated = ArSnapshotInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_READ_FINANCE);

  // 3. Determine snapshot date
  const snapshotDate = validated.asOfDate ? new Date(validated.asOfDate) : new Date();

  // 4. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 5. Fetch outstanding invoices
  // Note: This assumes invoices table with due_date, amount, paid_amount columns
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('*')
    .neq('status', 'paid')
    .lte('due_date', snapshotDate.toISOString());

  if (invoicesError) {
    throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
  }

  // 6. Calculate aging buckets
  const buckets = {
    current: 0,
    days30: 0,
    days60: 0,
    days90: 0,
    days90Plus: 0,
    total: 0,
  };

  for (const invoice of invoices || []) {
    const dueDate = new Date(invoice.due_date);
    const daysOverdue = daysBetween(dueDate, snapshotDate);
    const outstanding = (invoice.amount || 0) - (invoice.paid_amount || 0);

    if (outstanding <= 0) continue;

    buckets.total += outstanding;

    if (daysOverdue < 0) {
      // Not yet due
      buckets.current += outstanding;
    } else if (daysOverdue <= 30) {
      buckets.days30 += outstanding;
    } else if (daysOverdue <= 60) {
      buckets.days60 += outstanding;
    } else if (daysOverdue <= 90) {
      buckets.days90 += outstanding;
    } else {
      buckets.days90Plus += outstanding;
    }
  }

  // 7. Round to 2 decimal places
  Object.keys(buckets).forEach(key => {
    buckets[key as keyof typeof buckets] = Math.round(buckets[key as keyof typeof buckets] * 100) / 100;
  });

  // 8. Emit audit entry
  audit({
    actor: context.actorId,
    action: 'finance.ar_snapshot',
    target: 'ar/snapshot',
    scope: SCOPES.ADMIN_READ_FINANCE,
    before: undefined,
    after: {
      asOfDate: snapshotDate.toISOString(),
      buckets,
      invoiceCount: invoices?.length || 0,
    },
    correlationId: generateCorrelationId(),
  });

  // 9. Return result
  return { agingBuckets: buckets };
}
