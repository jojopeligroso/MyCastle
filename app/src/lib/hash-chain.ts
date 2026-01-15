/**
 * Hash-Chain Implementation for Tamper-Evident Records
 * T-052: Hash-Chain Implementation (8 points, Medium)
 *
 * Implements SHA256 hash chains for attendance records:
 * hash = SHA256(payload || previous_hash)
 *
 * This creates an immutable audit trail where any modification to
 * historical records breaks the hash chain, making tampering detectable.
 */

import { createHash } from 'crypto';

/**
 * Payload for attendance hash computation
 */
export interface AttendanceHashPayload {
  tenantId: string;
  classSessionId: string;
  studentId: string;
  status: string;
  recordedBy: string;
  recordedAt: Date | string;
  notes?: string;
}

/**
 * Hash-chain validation result
 */
export interface HashChainValidation {
  isValid: boolean;
  invalidRecords: Array<{
    recordId: string;
    reason: string;
    computedHash: string;
    storedHash: string;
  }>;
  totalRecords: number;
  validRecords: number;
}

/**
 * Compute SHA256 hash for an attendance record
 *
 * @param payload - Attendance record data
 * @param previousHash - Hash of the previous record in the chain (null for first record)
 * @returns SHA256 hash (hex string)
 */
export function computeAttendanceHash(
  payload: AttendanceHashPayload,
  previousHash: string | null = null
): string {
  // Normalize the payload to ensure consistent hashing
  const normalizedPayload = {
    tenantId: payload.tenantId,
    classSessionId: payload.classSessionId,
    studentId: payload.studentId,
    status: payload.status,
    recordedBy: payload.recordedBy,
    recordedAt:
      payload.recordedAt instanceof Date ? payload.recordedAt.toISOString() : payload.recordedAt,
    notes: payload.notes || '',
  };

  // Create deterministic string representation
  const payloadString = JSON.stringify(normalizedPayload);

  // Concatenate payload with previous hash
  const chainInput = previousHash ? `${payloadString}||${previousHash}` : payloadString;

  // Compute SHA256 hash
  const hash = createHash('sha256').update(chainInput).digest('hex');

  return hash;
}

/**
 * Validate a single attendance record's hash
 *
 * @param record - Attendance record with hash fields
 * @param previousHash - Expected previous hash
 * @returns True if hash is valid
 */
export function validateAttendanceHash(
  record: {
    id: string;
    tenant_id: string;
    class_session_id: string;
    student_id: string;
    status: string;
    recorded_by: string;
    recorded_at: Date;
    notes?: string | null;
    hash: string | null;
    previous_hash: string | null;
  },
  previousHash: string | null
): { isValid: boolean; computedHash: string; reason?: string } {
  if (!record.hash) {
    return {
      isValid: false,
      computedHash: '',
      reason: 'Missing hash',
    };
  }

  // Recompute hash
  const payload: AttendanceHashPayload = {
    tenantId: record.tenant_id,
    classSessionId: record.class_session_id,
    studentId: record.student_id,
    status: record.status,
    recordedBy: record.recorded_by,
    recordedAt: record.recorded_at,
    notes: record.notes || undefined,
  };

  const computedHash = computeAttendanceHash(payload, previousHash);

  // Compare with stored hash
  const isValid = computedHash === record.hash;

  return {
    isValid,
    computedHash,
    reason: isValid ? undefined : 'Hash mismatch - record may have been tampered',
  };
}

/**
 * Validate an entire hash chain
 *
 * @param records - Array of attendance records in chronological order
 * @returns Validation result
 */
export function validateHashChain(
  records: Array<{
    id: string;
    tenant_id: string;
    class_session_id: string;
    student_id: string;
    status: string;
    recorded_by: string;
    recorded_at: Date;
    notes?: string | null;
    hash: string | null;
    previous_hash: string | null;
  }>
): HashChainValidation {
  const invalidRecords: Array<{
    recordId: string;
    reason: string;
    computedHash: string;
    storedHash: string;
  }> = [];

  let previousHash: string | null = null;

  for (const record of records) {
    // Validate previous_hash matches expected
    if (record.previous_hash !== previousHash) {
      invalidRecords.push({
        recordId: record.id,
        reason: `Previous hash mismatch: expected ${previousHash}, got ${record.previous_hash}`,
        computedHash: '',
        storedHash: record.hash || '',
      });
    }

    // Validate hash
    const validation = validateAttendanceHash(record, previousHash);

    if (!validation.isValid) {
      invalidRecords.push({
        recordId: record.id,
        reason: validation.reason || 'Unknown error',
        computedHash: validation.computedHash,
        storedHash: record.hash || '',
      });
    }

    // Update previous hash for next iteration
    previousHash = record.hash;
  }

  return {
    isValid: invalidRecords.length === 0,
    invalidRecords,
    totalRecords: records.length,
    validRecords: records.length - invalidRecords.length,
  };
}

/**
 * Get the last hash in a chain (for appending new records)
 *
 * @param records - Array of attendance records
 * @returns Hash of the last record, or null if chain is empty
 */
export function getLastHash(
  records: Array<{ hash: string | null; created_at: Date }>
): string | null {
  if (records.length === 0) {
    return null;
  }

  // Sort by created_at descending
  const sorted = [...records].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  return sorted[0].hash;
}

/**
 * Edit window policy (T-053)
 * Determines if an edit is within the 48-hour window
 */
export function isWithinEditWindow(recordedAt: Date, editAttemptAt: Date = new Date()): boolean {
  const EDIT_WINDOW_HOURS = 48;
  const windowMs = EDIT_WINDOW_HOURS * 60 * 60 * 1000;

  const elapsed = editAttemptAt.getTime() - recordedAt.getTime();

  return elapsed <= windowMs;
}

/**
 * Recompute hash after edit (requires breaking and rebuilding chain)
 *
 * @param record - Updated record
 * @param previousHash - Previous hash in chain
 * @returns New hash
 */
export function recomputeHashAfterEdit(
  record: AttendanceHashPayload,
  previousHash: string | null
): string {
  return computeAttendanceHash(record, previousHash);
}
