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
import { classes, classSessions, enrollments, assignments } from './academic';
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
// COURSEBOOKS (FRESH_0028)
// ============================================================================

/**
 * Coursebooks Table
 * Teacher-facing coursebook definitions with CEFR alignment
 * Ref: STUDENT_PROFILE_DISCOVERY.md §1.2
 */
export const coursebooks = pgTable(
  'coursebooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Book identification
    name: text('name').notNull(), // From worksheet name, e.g., "Speakout Intermediate 2nd Edition"
    publisher: text('publisher'),
    edition: text('edition'),

    // CEFR range (derived from content)
    cefrLevelMin: varchar('cefr_level_min', { length: 3 }), // Minimum level in book
    cefrLevelMax: varchar('cefr_level_max', { length: 3 }), // Maximum level in book

    // Status
    isActive: boolean('is_active').default(true),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('uk_coursebooks_tenant_name').on(table.tenantId, table.name),
    index('idx_coursebooks_tenant').on(table.tenantId),
    index('idx_coursebooks_active').on(table.tenantId, table.isActive),
  ]
);

/**
 * Coursebook Descriptors Table
 * Practical descriptors from coursebook content (File B structure)
 * Ref: STUDENT_PROFILE_DISCOVERY.md §1.2
 */
export const coursebookDescriptors = pgTable(
  'coursebook_descriptors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    coursebookId: uuid('coursebook_id')
      .notNull()
      .references(() => coursebooks.id, { onDelete: 'cascade' }),

    // Location in book
    skillFocus: text('skill_focus').notNull(), // Reading, Writing, Listening, Speaking
    unit: text('unit'), // Unit number or name
    page: text('page'), // Page number(s), e.g., "12 13"
    lesson: text('lesson'), // Lesson name

    // CEFR alignment
    level: varchar('level', { length: 3 }).notNull(), // CEFR level: A1, A2, B1, etc.

    // Descriptor content
    descriptorText: text('descriptor_text').notNull(), // The practical descriptor

    // Link to official CEFR (optional, LLM-assisted)
    linkedCefrDescriptorId: uuid('linked_cefr_descriptor_id').references(() => cefrDescriptors.id),
    linkConfidence: decimal('link_confidence', { precision: 3, scale: 2 }), // 0.00-1.00 confidence

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('idx_coursebook_desc_coursebook').on(table.coursebookId),
    index('idx_coursebook_desc_unit').on(table.coursebookId, table.unit),
    index('idx_coursebook_desc_level').on(table.level),
    index('idx_coursebook_desc_skill').on(table.skillFocus),
  ]
);

// ============================================================================
// SESSION LEARNING OBJECTIVES (FRESH_0028)
// ============================================================================

/**
 * Session Learning Objectives Table
 * Links class sessions to CEFR/coursebook descriptors for learning tracking
 * Ref: STUDENT_PROFILE_DISCOVERY.md §2.2
 */
export const sessionLearningObjectives = pgTable(
  'session_learning_objectives',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => classSessions.id, { onDelete: 'cascade' }),

    // Descriptor reference (at least one should be set)
    descriptorId: uuid('descriptor_id').references(() => cefrDescriptors.id),
    coursebookDescriptorId: uuid('coursebook_descriptor_id').references(
      () => coursebookDescriptors.id
    ),

    // Objective classification
    objectiveType: varchar('objective_type', { length: 20 }).notNull(), // 'primary' or 'secondary'
    source: varchar('source', { length: 20 }).notNull(), // 'cefr', 'coursebook', or 'custom'

    // Custom descriptor (when source = 'custom')
    customDescriptorText: text('custom_descriptor_text'),

    // Sort order within session
    sortOrder: integer('sort_order').default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('uk_session_objectives_session_descriptor').on(table.sessionId, table.descriptorId),
    index('idx_session_objectives_session').on(table.sessionId),
    index('idx_session_objectives_descriptor').on(table.descriptorId),
    index('idx_session_objectives_type').on(table.objectiveType),
  ]
);

// ============================================================================
// SUMMATIVE ASSESSMENTS (FRESH_0028)
// ============================================================================

/**
 * Summative Assessment Types Table
 * School-defined formal test types
 * Ref: STUDENT_PROFILE_DISCOVERY.md §2.3
 */
export const summativeAssessmentTypes = pgTable(
  'summative_assessment_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Type definition
    name: text('name').notNull(), // e.g., "End of Unit Test", "Mid-Term Exam"
    description: text('description'),

    // Configuration
    isActive: boolean('is_active').default(true),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('uk_summative_types_tenant_name').on(table.tenantId, table.name),
    index('idx_summative_types_tenant').on(table.tenantId),
    index('idx_summative_types_active').on(table.tenantId, table.isActive),
  ]
);

/**
 * Summative Assessments Table
 * Formal test scores (percentage-based)
 * Ref: STUDENT_PROFILE_DISCOVERY.md §2.3
 */
