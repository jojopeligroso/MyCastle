import { z } from 'zod';
import { createHash } from 'crypto';
import type { AdminContext, MCPResource } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';

/**
 * Input schema for AR aging resource
 */
export const ARAgingParamsSchema = z.object({
  asOfDate: z.string().optional(), // ISO date format: 2025-01-30
});

/**
 * Aging bucket schema
 */
export const AgingBucketSchema = z.object({
  range: z.string(),
  count: z.number(),
  total_amount: z.number(),
  invoices: z.array(z.object({
    invoice_id: z.string(),
    user_id: z.string(),
    user_name: z.string().optional(),
    amount: z.number(),
    invoice_date: z.string(),
    days_overdue: z.number(),
  })),
});

/**
 * Output data schema for AR aging
 */
export const ARAgingDataSchema = z.object({
  as_of_date: z.string(),
  total_outstanding: z.number(),
  total_invoices: z.number(),
  buckets: z.object({
    current: AgingBucketSchema, // 0-30 days
    aging_31_60: AgingBucketSchema, // 31-60 days
    aging_61_90: AgingBucketSchema, // 61-90 days
    aging_90_plus: AgingBucketSchema, // 90+ days
  }),
  timestamp: z.string(),
});

/**
 * Resource metadata
 */
export const arAgingMetadata: MCPResource = {
  uri: 'res://admin/finance/ar-aging',
  name: 'Accounts Receivable Aging',
  description: 'AR aging report with buckets (0-30, 31-60, 61-90, 90+ days)',
  mimeType: 'application/json',
};

/**
 * Get AR aging report
 *
 * @param context - Admin context with authentication
 * @param params - Optional asOfDate parameter (defaults to today)
 * @returns AR aging data with ETag and cache hint
 */
export async function getARAgingResource(
  context: AdminContext,
  params: z.infer<typeof ARAgingParamsSchema> = {}
): Promise<{
  data: z.infer<typeof ARAgingDataSchema>;
  etag: string;
  cacheHint?: number;
}> {
  // 1. Validate params
  const validated = ARAgingParamsSchema.parse(params);

  // 2. Check scope
  requireScope(context, SCOPES.ADMIN_READ_SYSTEM);

  // 3. Create Supabase client with user token
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Determine as-of date
  const asOfDate = validated.asOfDate || new Date().toISOString().split('T')[0];
  const asOfDateTime = new Date(asOfDate);

  // 5. Query outstanding invoices
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      user_id,
      amount,
      invoice_date,
      status,
      profiles!invoices_user_id_fkey (
        full_name
      )
    `)
    .in('status', ['pending', 'overdue']);

  if (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`);
  }

  // 6. Calculate days overdue and categorize
  const current: any[] = [];
  const aging_31_60: any[] = [];
  const aging_61_90: any[] = [];
  const aging_90_plus: any[] = [];

  invoices?.forEach((invoice: any) => {
    const invoiceDate = new Date(invoice.invoice_date);
    const daysOverdue = Math.floor(
      (asOfDateTime.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const invoiceItem = {
      invoice_id: invoice.id,
      user_id: invoice.user_id,
      user_name: invoice.profiles?.full_name || 'Unknown',
      amount: invoice.amount,
      invoice_date: invoice.invoice_date,
      days_overdue: daysOverdue,
    };

    if (daysOverdue <= 30) {
      current.push(invoiceItem);
    } else if (daysOverdue <= 60) {
      aging_31_60.push(invoiceItem);
    } else if (daysOverdue <= 90) {
      aging_61_90.push(invoiceItem);
    } else {
      aging_90_plus.push(invoiceItem);
    }
  });

  // 7. Calculate bucket totals
  const calculateBucket = (items: any[], range: string) => ({
    range,
    count: items.length,
    total_amount: items.reduce((sum, i) => sum + i.amount, 0),
    invoices: items.sort((a, b) => b.days_overdue - a.days_overdue), // Sort by days overdue desc
  });

  const buckets = {
    current: calculateBucket(current, '0-30 days'),
    aging_31_60: calculateBucket(aging_31_60, '31-60 days'),
    aging_61_90: calculateBucket(aging_61_90, '61-90 days'),
    aging_90_plus: calculateBucket(aging_90_plus, '90+ days'),
  };

  // 8. Calculate totals
  const totalOutstanding =
    buckets.current.total_amount +
    buckets.aging_31_60.total_amount +
    buckets.aging_61_90.total_amount +
    buckets.aging_90_plus.total_amount;

  const totalInvoices =
    buckets.current.count +
    buckets.aging_31_60.count +
    buckets.aging_61_90.count +
    buckets.aging_90_plus.count;

  const result = {
    as_of_date: asOfDate,
    total_outstanding: totalOutstanding,
    total_invoices: totalInvoices,
    buckets,
    timestamp: new Date().toISOString(),
  };

  // 9. Validate output
  const validatedResult = ARAgingDataSchema.parse(result);

  // 10. Generate ETag
  const etag = generateETag(validatedResult);

  return { data: validatedResult, etag, cacheHint: 600 }; // 10 min cache
}

/**
 * Generate ETag from data
 */
function generateETag(data: any): string {
  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .slice(0, 16);
}
