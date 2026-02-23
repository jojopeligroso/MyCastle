/**
 * State Machine Unit Tests
 * Tests batch status transitions and gating rules
 * Ref: spec/IMPORTS_UI_SPEC.md Section 5
 */

import {
  canTransition,
  isTerminalStatus,
  getNextStates,
  computeStatusAfterResolution,
  canApply,
  canReject,
  canTriage,
  getStatusLabel,
  getStatusColor,
  type BatchSummary,
} from '../state-machine';
import { BATCH_STATUS, REVIEW_OUTCOME } from '@/db/schema/imports';

describe('State Machine', () => {
  describe('canTransition', () => {
    it('should allow RECEIVED -> PARSING', () => {
      expect(canTransition(BATCH_STATUS.RECEIVED, BATCH_STATUS.PARSING)).toBe(true);
    });

    it('should allow PARSING -> PROPOSED_OK', () => {
      expect(canTransition(BATCH_STATUS.PARSING, BATCH_STATUS.PROPOSED_OK)).toBe(true);
    });

    it('should allow PARSING -> PROPOSED_NEEDS_REVIEW', () => {
      expect(canTransition(BATCH_STATUS.PARSING, BATCH_STATUS.PROPOSED_NEEDS_REVIEW)).toBe(true);
    });

    it('should allow PARSING -> FAILED_VALIDATION', () => {
      expect(canTransition(BATCH_STATUS.PARSING, BATCH_STATUS.FAILED_VALIDATION)).toBe(true);
    });

    it('should allow PROPOSED_OK -> READY_TO_APPLY', () => {
      expect(canTransition(BATCH_STATUS.PROPOSED_OK, BATCH_STATUS.READY_TO_APPLY)).toBe(true);
    });

    it('should allow PROPOSED_OK -> REJECTED', () => {
      expect(canTransition(BATCH_STATUS.PROPOSED_OK, BATCH_STATUS.REJECTED)).toBe(true);
    });

    it('should allow READY_TO_APPLY -> APPLYING', () => {
      expect(canTransition(BATCH_STATUS.READY_TO_APPLY, BATCH_STATUS.APPLYING)).toBe(true);
    });

    it('should allow APPLYING -> APPLIED', () => {
      expect(canTransition(BATCH_STATUS.APPLYING, BATCH_STATUS.APPLIED)).toBe(true);
    });

    it('should allow APPLYING -> FAILED_SYSTEM', () => {
      expect(canTransition(BATCH_STATUS.APPLYING, BATCH_STATUS.FAILED_SYSTEM)).toBe(true);
    });

    it('should NOT allow APPLIED -> any state (terminal)', () => {
      expect(canTransition(BATCH_STATUS.APPLIED, BATCH_STATUS.RECEIVED)).toBe(false);
      expect(canTransition(BATCH_STATUS.APPLIED, BATCH_STATUS.PARSING)).toBe(false);
      expect(canTransition(BATCH_STATUS.APPLIED, BATCH_STATUS.REJECTED)).toBe(false);
    });

    it('should NOT allow REJECTED -> any state (terminal)', () => {
      expect(canTransition(BATCH_STATUS.REJECTED, BATCH_STATUS.RECEIVED)).toBe(false);
      expect(canTransition(BATCH_STATUS.REJECTED, BATCH_STATUS.PROPOSED_OK)).toBe(false);
    });

    it('should NOT allow FAILED_VALIDATION -> any state (terminal)', () => {
      expect(canTransition(BATCH_STATUS.FAILED_VALIDATION, BATCH_STATUS.PARSING)).toBe(false);
    });

    it('should NOT allow FAILED_SYSTEM -> any state (terminal)', () => {
      expect(canTransition(BATCH_STATUS.FAILED_SYSTEM, BATCH_STATUS.APPLYING)).toBe(false);
    });

    it('should NOT allow backwards transitions', () => {
      expect(canTransition(BATCH_STATUS.PROPOSED_OK, BATCH_STATUS.PARSING)).toBe(false);
      expect(canTransition(BATCH_STATUS.READY_TO_APPLY, BATCH_STATUS.PROPOSED_OK)).toBe(false);
    });

    it('should NOT allow skipping states', () => {
      expect(canTransition(BATCH_STATUS.RECEIVED, BATCH_STATUS.PROPOSED_OK)).toBe(false);
      expect(canTransition(BATCH_STATUS.PARSING, BATCH_STATUS.APPLIED)).toBe(false);
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for APPLIED', () => {
      expect(isTerminalStatus(BATCH_STATUS.APPLIED)).toBe(true);
    });

    it('should return true for REJECTED', () => {
      expect(isTerminalStatus(BATCH_STATUS.REJECTED)).toBe(true);
    });

    it('should return true for FAILED_VALIDATION', () => {
      expect(isTerminalStatus(BATCH_STATUS.FAILED_VALIDATION)).toBe(true);
    });

    it('should return true for FAILED_SYSTEM', () => {
      expect(isTerminalStatus(BATCH_STATUS.FAILED_SYSTEM)).toBe(true);
    });

    it('should return false for non-terminal states', () => {
      expect(isTerminalStatus(BATCH_STATUS.RECEIVED)).toBe(false);
      expect(isTerminalStatus(BATCH_STATUS.PARSING)).toBe(false);
      expect(isTerminalStatus(BATCH_STATUS.PROPOSED_OK)).toBe(false);
      expect(isTerminalStatus(BATCH_STATUS.PROPOSED_NEEDS_REVIEW)).toBe(false);
      expect(isTerminalStatus(BATCH_STATUS.READY_TO_APPLY)).toBe(false);
      expect(isTerminalStatus(BATCH_STATUS.APPLYING)).toBe(false);
    });
  });

  describe('getNextStates', () => {
    it('should return [PARSING] for RECEIVED', () => {
      expect(getNextStates(BATCH_STATUS.RECEIVED)).toEqual([BATCH_STATUS.PARSING]);
    });

    it('should return multiple options for PARSING', () => {
      const nextStates = getNextStates(BATCH_STATUS.PARSING);
      expect(nextStates).toContain(BATCH_STATUS.PROPOSED_OK);
      expect(nextStates).toContain(BATCH_STATUS.PROPOSED_NEEDS_REVIEW);
      expect(nextStates).toContain(BATCH_STATUS.FAILED_VALIDATION);
    });

    it('should return empty array for terminal states', () => {
      expect(getNextStates(BATCH_STATUS.APPLIED)).toEqual([]);
      expect(getNextStates(BATCH_STATUS.REJECTED)).toEqual([]);
      expect(getNextStates(BATCH_STATUS.FAILED_VALIDATION)).toEqual([]);
      expect(getNextStates(BATCH_STATUS.FAILED_SYSTEM)).toEqual([]);
    });
  });

  describe('canApply', () => {
    const baseBatch: BatchSummary = {
      status: BATCH_STATUS.READY_TO_APPLY,
      invalidRows: 0,
      ambiguousRows: 0,
      excludedRows: 0,
      validRows: 10,
      totalRows: 10,
      reviewOutcome: REVIEW_OUTCOME.CONFIRM,
    };

    it('should allow apply when all conditions met', () => {
      const result = canApply(baseBatch);
      expect(result.allowed).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('should NOT allow apply when status is not READY_TO_APPLY', () => {
      const batch = { ...baseBatch, status: BATCH_STATUS.PROPOSED_OK };
      const result = canApply(batch);
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain('Batch status is PROPOSED_OK, must be READY_TO_APPLY');
    });

    it('should NOT allow apply when invalid rows remain', () => {
      const batch = { ...baseBatch, invalidRows: 2 };
      const result = canApply(batch);
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain('2 invalid row(s) must be excluded');
    });

    it('should NOT allow apply when ambiguous rows remain', () => {
      const batch = { ...baseBatch, ambiguousRows: 3 };
      const result = canApply(batch);
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain('3 ambiguous row(s) must be resolved');
    });

    it('should NOT allow apply when review outcome is not CONFIRM', () => {
      const batch = { ...baseBatch, reviewOutcome: REVIEW_OUTCOME.NEEDS_REVIEW };
      const result = canApply(batch);
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain('Review outcome must be CONFIRM, currently NEEDS_REVIEW');
    });

    it('should NOT allow apply when review outcome is null', () => {
      const batch = { ...baseBatch, reviewOutcome: null };
      const result = canApply(batch);
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain('Review outcome must be CONFIRM, currently not set');
    });

    it('should NOT allow apply when no rows to process', () => {
      const batch = { ...baseBatch, validRows: 5, excludedRows: 5 };
      const result = canApply(batch);
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain('No rows to process (all excluded or batch is empty)');
    });

    it('should return multiple reasons when multiple conditions fail', () => {
      const batch: BatchSummary = {
        status: BATCH_STATUS.PROPOSED_NEEDS_REVIEW,
        invalidRows: 2,
        ambiguousRows: 3,
        excludedRows: 0,
        validRows: 10,
        totalRows: 15,
        reviewOutcome: null,
      };
      const result = canApply(batch);
      expect(result.allowed).toBe(false);
      expect(result.reasons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('canReject', () => {
    it('should allow reject from PROPOSED_OK', () => {
      expect(canReject(BATCH_STATUS.PROPOSED_OK)).toBe(true);
    });

    it('should allow reject from PROPOSED_NEEDS_REVIEW', () => {
      expect(canReject(BATCH_STATUS.PROPOSED_NEEDS_REVIEW)).toBe(true);
    });

    it('should allow reject from READY_TO_APPLY', () => {
      expect(canReject(BATCH_STATUS.READY_TO_APPLY)).toBe(true);
    });

    it('should NOT allow reject from RECEIVED', () => {
      expect(canReject(BATCH_STATUS.RECEIVED)).toBe(false);
    });

    it('should NOT allow reject from PARSING', () => {
      expect(canReject(BATCH_STATUS.PARSING)).toBe(false);
    });

    it('should NOT allow reject from APPLYING', () => {
      expect(canReject(BATCH_STATUS.APPLYING)).toBe(false);
    });

    it('should NOT allow reject from terminal states', () => {
      expect(canReject(BATCH_STATUS.APPLIED)).toBe(false);
      expect(canReject(BATCH_STATUS.REJECTED)).toBe(false);
      expect(canReject(BATCH_STATUS.FAILED_VALIDATION)).toBe(false);
      expect(canReject(BATCH_STATUS.FAILED_SYSTEM)).toBe(false);
    });
  });

  describe('canTriage', () => {
    it('should allow triage from PROPOSED_OK', () => {
      expect(canTriage(BATCH_STATUS.PROPOSED_OK)).toBe(true);
    });

    it('should allow triage from PROPOSED_NEEDS_REVIEW', () => {
      expect(canTriage(BATCH_STATUS.PROPOSED_NEEDS_REVIEW)).toBe(true);
    });

    it('should NOT allow triage from other states', () => {
      expect(canTriage(BATCH_STATUS.RECEIVED)).toBe(false);
      expect(canTriage(BATCH_STATUS.PARSING)).toBe(false);
      expect(canTriage(BATCH_STATUS.READY_TO_APPLY)).toBe(false);
      expect(canTriage(BATCH_STATUS.APPLYING)).toBe(false);
      expect(canTriage(BATCH_STATUS.APPLIED)).toBe(false);
      expect(canTriage(BATCH_STATUS.REJECTED)).toBe(false);
    });
  });

  describe('computeStatusAfterResolution', () => {
    it('should return READY_TO_APPLY when all resolved and CONFIRM set', () => {
      const batch: BatchSummary = {
        status: BATCH_STATUS.PROPOSED_NEEDS_REVIEW,
        invalidRows: 0,
        ambiguousRows: 0,
        excludedRows: 2,
        validRows: 10,
        totalRows: 12,
        reviewOutcome: REVIEW_OUTCOME.CONFIRM,
      };
      expect(computeStatusAfterResolution(batch)).toBe(BATCH_STATUS.READY_TO_APPLY);
    });

    it('should stay in PROPOSED_NEEDS_REVIEW when issues remain', () => {
      const batch: BatchSummary = {
        status: BATCH_STATUS.PROPOSED_OK,
        invalidRows: 1,
        ambiguousRows: 0,
        excludedRows: 0,
        validRows: 10,
        totalRows: 11,
        reviewOutcome: REVIEW_OUTCOME.CONFIRM,
      };
      expect(computeStatusAfterResolution(batch)).toBe(BATCH_STATUS.PROPOSED_NEEDS_REVIEW);
    });

    it('should not change terminal states', () => {
      const batch: BatchSummary = {
        status: BATCH_STATUS.APPLIED,
        invalidRows: 0,
        ambiguousRows: 0,
        excludedRows: 0,
        validRows: 10,
        totalRows: 10,
        reviewOutcome: REVIEW_OUTCOME.CONFIRM,
      };
      expect(computeStatusAfterResolution(batch)).toBe(BATCH_STATUS.APPLIED);
    });

    it('should not regress from READY_TO_APPLY', () => {
      const batch: BatchSummary = {
        status: BATCH_STATUS.READY_TO_APPLY,
        invalidRows: 0,
        ambiguousRows: 0,
        excludedRows: 0,
        validRows: 10,
        totalRows: 10,
        reviewOutcome: REVIEW_OUTCOME.CONFIRM,
      };
      expect(computeStatusAfterResolution(batch)).toBe(BATCH_STATUS.READY_TO_APPLY);
    });
  });

  describe('getStatusLabel', () => {
    it('should return human-readable labels', () => {
      expect(getStatusLabel(BATCH_STATUS.RECEIVED)).toBe('Received');
      expect(getStatusLabel(BATCH_STATUS.PARSING)).toBe('Processing');
      expect(getStatusLabel(BATCH_STATUS.PROPOSED_OK)).toBe('Ready for Review');
      expect(getStatusLabel(BATCH_STATUS.PROPOSED_NEEDS_REVIEW)).toBe('Needs Attention');
      expect(getStatusLabel(BATCH_STATUS.READY_TO_APPLY)).toBe('Ready to Apply');
      expect(getStatusLabel(BATCH_STATUS.APPLYING)).toBe('Applying...');
      expect(getStatusLabel(BATCH_STATUS.APPLIED)).toBe('Applied');
      expect(getStatusLabel(BATCH_STATUS.REJECTED)).toBe('Rejected');
      expect(getStatusLabel(BATCH_STATUS.FAILED_VALIDATION)).toBe('Validation Failed');
      expect(getStatusLabel(BATCH_STATUS.FAILED_SYSTEM)).toBe('System Error');
    });
  });

  describe('getStatusColor', () => {
    it('should return green for APPLIED', () => {
      expect(getStatusColor(BATCH_STATUS.APPLIED)).toBe('green');
    });

    it('should return blue for ready states', () => {
      expect(getStatusColor(BATCH_STATUS.READY_TO_APPLY)).toBe('blue');
      expect(getStatusColor(BATCH_STATUS.PROPOSED_OK)).toBe('blue');
    });

    it('should return yellow for in-progress states', () => {
      expect(getStatusColor(BATCH_STATUS.PROPOSED_NEEDS_REVIEW)).toBe('yellow');
      expect(getStatusColor(BATCH_STATUS.PARSING)).toBe('yellow');
      expect(getStatusColor(BATCH_STATUS.APPLYING)).toBe('yellow');
    });

    it('should return red for error states', () => {
      expect(getStatusColor(BATCH_STATUS.REJECTED)).toBe('red');
      expect(getStatusColor(BATCH_STATUS.FAILED_VALIDATION)).toBe('red');
      expect(getStatusColor(BATCH_STATUS.FAILED_SYSTEM)).toBe('red');
    });

    it('should return gray for RECEIVED', () => {
      expect(getStatusColor(BATCH_STATUS.RECEIVED)).toBe('gray');
    });
  });
});
