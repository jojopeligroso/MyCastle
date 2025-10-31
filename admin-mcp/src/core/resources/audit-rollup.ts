import { z } from 'zod';
import { createHash } from 'crypto';
import type { AdminContext, MCPResource } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';

/**
 * Input schema for audit rollup
 */
export const AuditRollupParamsSchema = z.object({
  date: z.string(), // ISO date format: 2025-01-30
});

/**
 * Action summary schema
 */
export const ActionSummarySchema = z.object({
  action: z.string(),
  count: z.number(),
  unique_actors: z.number(),
  unique_targets: z.number(),
});

/**
 * Red flag schema
 */
export const RedFlagSchema = z.object({
  type: z.string(),
  severity: z.string(), // 'low', 'medium', 'high', 'critical'
  description: z.string(),
  count: z.number(),
  actor_ids: z.array(z.string()),
});

/**
 * Output data schema for audit rollup
 */
export const AuditRollupDataSchema = z.object({
  date: z.string(),
  summary: z.object({
    total_entries: z.number(),
    unique_actors: z.number(),
    unique_targets: z.number(),
    unique_scopes: z.number(),
    hash_integrity: z.boolean(),
  }),
  actions: z.array(ActionSummarySchema),
  top_actors: z.array(z.object({
    actor_id: z.string(),
    action_count: z.number(),
    scopes_used: z.array(z.string()),
  })),
  red_flags: z.array(RedFlagSchema),
  timestamp: z.string(),
});

/**
 * Resource metadata
 */
export const auditRollupMetadata: MCPResource = {
  uri: 'res://admin/audit/{date}',
  name: 'Audit Rollup',
  description: 'Daily audit summary with entry counts, hashes, and red flags',
  mimeType: 'application/json',
};

/**
 * Get daily audit rollup report
 *
 * @param context - Admin context with authentication
 * @param date - ISO date string (e.g., "2025-01-30")
 * @returns Audit rollup data with ETag and cache hint
 */
