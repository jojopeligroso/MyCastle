/**
 * Profile Schema - Student Profile Feature Tables
 * Implements teacher notes, competency assessments, diagnostic history,
 * level promotions, contact verification, and LLM tutor hooks.
 *
 * Ref: FRESH_0027_student_profile_feature.sql
 * Date: 2026-03-01
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  boolean,
  integer,
  date,
  decimal,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants, users } from './core';
import { classes, enrollments, assignments } from './academic';
import { cefrDescriptors } from './curriculum';

// ============================================================================
// TENANT CEFR CONFIGURATION
// ============================================================================

/**
 * Tenant CEFR Configuration
 * School-specific settings for CEFR levels and assessment
 */
export const tenantCefrConfig = pgTable(
  'tenant_cefr_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Selected levels for this school
    enabledLevels: jsonb('enabled_levels')
      .$type<string[]>()
      .default(['A1', 'A2', 'B1', 'B1+', 'B2', 'B2+', 'C1']),

    // Plus levels support
    usesPlusLevels: boolean('uses_plus_levels').default(true),

    // Assessment configuration
    assessmentFrequency: varchar('assessment_frequency', { length: 50 }).default('weekly'),
    assessmentWeights: jsonb('assessment_weights')
      .$type<{ periodic: number; ad_hoc: number; end_of_unit: number }>()
      .default({ periodic: 0.6, ad_hoc: 0.2, end_of_unit: 0.2 }),

    // Descriptor selection mode
    descriptorMode: varchar('descriptor_mode', { length: 50 }).default('all'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [uniqueIndex('uk_tenant_cefr_config_tenant').on(table.tenantId)]
);

/**
 * Tenant Descriptor Selection
 * Which official CEFR descriptors are enabled for each school
 */
export const tenantDescriptorSelection = pgTable(
  'tenant_descriptor_selection',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    descriptorId: uuid('descriptor_id')
      .notNull()
      .references(() => cefrDescriptors.id, { onDelete: 'cascade' }),
    isEnabled: boolean('is_enabled').default(true),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('uk_tenant_descriptor_selection').on(table.tenantId, table.descriptorId),
    index('idx_tenant_descriptor_selection_tenant').on(table.tenantId),
  ]
);

// ============================================================================
// TEACHER NOTES
// ============================================================================

/**
 * Student Notes
 * Teacher/staff notes about students with visibility control
 */
export const studentNotes = pgTable(
  'student_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Author information
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    authorRole: varchar('author_role', { length: 50 }).notNull(),

    // Note content
    content: text('content').notNull(),
    noteType: varchar('note_type', { length: 50 }).default('general'),

    // Visibility control
    visibility: varchar('visibility', { length: 50 }).notNull().default('private'),
    isSharedWithStudent: boolean('is_shared_with_student').default(false),
    sharedAt: timestamp('shared_at'),

    // Categorization
    tags: jsonb('tags').$type<string[]>().default([]),

    // Audit
    editedAt: timestamp('edited_at'),
    editedBy: uuid('edited_by').references(() => users.id),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_student_notes_student').on(table.studentId),
    index('idx_student_notes_tenant').on(table.tenantId),
    index('idx_student_notes_author').on(table.authorId),
    index('idx_student_notes_visibility').on(table.visibility),
    index('idx_student_notes_type').on(table.noteType),
  ]
);

// ============================================================================
// COMPETENCY ASSESSMENTS
// ============================================================================

/**
 * Competency Assessments
 * Individual assessment records (student × descriptor × date × score)
 */
export const competencyAssessments = pgTable(
  'competency_assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // What is being assessed
    descriptorId: uuid('descriptor_id')
      .notNull()
      .references(() => cefrDescriptors.id),

    // Assessment context
    classId: uuid('class_id').references(() => classes.id),
    enrollmentId: uuid('enrollment_id').references(() => enrollments.id),
    assignmentId: uuid('assignment_id').references(() => assignments.id),

    // Assessment details
    assessmentType: varchar('assessment_type', { length: 50 }).notNull(),
    assessmentDate: date('assessment_date').notNull().defaultNow(),

    // Score (1-4 scale)
    score: integer('score').notNull(),

    // Optional notes
    notes: text('notes'),

    // Assessor
    assessedBy: uuid('assessed_by')
      .notNull()
      .references(() => users.id),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_competency_assessments_student').on(table.studentId),
    index('idx_competency_assessments_descriptor').on(table.descriptorId),
    index('idx_competency_assessments_class').on(table.classId),
    index('idx_competency_assessments_date').on(table.assessmentDate),
    index('idx_competency_assessments_type').on(table.assessmentType),
    index('idx_competency_assessments_tenant').on(table.tenantId),
  ]
);

