import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES, hasPIIAccess } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Input schema for gen-register-csv tool
 */
export const GenRegisterCsvInputSchema = z.object({
  classId: z.string().uuid('Valid class ID is required'),
  week: z.string().regex(/^\d{4}-W\d{2}$/, 'Week must be in YYYY-Www format (e.g., 2024-W15)'),
});

/**
 * Output schema for gen-register-csv tool
 */
export const GenRegisterCsvOutputSchema = z.object({
  fileUri: z.string(),
});

/**
 * Tool metadata for MCP registration
 */
export const genRegisterCsvMetadata: MCPTool = {
  name: 'gen-register-csv',
  description: 'Generate CSV export of class register for a specific week. Masks PII unless admin.read.pii scope is present. Requires admin.read.register scope.',
  inputSchema: {
    type: 'object',
    properties: {
      classId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the class',
      },
      week: {
        type: 'string',
        pattern: '^\\d{4}-W\\d{2}$',
        description: 'Week in ISO 8601 format (YYYY-Www, e.g., 2024-W15)',
      },
    },
    required: ['classId', 'week'],
  },
};

/**
 * Parse ISO week string to date range
 *
 * @param weekString - Week in YYYY-Www format
 * @returns Start and end dates of the week
 */
function parseISOWeek(weekString: string): { start: Date; end: Date } {
  const [year, week] = weekString.split('-W');
  const yearNum = parseInt(year, 10);
  const weekNum = parseInt(week, 10);

  // Calculate first day of the year
  const jan4 = new Date(yearNum, 0, 4);
  const jan4Day = jan4.getDay() || 7; // Sunday = 7

  // Calculate Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - jan4Day + 1);

  // Calculate Monday of target week
  const targetMonday = new Date(week1Monday);
  targetMonday.setDate(week1Monday.getDate() + (weekNum - 1) * 7);

  // Calculate Sunday (end of week)
  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);
  targetSunday.setHours(23, 59, 59, 999);

  return { start: targetMonday, end: targetSunday };
}

/**
 * Mask PII in a string
 *
 * @param value - Value to mask
 * @returns Masked value
 */
function maskPII(value: string | null | undefined): string {
  if (!value) return '***';

  // Mask email
  if (value.includes('@')) {
    const [local, domain] = value.split('@');
    return `${local.charAt(0)}***@${domain}`;
  }

  // Mask name (show first letter only)
  const parts = value.split(' ');
  return parts.map(p => `${p.charAt(0)}***`).join(' ');
}

/**
 * Generate CSV export of class register
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Register generation details
 * @returns URI of the generated CSV file
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If class not found or CSV generation fails
 */
export async function executeGenRegisterCsv(
  context: AdminContext,
  input: z.infer<typeof GenRegisterCsvInputSchema>
): Promise<z.infer<typeof GenRegisterCsvOutputSchema>> {
  // 1. Validate input
  const validated = GenRegisterCsvInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_READ_REGISTER);

  // 3. Check PII access
  const canSeePII = hasPIIAccess(context);

  // 4. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 5. Parse week to date range
  const { start, end } = parseISOWeek(validated.week);

  // 6. Verify class exists
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('*')
    .eq('id', validated.classId)
    .single();

  if (classError || !classData) {
    throw new Error(`Class not found: ${validated.classId}`);
  }

  // 7. Fetch attendance records for the week
  const { data: attendanceRecords, error: attendanceError } = await supabase
    .from('attendance')
    .select('*, profiles!student_id(*)')
    .eq('class_id', validated.classId)
    .gte('register_date', start.toISOString())
    .lte('register_date', end.toISOString())
    .order('register_date', { ascending: true });

  if (attendanceError) {
    throw new Error(`Failed to fetch attendance records: ${attendanceError.message}`);
  }

  // 8. Generate CSV content
  const csvRows: string[] = [
    // Header
    'Date,Student ID,Student Name,Email,Status,Note',
  ];

  for (const record of attendanceRecords || []) {
    const student = record.profiles;
    const studentName = canSeePII ? student.full_name : maskPII(student.full_name);
    const studentEmail = canSeePII ? student.email : maskPII(student.email);

    csvRows.push(
      [
        record.register_date,
        record.student_id,
        `"${studentName}"`,
        `"${studentEmail}"`,
        record.status,
        `"${record.note || ''}"`,
      ].join(',')
    );
  }

  const csvContent = csvRows.join('\n');

  // 9. Write CSV to temporary file
  // In production, this would be written to a shared file storage (S3, etc.)
  const tmpDir = process.env.MCP_FILES_DIR || '/tmp/mcp-files';
  const fileName = `register_${validated.classId}_${validated.week}.csv`;
  const filePath = join(tmpDir, fileName);

  try {
    writeFileSync(filePath, csvContent, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to write CSV file: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // 10. Generate Files MCP URI
  const fileUri = `file:///${filePath}`;

  // 11. Emit audit entry
  audit({
    actor: context.actorId,
    action: 'register.export',
    target: `class/${validated.classId}/register/${validated.week}`,
    scope: SCOPES.ADMIN_READ_REGISTER,
    before: undefined,
    after: {
      classId: validated.classId,
      week: validated.week,
      recordCount: attendanceRecords?.length || 0,
      piiMasked: !canSeePII,
    },
    correlationId: generateCorrelationId(),
  });

  // 12. Return result
  return { fileUri };
}