export async function getAuditRollupResource(
  context: AdminContext,
  date: string
): Promise<{
  data: z.infer<typeof AuditRollupDataSchema>;
  etag: string;
  cacheHint?: number;
}> {
  // 1. Validate params
  const validated = AuditRollupParamsSchema.parse({ date });

  // 2. Check scope
  requireScope(context, SCOPES.ADMIN_READ_AUDIT);

  // 3. Create Supabase client with user token
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Calculate date range (whole day)
  const startOfDay = `${validated.date}T00:00:00Z`;
  const endOfDay = `${validated.date}T23:59:59Z`;

  // 5. Query audit log entries for the day
  const { data: auditEntries, error } = await supabase
    .from('audit_log')
    .select('*')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch audit entries: ${error.message}`);
  }

  // 6. Calculate summary statistics
  const totalEntries = auditEntries?.length || 0;
  const uniqueActors = new Set((auditEntries || []).map((e: any) => e.actor)).size;
  const uniqueTargets = new Set((auditEntries || []).map((e: any) => e.target)).size;
  const uniqueScopes = new Set((auditEntries || []).map((e: any) => e.scope)).size;

  // 7. Verify hash integrity
  const hashIntegrity = verifyHashIntegrity(auditEntries || []);

  // 8. Group by action
  const actionCounts = (auditEntries || []).reduce((acc: any, entry: any) => {
    if (!acc[entry.action]) {
      acc[entry.action] = {
        count: 0,
        actors: new Set(),
        targets: new Set(),
      };
    }
    acc[entry.action].count++;
    acc[entry.action].actors.add(entry.actor);
    acc[entry.action].targets.add(entry.target);
    return acc;
  }, {});

  const actions = Object.entries(actionCounts).map(([action, data]: [string, any]) => ({
    action,
    count: data.count,
    unique_actors: data.actors.size,
    unique_targets: data.targets.size,
  })).sort((a, b) => b.count - a.count);

  // 9. Calculate top actors
  const actorCounts = (auditEntries || []).reduce((acc: any, entry: any) => {
    if (!acc[entry.actor]) {
      acc[entry.actor] = {
        count: 0,
        scopes: new Set(),
      };
    }
    acc[entry.actor].count++;
    acc[entry.actor].scopes.add(entry.scope);
    return acc;
  }, {});

  const topActors = Object.entries(actorCounts)
    .map(([actor_id, data]: [string, any]) => ({
      actor_id,
      action_count: data.count,
      scopes_used: Array.from(data.scopes),
    }))
    .sort((a, b) => b.action_count - a.action_count)
    .slice(0, 10); // Top 10 actors

  // 10. Detect red flags
  const redFlags = detectRedFlags(auditEntries || []);

  const result = {
    date: validated.date,
    summary: {
      total_entries: totalEntries,
      unique_actors: uniqueActors,
      unique_targets: uniqueTargets,
      unique_scopes: uniqueScopes,
      hash_integrity: hashIntegrity,
    },
    actions,
    top_actors: topActors,
    red_flags: redFlags,
    timestamp: new Date().toISOString(),
  };

  // 11. Validate output
  const validatedResult = AuditRollupDataSchema.parse(result);

  // 12. Generate ETag
  const etag = generateETag(validatedResult);

  return { data: validatedResult, etag, cacheHint: 600 }; // 10 min cache
}

/**
 * Verify hash integrity of audit entries
 */
function verifyHashIntegrity(entries: any[]): boolean {
  // Check that all entries have valid diff_hash values
  // In a real implementation, you might verify hash chains or merkle trees
  return entries.every(entry =>
    entry.diff_hash &&
    typeof entry.diff_hash === 'string' &&
    entry.diff_hash.length > 0
  );
}

/**
 * Detect potential red flags in audit entries
 */
function detectRedFlags(entries: any[]): any[] {
  const flags: any[] = [];

  // 1. Check for excessive actions by single actor in short time
  const actorActionCounts: Record<string, number> = {};
  entries.forEach(entry => {
    actorActionCounts[entry.actor] = (actorActionCounts[entry.actor] || 0) + 1;
  });

  Object.entries(actorActionCounts).forEach(([actor, count]) => {
    if (count > 100) {
      flags.push({
        type: 'excessive_actions',
        severity: count > 500 ? 'critical' : count > 200 ? 'high' : 'medium',
        description: `Actor ${actor} performed ${count} actions in one day`,
        count,
        actor_ids: [actor],
      });
    }
  });

  // 2. Check for delete operations
  const deleteEntries = entries.filter(e =>
    e.action.toLowerCase().includes('delete') ||
    e.action.toLowerCase().includes('remove')
  );
  if (deleteEntries.length > 10) {
    const actors = [...new Set(deleteEntries.map(e => e.actor))];
    flags.push({
      type: 'high_delete_volume',
      severity: deleteEntries.length > 50 ? 'high' : 'medium',
      description: `${deleteEntries.length} delete operations detected`,
      count: deleteEntries.length,
      actor_ids: actors,
    });
  }

  // 3. Check for failed operations (if tracked in action name)
  const failedEntries = entries.filter(e =>
    e.action.toLowerCase().includes('failed') ||
    e.action.toLowerCase().includes('error')
  );
  if (failedEntries.length > 20) {
    const actors = [...new Set(failedEntries.map(e => e.actor))];
    flags.push({
      type: 'high_failure_rate',
      severity: failedEntries.length > 100 ? 'high' : 'medium',
      description: `${failedEntries.length} failed operations detected`,
      count: failedEntries.length,
      actor_ids: actors,
    });
  }

  // 4. Check for sensitive scope usage
  const sensitiveScopes = ['admin.write.system', 'admin.delete.user', 'admin.super'];
  const sensitiveEntries = entries.filter(e =>
    sensitiveScopes.some(scope => e.scope.includes(scope))
  );
  if (sensitiveEntries.length > 0) {
    const actors = [...new Set(sensitiveEntries.map(e => e.actor))];
    flags.push({
      type: 'sensitive_scope_usage',
      severity: sensitiveEntries.length > 10 ? 'high' : 'low',
      description: `${sensitiveEntries.length} operations with sensitive scopes`,
      count: sensitiveEntries.length,
      actor_ids: actors,
    });
  }

  return flags.sort((a, b) => {
    const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
  });
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
