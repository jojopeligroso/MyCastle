/**
 * Curriculum Schema - CEFR Descriptors, Lesson Plans, Materials
 * UPDATED: 2026-03-01 - Converted to camelCase TS properties (DB columns remain snake_case)
 * Ref: DESIGN.md §6, spec/05-teacher-mcp.md
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  jsonb,
  index,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { tenants, users } from './core';
import { classes } from './academic';

/**
 * CEFR Descriptors Table
 * Stores Common European Framework of Reference descriptors (A1-C2)
 * Extended with full File A structure from CEFR 2001/2020 Companion Volume
 * Ref: STUDENT_PROFILE_DISCOVERY.md §1.1
 */
export const cefrDescriptors = pgTable(
  'cefr_descriptors',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Core descriptor fields
    level: varchar('level', { length: 5 }).notNull(), // A0, A1, A2, A2+, B1, B1+, B2, B2+, C1, C2
    category: varchar('category', { length: 100 }).notNull(), // e.g., "Reading", "Speaking" (legacy)
    subcategory: varchar('subcategory', { length: 100 }), // e.g., "Overall reading comprehension" (legacy)
    descriptorText: text('descriptor_text').notNull(), // The actual CEFR descriptor

    // File A structure columns (FRESH_0028)
    sourceIndex: integer('source_index'), // Original index from File A spreadsheet
    activityStrategyCompetence: text('activity_strategy_competence'), // "Communicative Activities", "Communication Strategies", etc.
    competencies: text('competencies'), // Sub-category field
    strategies: text('strategies'), // Activity type: "Interaction", "Mediation", etc.
    mode: text('mode'), // Communication mode: "Spoken", "Written", "Mediating a text", etc.
    skillFocus: text('skill_focus'), // Traditional skill: "Speaking", "Reading", "Listening", "Writing", "Mediation"
    isOverall: boolean('is_overall').default(false), // Overall descriptor flag
    scale: text('scale'), // Key grouping field: "FORMAL DISCUSSION", "COOPERATING", etc.

    // Young Learner variants
    youngLearners7To10: text('young_learners_7_10'), // YL descriptor for ages 7-10, or NULL
    youngLearners11To15: text('young_learners_11_15'), // YL descriptor for ages 11-15, or NULL

    // Additional metadata
    metadata: jsonb('metadata').default({}), // Additional context, examples

    // Tenant customization (Student Profile feature)
    tenantId: uuid('tenant_id').references(() => tenants.id), // NULL = global/official
    isCustom: boolean('is_custom').default(false),
    isActive: boolean('is_active').default(true),
    sourceDescriptorId: uuid('source_descriptor_id'), // For tenant copies of official descriptors
    sortOrder: integer('sort_order').default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_cefr_level').on(table.level),
    index('idx_cefr_category').on(table.category),
    index('idx_cefr_descriptors_tenant').on(table.tenantId),
    index('idx_cefr_descriptors_scale_level').on(table.scale, table.level),
    index('idx_cefr_descriptors_skill_focus').on(table.skillFocus),
    index('idx_cefr_descriptors_source_index').on(table.sourceIndex),
  ]
);

/**
 * Lesson Plans Table
 * AI-generated and teacher-created lesson plans
 */
export const lessonPlans = pgTable(
  'lesson_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),

    // Association
    classId: uuid('class_id').references(() => classes.id),
    teacherId: uuid('teacher_id').references(() => users.id),

    // CEFR alignment
    cefrLevel: varchar('cefr_level', { length: 5 }).notNull(), // A0-C2, including plus levels
    descriptorId: uuid('descriptor_id').references(() => cefrDescriptors.id),

    // Content
    title: varchar('title', { length: 255 }).notNull(),
    topic: varchar('topic', { length: 255 }),
    durationMinutes: varchar('duration_minutes', { length: 50 }), // e.g., "60"

    // Structured plan (JSON)
    jsonPlan: jsonb('json_plan').notNull(), // {objectives, activities, materials, timings, assessment}

    // Generation metadata
    isAiGenerated: varchar('is_ai_generated', { length: 10 }).default('false'),
    generationPrompt: text('generation_prompt'), // For audit/reproducibility
    cacheKey: varchar('cache_key', { length: 64 }), // SHA256 for deduplication

    // Status
    status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, published, archived

    // DoS Approval Workflow
    approvalStatus: varchar('approval_status', { length: 20 }).default('draft'), // draft, pending_approval, approved, rejected
    submittedForApprovalAt: timestamp('submitted_for_approval_at'),
    approvedBy: uuid('approved_by').references(() => users.id),
    approvedAt: timestamp('approved_at'),
    approvalComments: text('approval_comments'),

    // Speakout context (for RAG)
    speakoutBook: varchar('speakout_book', { length: 255 }),
    speakoutUnit: varchar('speakout_unit', { length: 50 }),
    speakoutLesson: varchar('speakout_lesson', { length: 255 }),
    teacherIntent: varchar('teacher_intent', { length: 20 }), // follow, deviate, supplement

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_plans_tenant').on(table.tenantId),
    index('idx_plans_class').on(table.classId),
    index('idx_plans_teacher').on(table.teacherId),
    index('idx_plans_cefr').on(table.cefrLevel),
    index('idx_plans_cache_key').on(table.cacheKey),
    index('idx_plans_approval_status').on(table.approvalStatus),
  ]
);