/**
 * Competency Progress
 * Aggregated competency state per student per descriptor (denormalized for performance)
 */
export const competencyProgress = pgTable(
  'competency_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    descriptorId: uuid('descriptor_id')
      .notNull()
      .references(() => cefrDescriptors.id),

    // Current state
    currentScore: decimal('current_score', { precision: 3, scale: 2 }),
    assessmentCount: integer('assessment_count').default(0),
    lastAssessedAt: timestamp('last_assessed_at'),

    // Progress tracking
    isCompetent: boolean('is_competent').default(false),
    competentSince: timestamp('competent_since'),

    // Enrollment context
    enrollmentId: uuid('enrollment_id').references(() => enrollments.id),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('uk_competency_progress').on(
      table.studentId,
      table.descriptorId,
      table.enrollmentId
    ),
    index('idx_competency_progress_student').on(table.studentId),
    index('idx_competency_progress_descriptor').on(table.descriptorId),
  ]
);

// ============================================================================
// DIAGNOSTIC HISTORY
// ============================================================================

/**
 * Diagnostic Sessions
 * Tracks diagnostic/placement test history
 */
export const diagnosticSessions = pgTable(
  'diagnostic_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Session timing
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('in_progress'),
    currentStage: varchar('current_stage', { length: 100 }),

    // Results
    recommendedLevel: varchar('recommended_level', { length: 5 }),
    actualPlacementLevel: varchar('actual_placement_level', { length: 5 }),

    // Stage results
    stageResults: jsonb('stage_results').$type<Record<string, unknown>>().default({}),

    // Metadata
    administeredBy: uuid('administered_by').references(() => users.id),
    notes: text('notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_diagnostic_sessions_student').on(table.studentId),
    index('idx_diagnostic_sessions_tenant').on(table.tenantId),
    index('idx_diagnostic_sessions_status').on(table.status),
    index('idx_diagnostic_sessions_date').on(table.startedAt),
  ]
);

// ============================================================================
// LEVEL PROMOTIONS
// ============================================================================

/**
 * Level Promotions
 * Teacher recommendation → DoS approval workflow for level changes
 */
export const levelPromotions = pgTable(
  'level_promotions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Level change
    fromLevel: varchar('from_level', { length: 5 }).notNull(),
    toLevel: varchar('to_level', { length: 5 }).notNull(),

    // Recommendation
    recommendedBy: uuid('recommended_by')
      .notNull()
      .references(() => users.id),
    recommendedAt: timestamp('recommended_at').notNull().defaultNow(),
    recommendationReason: text('recommendation_reason'),

    // Evidence
    evidenceSummary: jsonb('evidence_summary').$type<Record<string, unknown>>().default({}),

    // Approval workflow
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at'),
    reviewNotes: text('review_notes'),

    // Application
    appliedAt: timestamp('applied_at'),

    // Class transfer
    fromClassId: uuid('from_class_id').references(() => classes.id),
    toClassId: uuid('to_class_id').references(() => classes.id),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_level_promotions_student').on(table.studentId),
    index('idx_level_promotions_status').on(table.status),
    index('idx_level_promotions_tenant').on(table.tenantId),
  ]
);

// ============================================================================
// CONTACT VERIFICATION
// ============================================================================

/**
 * Contact Verifications
 * Email/phone change verification with 24-hour expiry
 */
export const contactVerifications = pgTable(
  'contact_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // What's being verified
    contactType: varchar('contact_type', { length: 20 }).notNull(),
    newValue: varchar('new_value', { length: 255 }).notNull(),
    oldValue: varchar('old_value', { length: 255 }),

    // Verification code
    verificationCode: varchar('verification_code', { length: 10 }).notNull(),
    codeExpiresAt: timestamp('code_expires_at').notNull(),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    verifiedAt: timestamp('verified_at'),

    // Audit
    attempts: integer('attempts').default(0),
    lastAttemptAt: timestamp('last_attempt_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('idx_contact_verifications_user').on(table.userId),
    index('idx_contact_verifications_status').on(table.status),
    index('idx_contact_verifications_expires').on(table.codeExpiresAt),
  ]
);

// ============================================================================
// LLM TUTOR HOOKS (Future Extension Points)
// ============================================================================

/**
 * Exercise Attempts
 * LLM-generated exercise tracking (MCQ, vocab match, etc.)
 */
