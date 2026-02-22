/**
 * Import Batch State Machine
 * Manages batch status transitions and gating rules
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

import {
  BATCH_STATUS,
  type BatchStatus,
  REVIEW_OUTCOME,
  type ReviewOutcome,
} from '@/db/schema/imports';

/**
 * Valid state transitions
 * Maps current status -> allowed next statuses
 */
const VALID_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  [BATCH_STATUS.RECEIVED]: [BATCH_STATUS.PARSING],
  [BATCH_STATUS.PARSING]: [
    BATCH_STATUS.PROPOSED_OK,
    BATCH_STATUS.PROPOSED_NEEDS_REVIEW,
    BATCH_STATUS.FAILED_VALIDATION,
  ],
  [BATCH_STATUS.PROPOSED_OK]: [BATCH_STATUS.READY_TO_APPLY, BATCH_STATUS.REJECTED],
  [BATCH_STATUS.PROPOSED_NEEDS_REVIEW]: [BATCH_STATUS.READY_TO_APPLY, BATCH_STATUS.REJECTED],
  [BATCH_STATUS.READY_TO_APPLY]: [BATCH_STATUS.APPLYING, BATCH_STATUS.REJECTED],
  [BATCH_STATUS.APPLYING]: [BATCH_STATUS.APPLIED, BATCH_STATUS.FAILED_SYSTEM],
  // Terminal states - no further transitions
  [BATCH_STATUS.APPLIED]: [],
  [BATCH_STATUS.REJECTED]: [],
  [BATCH_STATUS.FAILED_VALIDATION]: [],
  [BATCH_STATUS.FAILED_SYSTEM]: [],
};

/**
 * Terminal states that cannot transition
 */
const TERMINAL_STATES: BatchStatus[] = [
  BATCH_STATUS.APPLIED,
  BATCH_STATUS.REJECTED,
  BATCH_STATUS.FAILED_VALIDATION,
  BATCH_STATUS.FAILED_SYSTEM,
];

/**
 * Check if a status transition is valid
 */
export function canTransition(from: BatchStatus, to: BatchStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

/**
 * Check if a status is terminal (no further transitions allowed)
 */
export function isTerminalStatus(status: BatchStatus): boolean {
  return TERMINAL_STATES.includes(status);
}

/**
 * Get allowed next states for a given status
 */
export function getNextStates(status: BatchStatus): BatchStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

/**
 * Batch summary type for gating checks
 */
export interface BatchSummary {
  status: BatchStatus;
  invalidRows: number;
  ambiguousRows: number;
  excludedRows: number;
  validRows: number;
  totalRows: number;
  reviewOutcome: ReviewOutcome | null;
}

/**
 * Compute batch status after row resolution
 * Called when ambiguous/invalid rows are resolved or excluded
 */
export function computeStatusAfterResolution(batch: BatchSummary): BatchStatus {
  const { status, invalidRows, ambiguousRows, reviewOutcome } = batch;

  // Don't change terminal states
  if (isTerminalStatus(status)) {
    return status;
  }

  // If batch is already beyond proposal stage, don't regress
  if (status === BATCH_STATUS.APPLYING || status === BATCH_STATUS.READY_TO_APPLY) {
    return status;
  }

  // If all issues resolved and CONFIRM set, ready to apply
  const allResolved = invalidRows === 0 && ambiguousRows === 0;
  const isConfirmed = reviewOutcome === REVIEW_OUTCOME.CONFIRM;

  if (allResolved && isConfirmed) {
    return BATCH_STATUS.READY_TO_APPLY;
  }

  // If issues remain or not confirmed, stay in needs review
  if (invalidRows > 0 || ambiguousRows > 0) {
    return BATCH_STATUS.PROPOSED_NEEDS_REVIEW;
  }

  // No issues but not confirmed yet - stay in PROPOSED_OK or PROPOSED_NEEDS_REVIEW
  return status;
}

/**
 * Check if batch can be applied
 * Gating rules from IMPORTS_UI_SPEC.md Section 3:
 * 1. All invalid rows must be excluded
 * 2. All ambiguous rows must be resolved
 * 3. Review outcome must be CONFIRM
 * 4. Status must be READY_TO_APPLY
 */
export function canApply(batch: BatchSummary): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check status
  if (batch.status !== BATCH_STATUS.READY_TO_APPLY) {
    reasons.push(`Batch status is ${batch.status}, must be READY_TO_APPLY`);
  }

  // Check invalid rows
  if (batch.invalidRows > 0) {
    reasons.push(`${batch.invalidRows} invalid row(s) must be excluded`);
  }

  // Check ambiguous rows
  if (batch.ambiguousRows > 0) {
    reasons.push(`${batch.ambiguousRows} ambiguous row(s) must be resolved`);
  }

  // Check review outcome
  if (batch.reviewOutcome !== REVIEW_OUTCOME.CONFIRM) {
    reasons.push(`Review outcome must be CONFIRM, currently ${batch.reviewOutcome ?? 'not set'}`);
  }

  // Check there are rows to process
  const processableRows = batch.validRows - batch.excludedRows;
  if (processableRows <= 0) {
    reasons.push('No rows to process (all excluded or batch is empty)');
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

/**
 * Check if batch can be rejected (DENY triage)
 * Can reject from most non-terminal states
 */
export function canReject(status: BatchStatus): boolean {
  const rejectableStates: BatchStatus[] = [
    BATCH_STATUS.PROPOSED_OK,
    BATCH_STATUS.PROPOSED_NEEDS_REVIEW,
    BATCH_STATUS.READY_TO_APPLY,
  ];
  return rejectableStates.includes(status);
}

/**
 * Check if batch can be triaged (set review outcome)
 * Only in PROPOSED_* states
 */
export function canTriage(status: BatchStatus): boolean {
  return status === BATCH_STATUS.PROPOSED_OK || status === BATCH_STATUS.PROPOSED_NEEDS_REVIEW;
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: BatchStatus): string {
  const labels: Record<BatchStatus, string> = {
    [BATCH_STATUS.RECEIVED]: 'Received',
    [BATCH_STATUS.PARSING]: 'Processing',
    [BATCH_STATUS.PROPOSED_OK]: 'Ready for Review',
    [BATCH_STATUS.PROPOSED_NEEDS_REVIEW]: 'Needs Attention',
    [BATCH_STATUS.READY_TO_APPLY]: 'Ready to Apply',
    [BATCH_STATUS.APPLYING]: 'Applying...',
    [BATCH_STATUS.APPLIED]: 'Applied',
    [BATCH_STATUS.REJECTED]: 'Rejected',
    [BATCH_STATUS.FAILED_VALIDATION]: 'Validation Failed',
    [BATCH_STATUS.FAILED_SYSTEM]: 'System Error',
  };
  return labels[status] ?? status;
}

/**
 * Get status color for UI badges
 */
export function getStatusColor(status: BatchStatus): 'green' | 'yellow' | 'red' | 'blue' | 'gray' {
  switch (status) {
    case BATCH_STATUS.APPLIED:
      return 'green';
    case BATCH_STATUS.READY_TO_APPLY:
    case BATCH_STATUS.PROPOSED_OK:
      return 'blue';
    case BATCH_STATUS.PROPOSED_NEEDS_REVIEW:
    case BATCH_STATUS.PARSING:
    case BATCH_STATUS.APPLYING:
      return 'yellow';
    case BATCH_STATUS.REJECTED:
    case BATCH_STATUS.FAILED_VALIDATION:
    case BATCH_STATUS.FAILED_SYSTEM:
      return 'red';
    default:
      return 'gray';
  }
}
