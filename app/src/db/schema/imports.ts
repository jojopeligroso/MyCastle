/**
 * Imports Schema - Upload Batches, Staging Rows, Proposed Changes
 * ETL/Import workflow for enrollment data (classes.xlsx)
 * Ref: spec/IMPORTS_UI_SPEC.md
 * Date: 2026-02-22
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  integer,
  jsonb,
  index,
  boolean,
} from 'drizzle-orm/pg-core';
import { tenants, users } from './core';
import { enrollments } from './academic';

/**
 * Upload Batches Table
 * Tracks import batch lifecycle with 10-state machine
 *
 * State Machine:
 * RECEIVED -> PARSING -> PROPOSED_OK | PROPOSED_NEEDS_REVIEW
 * PROPOSED_OK -> READY_TO_APPLY
 * PROPOSED_NEEDS_REVIEW -> READY_TO_APPLY (after resolution)
 * READY_TO_APPLY -> APPLYING -> APPLIED (terminal)
 * Any -> REJECTED (terminal, via DENY)
 * PARSING -> FAILED_VALIDATION (terminal, bad file)
 * APPLYING -> FAILED_SYSTEM (terminal, apply error)
 */
export const uploadBatches = pgTable(
  'upload_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // File metadata
    fileType: varchar('file_type', { length: 50 }).notNull().default('classes'),
    fileName: varchar('file_name', { length: 255 }),

    // State machine status
    status: varchar('status', { length: 50 }).notNull().default('RECEIVED'),
    // Valid values: RECEIVED, PARSING, PROPOSED_OK, PROPOSED_NEEDS_REVIEW,
    //               READY_TO_APPLY, APPLYING, APPLIED, REJECTED, FAILED_VALIDATION, FAILED_SYSTEM

    // Denormalized counts (for performance - avoids joins)
    totalRows: integer('total_rows').notNull().default(0),
    validRows: integer('valid_rows').notNull().default(0),
    invalidRows: integer('invalid_rows').notNull().default(0),
    ambiguousRows: integer('ambiguous_rows').notNull().default(0),
    newRows: integer('new_rows').notNull().default(0),
    updateRows: integer('update_rows').notNull().default(0),
    excludedRows: integer('excluded_rows').notNull().default(0),

    // Triage fields
    reviewOutcome: varchar('review_outcome', { length: 50 }), // CONFIRM | DENY | NEEDS_REVIEW
    reviewComment: text('review_comment'),

    // Parse metadata
    ignoredColumns: jsonb('ignored_columns').$type<string[]>().default([]),
    parseError: text('parse_error'),

    // Audit trail
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    appliedBy: uuid('applied_by').references(() => users.id),
    appliedAt: timestamp('applied_at'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_upload_batches_tenant').on(table.tenantId),
    index('idx_upload_batches_status').on(table.status),
    index('idx_upload_batches_created_by').on(table.createdBy),
    index('idx_upload_batches_created_at').on(table.createdAt),
  ]
);

/**
 * Staging Rows Table
 * Individual rows from uploaded file with validation state
 *
 * Row Status:
 * VALID - Row passed validation, matched to single enrollment
 * INVALID - Row has validation errors (missing fields, bad format)
 * AMBIGUOUS - Row matched multiple enrollments, needs resolution
 * EXCLUDED - Admin excluded this row from processing
 */
export const stgRows = pgTable(
  'stg_rows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => uploadBatches.id, { onDelete: 'cascade' }),

    // Row position in file (1-indexed, excludes header)
    rowNumber: integer('row_number').notNull(),

    // Row status
    rowStatus: varchar('row_status', { length: 50 }).notNull().default('VALID'),
    // Valid values: VALID, INVALID, AMBIGUOUS, EXCLUDED

    // Raw data from file (column -> value mapping)
    rawData: jsonb('raw_data').$type<Record<string, unknown>>().notNull(),

    // Parsed/normalized data
    parsedData: jsonb('parsed_data').$type<Record<string, unknown>>(),

    // Validation errors (for INVALID rows)
    validationErrors: jsonb('validation_errors')
      .$type<Array<{ field: string; message: string }>>()
      .default([]),

    // Match candidates (for AMBIGUOUS rows)
    matchCandidates: jsonb('match_candidates')
      .$type<
        Array<{ enrollmentId: string; studentName: string; className: string; score: number }>
      >()
      .default([]),

    // Resolution tracking (for AMBIGUOUS rows)
    resolvedAt: timestamp('resolved_at'),
    resolvedBy: uuid('resolved_by').references(() => users.id),
    resolutionType: varchar('resolution_type', { length: 50 }), // linked | new | excluded
    linkedEnrollmentId: uuid('linked_enrollment_id').references(() => enrollments.id),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_stg_rows_batch').on(table.batchId),
    index('idx_stg_rows_tenant').on(table.tenantId),
    index('idx_stg_rows_status').on(table.rowStatus),
    index('idx_stg_rows_batch_status').on(table.batchId, table.rowStatus),
  ]
);

