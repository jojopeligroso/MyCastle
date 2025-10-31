import { z } from 'zod';
import { createHash } from 'crypto';
import type { AdminContext, MCPResource } from '../../types/index.js';
import { requireScope, SCOPES, hasPIIAccess } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';

/**
 * Input schema for visa expiries resource
 */
export const VisaExpiriesParamsSchema = z.object({
  daysAhead: z.number().min(1).max(365).default(30),
});

/**
 * Visa expiry item schema
 */
export const VisaExpiryItemSchema = z.object({
  student_id: z.string(),
  student_name: z.string(),
  email: z.string(),
  visa_type: z.string(),
  visa_number: z.string().optional(),
  expiry_date: z.string(),
  days_until_expiry: z.number(),
  status: z.string(), // 'current', 'expiring_soon', 'expired'
  compliance_notes: z.string().nullable().optional(),
});

/**
 * Output data schema for visa expiries
 */
export const VisaExpiriesDataSchema = z.object({
  days_ahead: z.number(),
  cutoff_date: z.string(),
  summary: z.object({
    total_expiring: z.number(),
    expired: z.number(),
    expiring_soon: z.number(),
    current: z.number(),
  }),
  students: z.array(VisaExpiryItemSchema),
  pii_masked: z.boolean(),
  timestamp: z.string(),
});

/**
 * Resource metadata
 */
export const visaExpiriesMetadata: MCPResource = {
  uri: 'res://admin/compliance/visa-expiries',
  name: 'Visa Expiries Report',
  description: 'Students with expiring visas within specified days',
  mimeType: 'application/json',
};

/**
 * Get visa expiries compliance report
 *
 * @param context - Admin context with authentication
 * @param daysAhead - Number of days to look ahead (default 30)
 * @returns Visa expiries data with ETag and cache hint
 */
export async function getVisaExpiriesResource(
  context: AdminContext,
  daysAhead: number = 30
): Promise<{
  data: z.infer<typeof VisaExpiriesDataSchema>;
  etag: string;
  cacheHint?: number;
}> {
  // 1. Validate params
  const validated = VisaExpiriesParamsSchema.parse({ daysAhead });

  // 2. Check scope
  requireScope(context, SCOPES.ADMIN_READ_SYSTEM);

  // 3. Check if PII access is available
  const showPII = hasPIIAccess(context);

  // 4. Create Supabase client with user token
  const supabase = createSupabaseClient(context.supabaseToken);

  // 5. Calculate cutoff date
  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(cutoffDate.getDate() + validated.daysAhead);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  // 6. Query student visa information
  const { data: students, error } = await supabase
    .from('student_visas')
    .select(`
      id,
      student_id,
      visa_type,
      visa_number,
      expiry_date,
      compliance_notes,
      profiles!student_visas_student_id_fkey (
        full_name,
        email
      )
    `)
    .lte('expiry_date', cutoffDateStr)
    .order('expiry_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch visa data: ${error.message}`);
  }

  // 7. Process and categorize visa records
  const processedStudents = (students || []).map((record: any) => {
    const expiryDate = new Date(record.expiry_date);
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    let status = 'current';
    if (daysUntilExpiry < 0) {
      status = 'expired';
    } else if (daysUntilExpiry <= 30) {
      status = 'expiring_soon';
    }

    return {
      student_id: record.student_id,
      student_name: record.profiles?.full_name || 'Unknown',
      email: showPII ? record.profiles?.email : maskEmail(record.profiles?.email || ''),
      visa_type: record.visa_type,
      visa_number: showPII ? record.visa_number : '***MASKED***',
      expiry_date: record.expiry_date,
      days_until_expiry: daysUntilExpiry,
      status,
      compliance_notes: record.compliance_notes || null,
    };
  });

  // 8. Calculate summary
  const summary = {
    total_expiring: processedStudents.length,
    expired: processedStudents.filter(s => s.status === 'expired').length,
    expiring_soon: processedStudents.filter(s => s.status === 'expiring_soon').length,
    current: processedStudents.filter(s => s.status === 'current').length,
  };

  const result = {
    days_ahead: validated.daysAhead,
    cutoff_date: cutoffDateStr,
    summary,
    students: processedStudents,
    pii_masked: !showPII,
    timestamp: new Date().toISOString(),
  };

  // 9. Validate output
  const validatedResult = VisaExpiriesDataSchema.parse(result);

  // 10. Generate ETag
  const etag = generateETag(validatedResult);

  return { data: validatedResult, etag, cacheHint: 600 }; // 10 min cache
}

/**
 * Mask email address for privacy
 */
function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';

  const maskedLocal = local.length > 2
    ? `${local[0]}***${local[local.length - 1]}`
    : '***';

  return `${maskedLocal}@${domain}`;
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