export const exerciseAttempts = pgTable(
  'exercise_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Exercise details
    exerciseType: varchar('exercise_type', { length: 50 }).notNull(),
    exerciseContent: jsonb('exercise_content').notNull(),

    // Results
    studentResponse: jsonb('student_response'),
    score: decimal('score', { precision: 5, scale: 2 }),
    isCorrect: boolean('is_correct'),
    feedback: jsonb('feedback'),

    // Context
    descriptorId: uuid('descriptor_id').references(() => cefrDescriptors.id),
    cefrLevel: varchar('cefr_level', { length: 5 }),
    topic: varchar('topic', { length: 255 }),

    // Timing
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    timeSpentSeconds: integer('time_spent_seconds'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('idx_exercise_attempts_student').on(table.studentId),
    index('idx_exercise_attempts_type').on(table.exerciseType),
    index('idx_exercise_attempts_date').on(table.startedAt),
  ]
);

/**
 * Vocabulary Lists
 * Student vocabulary discovery and spaced repetition
 */
export const vocabLists = pgTable(
  'vocab_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Vocabulary item
    word: varchar('word', { length: 255 }).notNull(),
    definition: text('definition'),
    contextSentence: text('context_sentence'),

    // Categorization
    cefrLevel: varchar('cefr_level', { length: 5 }),
    topic: varchar('topic', { length: 100 }),
    wordType: varchar('word_type', { length: 50 }),

    // Learning state
    masteryLevel: integer('mastery_level').default(1),
    timesReviewed: integer('times_reviewed').default(0),
    lastReviewedAt: timestamp('last_reviewed_at'),
    nextReviewAt: timestamp('next_review_at'),

    // Source
    discoveredFrom: varchar('discovered_from', { length: 100 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_vocab_lists_student').on(table.studentId),
    index('idx_vocab_lists_mastery').on(table.masteryLevel),
    index('idx_vocab_lists_review').on(table.nextReviewAt),
  ]
);

/**
 * Tutor Interactions
 * LLM tutor conversation history
 */
export const tutorInteractions = pgTable(
  'tutor_interactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Conversation context
    sessionId: uuid('session_id'),
    interactionType: varchar('interaction_type', { length: 50 }).notNull(),

    // Content
    messages: jsonb('messages')
      .$type<Array<{ role: string; content: string; timestamp: string }>>()
      .notNull(),

    // Context at time of interaction
    cefrLevel: varchar('cefr_level', { length: 5 }),
    topic: varchar('topic', { length: 255 }),
    descriptorIds: jsonb('descriptor_ids').$type<string[]>().default([]),

    // Session timing
    startedAt: timestamp('started_at').notNull().defaultNow(),
    endedAt: timestamp('ended_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('idx_tutor_interactions_student').on(table.studentId),
    index('idx_tutor_interactions_session').on(table.sessionId),
    index('idx_tutor_interactions_type').on(table.interactionType),
    index('idx_tutor_interactions_date').on(table.startedAt),
  ]
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type TenantCefrConfig = typeof tenantCefrConfig.$inferSelect;
export type NewTenantCefrConfig = typeof tenantCefrConfig.$inferInsert;

export type TenantDescriptorSelection = typeof tenantDescriptorSelection.$inferSelect;
export type NewTenantDescriptorSelection = typeof tenantDescriptorSelection.$inferInsert;

export type StudentNote = typeof studentNotes.$inferSelect;
export type NewStudentNote = typeof studentNotes.$inferInsert;

export type CompetencyAssessment = typeof competencyAssessments.$inferSelect;
export type NewCompetencyAssessment = typeof competencyAssessments.$inferInsert;

export type CompetencyProgress = typeof competencyProgress.$inferSelect;
export type NewCompetencyProgress = typeof competencyProgress.$inferInsert;

export type DiagnosticSession = typeof diagnosticSessions.$inferSelect;
export type NewDiagnosticSession = typeof diagnosticSessions.$inferInsert;

export type LevelPromotion = typeof levelPromotions.$inferSelect;
export type NewLevelPromotion = typeof levelPromotions.$inferInsert;

export type ContactVerification = typeof contactVerifications.$inferSelect;
export type NewContactVerification = typeof contactVerifications.$inferInsert;

export type ExerciseAttempt = typeof exerciseAttempts.$inferSelect;
export type NewExerciseAttempt = typeof exerciseAttempts.$inferInsert;

export type VocabList = typeof vocabLists.$inferSelect;
export type NewVocabList = typeof vocabLists.$inferInsert;

export type TutorInteraction = typeof tutorInteractions.$inferSelect;
export type NewTutorInteraction = typeof tutorInteractions.$inferInsert;