/**
 * Materials Table
 * Teaching materials and resources
 */
export const materials = pgTable(
  'materials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),

    // Content
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(), // document, video, audio, link, image

    // Storage
    fileUrl: varchar('file_url', { length: 500 }), // Supabase Storage path or external URL
    fileSize: varchar('file_size', { length: 50 }), // Bytes
    mimeType: varchar('mime_type', { length: 100 }),

    // Categorization
    cefrLevel: varchar('cefr_level', { length: 5 }), // A0-C2 (optional)
    tags: jsonb('tags'), // Array of strings for searchability
    subject: varchar('subject', { length: 100 }),

    // Access
    visibility: varchar('visibility', { length: 50 }).notNull().default('private'), // private, tenant, public
    uploadedBy: uuid('uploaded_by').references(() => users.id),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_materials_tenant').on(table.tenantId),
    index('idx_materials_cefr').on(table.cefrLevel),
    index('idx_materials_type').on(table.type),
  ]
);

/**
 * Lesson Plan Materials (Join Table)
 * Many-to-many relationship between lesson plans and materials
 */
export const lessonPlanMaterials = pgTable('lesson_plan_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonPlanId: uuid('lesson_plan_id')
    .notNull()
    .references(() => lessonPlans.id),
  materialId: uuid('material_id')
    .notNull()
    .references(() => materials.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Textbook Descriptors Table (File B)
 * Maps CEFR descriptors to specific textbook lessons (e.g., Speakout series)
 * Ref: CEFR descriptions in Speakout Second Edition books.xlsx
 */
export const textbookDescriptors = pgTable(
  'textbook_descriptors',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Textbook location
    book: varchar('book', { length: 255 }).notNull(), // e.g., "Speakout Pre-intermediate 2nd edition"
    unit: varchar('unit', { length: 50 }).notNull(), // e.g., "Unit 1"
    page: integer('page'), // Page number
    lesson: varchar('lesson', { length: 255 }), // e.g., "Feeling good"

    // CEFR mapping
    level: varchar('level', { length: 5 }).notNull(), // A2+, B1, B1+, B2, C1, etc.
    skillFocus: varchar('skill_focus', { length: 50 }).notNull(), // Speaking, Listening, Reading, Writing

    // The descriptor text
    descriptorText: text('descriptor_text').notNull(),

    // Optional link to official CEFR descriptor
    cefrDescriptorId: uuid('cefr_descriptor_id').references(() => cefrDescriptors.id),

    // Tenant scope (NULL = global/shared)
    tenantId: uuid('tenant_id').references(() => tenants.id),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_textbook_book').on(table.book),
    index('idx_textbook_level').on(table.level),
    index('idx_textbook_skill').on(table.skillFocus),
    index('idx_textbook_unit').on(table.unit),
    index('idx_textbook_tenant').on(table.tenantId),
  ]
);

// Type exports
export type CefrDescriptor = typeof cefrDescriptors.$inferSelect;
export type NewCefrDescriptor = typeof cefrDescriptors.$inferInsert;

export type TextbookDescriptor = typeof textbookDescriptors.$inferSelect;
export type NewTextbookDescriptor = typeof textbookDescriptors.$inferInsert;

export type LessonPlan = typeof lessonPlans.$inferSelect;
export type NewLessonPlan = typeof lessonPlans.$inferInsert;

export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;

export type LessonPlanMaterial = typeof lessonPlanMaterials.$inferSelect;
export type NewLessonPlanMaterial = typeof lessonPlanMaterials.$inferInsert;
