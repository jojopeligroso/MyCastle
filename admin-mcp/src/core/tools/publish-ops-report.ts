import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Report period type
 */
const ReportPeriod = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);

/**
 * Distribution channel type
 */
const DistributionChannel = z.enum(['files', 'comms']);

/**
 * Input schema for publish-ops-report tool
 */
export const PublishOpsReportInputSchema = z.object({
  period: ReportPeriod,
  channels: z.array(DistributionChannel).min(1, 'At least one channel is required'),
  audience: z.array(z.string()).min(1, 'At least one audience member is required'),
});

/**
 * Output schema for publish-ops-report tool
 */
export const PublishOpsReportOutputSchema = z.object({
  reportUri: z.string().optional(),
  messageId: z.string().optional(),
});

/**
 * Tool metadata for MCP registration
 */
export const publishOpsReportMetadata: MCPTool = {
  name: 'publish-ops-report',
  description: 'Generate and publish operations report. Orchestrates Analytics, Files, and Comms MCPs. Requires admin.write.report scope.',
  inputSchema: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        description: 'Reporting period',
      },
      channels: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['files', 'comms'],
        },
        description: 'Distribution channels for the report',
      },
      audience: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of user IDs or email addresses to send report to',
      },
    },
    required: ['period', 'channels', 'audience'],
  },
};

/**
 * Generate operations report data
 *
 * @param supabase - Supabase client
 * @param period - Reporting period
 * @returns Report data object
 */
async function generateReportData(
  supabase: ReturnType<typeof createSupabaseClient>,
  period: string
): Promise<Record<string, unknown>> {
  // In production, this would call Analytics MCP to generate report data
  // For now, we'll generate basic statistics

  const now = new Date();
  let startDate = new Date();

  // Calculate date range based on period
  switch (period) {
    case 'daily':
      startDate.setDate(now.getDate() - 1);
      break;
    case 'weekly':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarterly':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'yearly':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  // Fetch various metrics
  const [
    { count: userCount },
    { count: classCount },
    { count: enrolmentCount },
    { count: attendanceCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('classes').select('*', { count: 'exact', head: true }),
    supabase.from('enrolments').select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString()),
    supabase.from('attendance').select('*', { count: 'exact', head: true })
      .gte('register_date', startDate.toISOString()),
  ]);

  return {
    period,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    metrics: {
      totalUsers: userCount || 0,
      totalClasses: classCount || 0,
      newEnrolments: enrolmentCount || 0,
      attendanceRecords: attendanceCount || 0,
    },
    generatedAt: now.toISOString(),
  };
}

/**
 * Create report file
 *
 * @param reportData - Report data
 * @returns File path
 */
function createReportFile(reportData: Record<string, unknown>): string {
  const tmpDir = process.env.MCP_FILES_DIR || '/tmp/mcp-files';
  const fileName = `ops_report_${reportData.period}_${Date.now()}.json`;
  const filePath = join(tmpDir, fileName);

  writeFileSync(filePath, JSON.stringify(reportData, null, 2), 'utf-8');

  return filePath;
}

/**
 * Simulate sending report via Comms MCP
 *
 * @param reportData - Report data
 * @param audience - List of recipients
 * @returns Message ID
 */
async function sendViaComms(
  reportData: Record<string, unknown>,
  audience: string[]
): Promise<string> {
  // In production, this would call Comms MCP to send the report
  // For now, we'll simulate it

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Simulate sending email/notification
  console.log(`Sending ops report via Comms MCP to ${audience.length} recipient(s)`);
  console.log(`Report period: ${reportData.period}`);
  console.log(`Message ID: ${messageId}`);

  return messageId;
}

/**
 * Publish operations report
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Report publication parameters
 * @returns Report URI and/or message ID depending on channels
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If report generation or publication fails
 */
export async function executePublishOpsReport(
  context: AdminContext,
  input: z.infer<typeof PublishOpsReportInputSchema>
): Promise<z.infer<typeof PublishOpsReportOutputSchema>> {
  // 1. Validate input
  const validated = PublishOpsReportInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_WRITE_REPORT);

  // 3. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Generate correlation ID for orchestration
  const correlationId = generateCorrelationId();

  // 5. Generate report data (Analytics MCP simulation)
  const reportData = await generateReportData(supabase, validated.period);

  // 6. Emit audit for report generation
  audit({
    actor: context.actorId,
    action: 'report.generate',
    target: `report/ops/${validated.period}`,
    scope: SCOPES.ADMIN_WRITE_REPORT,
    before: undefined,
    after: { reportData },
    correlationId,
  });

  let reportUri: string | undefined;
  let messageId: string | undefined;

  // 7. Publish to Files MCP if requested
  if (validated.channels.includes('files')) {
    const filePath = createReportFile(reportData);
    reportUri = `file:///${filePath}`;

    audit({
      actor: context.actorId,
      action: 'report.publish.files',
      target: `report/ops/${validated.period}`,
      scope: SCOPES.ADMIN_WRITE_REPORT,
      before: undefined,
      after: { reportUri },
      correlationId,
    });
  }

  // 8. Publish to Comms MCP if requested
  if (validated.channels.includes('comms')) {
    messageId = await sendViaComms(reportData, validated.audience);

    audit({
      actor: context.actorId,
      action: 'report.publish.comms',
      target: `report/ops/${validated.period}`,
      scope: SCOPES.ADMIN_WRITE_REPORT,
      before: undefined,
      after: {
        messageId,
        audienceCount: validated.audience.length,
      },
      correlationId,
    });
  }

  // 9. Return result
  return {
    reportUri,
    messageId,
  };
}
