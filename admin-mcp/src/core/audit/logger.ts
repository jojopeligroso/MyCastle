import { createHash, randomUUID } from 'crypto';
import type { AuditEntry } from '../../types/index.js';

/**
 * Emit audit entry to stderr as JSON
 * This allows audit logs to be captured separately from application logs
 */
export function emitAudit(entry: AuditEntry): void {
  const auditLog = {
    type: 'audit',
    ...entry,
  };

  // Write to stderr so it can be captured separately
  console.error(JSON.stringify(auditLog));
}

/**
 * Create a SHA256 hash of the diff between before and after states
 * This provides a tamper-evident record of what changed
 */
export function createDiffHash(before: unknown, after: unknown): string {
  const diff = {
    before: serializeForHash(before),
    after: serializeForHash(after),
  };

  const hash = createHash('sha256');
  hash.update(JSON.stringify(diff));
  return hash.digest('hex');
}

/**
 * Serialize data for consistent hashing
 * Handles undefined, null, and sorts object keys for deterministic output
 */
function serializeForHash(data: unknown): unknown {
  if (data === undefined) {
    return null;
  }

  if (data === null) {
    return null;
  }

  if (Array.isArray(data)) {
    return data.map(serializeForHash);
  }

  if (typeof data === 'object') {
    const sorted: Record<string, unknown> = {};
    Object.keys(data).sort().forEach(key => {
      sorted[key] = serializeForHash((data as Record<string, unknown>)[key]);
    });
    return sorted;
  }

  return data;
}

/**
 * Generate a correlation ID for tracking related operations
 * Uses UUID v4 for uniqueness
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Create and emit an audit entry for an operation
 */
export function audit(params: {
  actor: string;
  action: string;
  target: string;
  scope: string;
  before?: unknown;
  after?: unknown;
  correlationId?: string;
}): void {
  const entry: AuditEntry = {
    actor: params.actor,
    action: params.action,
    target: params.target,
    scope: params.scope,
    diffHash: createDiffHash(params.before, params.after),
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId || generateCorrelationId(),
  };

  emitAudit(entry);
}

/**
 * Create an audit entry without emitting it
 * Useful for batch operations or when you need to modify before emitting
 */
export function createAuditEntry(params: {
  actor: string;
  action: string;
  target: string;
  scope: string;
  before?: unknown;
  after?: unknown;
  correlationId?: string;
}): AuditEntry {
  return {
    actor: params.actor,
    action: params.action,
    target: params.target,
    scope: params.scope,
    diffHash: createDiffHash(params.before, params.after),
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId || generateCorrelationId(),
  };
}