/**
 * Proposed Changes Table
 * Computed diffs/actions for each staged row
 *
 * Action Types:
 * INSERT - Create new enrollment (no match found or "treat as new")
 * UPDATE - Update existing enrollment (single match)
 * NOOP - No changes needed (data matches existing)
 * NEEDS_RESOLUTION - Requires admin decision (ambiguous match)
 */
export const proposedChanges = pgTable(
  'proposed_changes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => uploadBatches.id, { onDelete: 'cascade' }),
    stgRowId: uuid('stg_row_id')
      .notNull()
      .references(() => stgRows.id, { onDelete: 'cascade' }),

    // Proposed action
    action: varchar('action', { length: 50 }).notNull(),
    // Valid values: INSERT, UPDATE, NOOP, NEEDS_RESOLUTION

    // Target enrollment (for UPDATE/NOOP)
    targetEnrollmentId: uuid('target_enrollment_id').references(() => enrollments.id),

    // Diff for UPDATE actions: { fieldName: { old: value, new: value } }
    diff: jsonb('diff').$type<Record<string, { old: unknown; new: unknown }>>(),

    // Exclusion flag (admin can exclude individual changes)
    isExcluded: boolean('is_excluded').default(false),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_proposed_changes_batch').on(table.batchId),
    index('idx_proposed_changes_tenant').on(table.tenantId),
    index('idx_proposed_changes_stg_row').on(table.stgRowId),
    index('idx_proposed_changes_action').on(table.action),
    index('idx_proposed_changes_target').on(table.targetEnrollmentId),
  ]
);

// Type exports
export type UploadBatch = typeof uploadBatches.$inferSelect;
export type NewUploadBatch = typeof uploadBatches.$inferInsert;

export type StgRow = typeof stgRows.$inferSelect;
export type NewStgRow = typeof stgRows.$inferInsert;

export type ProposedChange = typeof proposedChanges.$inferSelect;
export type NewProposedChange = typeof proposedChanges.$inferInsert;

// Status constants for state machine
export const BATCH_STATUS = {
  RECEIVED: 'RECEIVED',
  PARSING: 'PARSING',
  PROPOSED_OK: 'PROPOSED_OK',
  PROPOSED_NEEDS_REVIEW: 'PROPOSED_NEEDS_REVIEW',
  READY_TO_APPLY: 'READY_TO_APPLY',
  APPLYING: 'APPLYING',
  APPLIED: 'APPLIED',
  REJECTED: 'REJECTED',
  FAILED_VALIDATION: 'FAILED_VALIDATION',
  FAILED_SYSTEM: 'FAILED_SYSTEM',
} as const;

export type BatchStatus = (typeof BATCH_STATUS)[keyof typeof BATCH_STATUS];

export const ROW_STATUS = {
  VALID: 'VALID',
  INVALID: 'INVALID',
  AMBIGUOUS: 'AMBIGUOUS',
  EXCLUDED: 'EXCLUDED',
} as const;

export type RowStatus = (typeof ROW_STATUS)[keyof typeof ROW_STATUS];

export const CHANGE_ACTION = {
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  NOOP: 'NOOP',
  NEEDS_RESOLUTION: 'NEEDS_RESOLUTION',
} as const;

export type ChangeAction = (typeof CHANGE_ACTION)[keyof typeof CHANGE_ACTION];

export const REVIEW_OUTCOME = {
  CONFIRM: 'CONFIRM',
  DENY: 'DENY',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
} as const;

export type ReviewOutcome = (typeof REVIEW_OUTCOME)[keyof typeof REVIEW_OUTCOME];

export const RESOLUTION_TYPE = {
  LINKED: 'linked',
  NEW: 'new',
  EXCLUDED: 'excluded',
} as const;

export type ResolutionType = (typeof RESOLUTION_TYPE)[keyof typeof RESOLUTION_TYPE];