export const summativeAssessments = pgTable(
  'summative_assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Assessment type
    assessmentTypeId: uuid('assessment_type_id').references(() => summativeAssessmentTypes.id),

    // Assessor
    assessorId: uuid('assessor_id')
      .notNull()
      .references(() => users.id),

    // Score (percentage)
    scorePercentage: decimal('score_percentage', { precision: 5, scale: 2 }).notNull(),

    // Notes
    notes: text('notes'),

    // Context
    classId: uuid('class_id').references(() => classes.id),

    // Date
    assessmentDate: date('assessment_date').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('idx_summative_tenant').on(table.tenantId),
    index('idx_summative_student').on(table.studentId),
    index('idx_summative_type').on(table.assessmentTypeId),
    index('idx_summative_date').on(table.assessmentDate),
    index('idx_summative_class').on(table.classId),
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
 * Enhanced with progress tracking (FRESH_0028)
 * Ref: STUDENT_PROFILE_DISCOVERY.md §2.2
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
    sessionId: uuid('session_id').references(() => classSessions.id), // FRESH_0028
    enrollmentId: uuid('enrollment_id').references(() => enrollments.id),
    assignmentId: uuid('assignment_id').references(() => assignments.id),
    learningObjectiveId: uuid('learning_objective_id'), // FK to session_learning_objectives (FRESH_0028)

    // Assessment details
    assessmentType: varchar('assessment_type', { length: 50 }).notNull(),
    assessmentDate: date('assessment_date').notNull().defaultNow(),

    // Score (1-4 scale) - legacy, use progress instead
    score: integer('score').notNull(),

    // Progress tracking (FRESH_0028)
    progress: varchar('progress', { length: 20 }).default('not_yet'), // not_yet, emerging, developing, achieved
    demonstratedLevel: varchar('demonstrated_level', { length: 3 }), // May differ from descriptor level
    isComplete: boolean('is_complete').default(false), // True when achieved

    // Optional notes
    notes: text('notes'),

    // Visibility (FRESH_0028)
    isSharedWithStudent: boolean('is_shared_with_student').default(false),

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
    index('idx_competency_assessments_session').on(table.sessionId),
    index('idx_competency_assessments_date').on(table.assessmentDate),
    index('idx_competency_assessments_type').on(table.assessmentType),
    index('idx_competency_assessments_tenant').on(table.tenantId),
    index('idx_competency_assessments_objective').on(table.learningObjectiveId),
    index('idx_competency_assessments_shared').on(table.isSharedWithStudent),
    index('idx_competency_assessments_complete').on(table.isComplete),
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
// STUDENT EXPECTATIONS
// ============================================================================

/**
 * Student Expectations
 * Tracks student learning goals, commitments, and self-assessments at course start
 * Ref: StudentTracker integration (2026-03-09)
 */
export const studentExpectations = pgTable(
  'student_expectations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Learning Goals
    primaryGoal: text('primary_goal'), // Main learning objective
    secondaryGoals: jsonb('secondary_goals').$type<string[]>(), // Additional goals
    targetCefrLevel: varchar('target_cefr_level', { length: 10 }), // A1, A2, B1, B2, C1, C2
    targetDate: timestamp('target_date'), // When they want to achieve this

    // Study Commitment
    weeklyStudyHours: integer('weekly_study_hours'), // Hours per week committed
    selfStudyHours: integer('self_study_hours'), // Hours outside class
    preferredLearningStyle: varchar('preferred_learning_style', { length: 50 }), // visual, auditory, reading, kinesthetic

    // Motivation & Context
    studyReason: text('study_reason'), // Why they're learning English
    specificNeeds: text('specific_needs'), // Specific situations (work, travel, exams)
    prioritySkills: jsonb('priority_skills').$type<string[]>(), // speaking, listening, reading, writing, grammar, vocabulary

    // Self-Assessment
    currentStrengths: jsonb('current_strengths').$type<string[]>(),
    areasForImprovement: jsonb('areas_for_improvement').$type<string[]>(),
    anticipatedChallenges: text('anticipated_challenges'),

    // Expectations from School
    classroomExpectations: text('classroom_expectations'), // What they expect from classes
    teacherSupport: text('teacher_support'), // Type of support they need
    feedbackPreference: varchar('feedback_preference', { length: 50 }), // frequent, weekly, end-of-unit

    // Commitment & Accountability
    attendanceCommitment: integer('attendance_commitment'), // 1-5 scale
    homeworkCommitment: integer('homework_commitment'), // 1-5 scale
    participationCommitment: integer('participation_commitment'), // 1-5 scale

    // Admin fields
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at'),
    reviewNotes: text('review_notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_student_expectations_student').on(table.studentId),
    index('idx_student_expectations_tenant').on(table.tenantId),
  ]
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type TenantCefrConfig = typeof tenantCefrConfig.$inferSelect;
export type NewTenantCefrConfig = typeof tenantCefrConfig.$inferInsert;

export type TenantDescriptorSelection = typeof tenantDescriptorSelection.$inferSelect;
export type NewTenantDescriptorSelection = typeof tenantDescriptorSelection.$inferInsert;

// Coursebooks (FRESH_0028)
export type Coursebook = typeof coursebooks.$inferSelect;
export type NewCoursebook = typeof coursebooks.$inferInsert;

export type CoursebookDescriptor = typeof coursebookDescriptors.$inferSelect;
export type NewCoursebookDescriptor = typeof coursebookDescriptors.$inferInsert;

// Session Learning Objectives (FRESH_0028)
export type SessionLearningObjective = typeof sessionLearningObjectives.$inferSelect;
export type NewSessionLearningObjective = typeof sessionLearningObjectives.$inferInsert;

// Summative Assessments (FRESH_0028)
export type SummativeAssessmentType = typeof summativeAssessmentTypes.$inferSelect;
export type NewSummativeAssessmentType = typeof summativeAssessmentTypes.$inferInsert;

export type SummativeAssessment = typeof summativeAssessments.$inferSelect;
export type NewSummativeAssessment = typeof summativeAssessments.$inferInsert;

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

export type StudentExpectation = typeof studentExpectations.$inferSelect;
export type NewStudentExpectation = typeof studentExpectations.$inferInsert;
