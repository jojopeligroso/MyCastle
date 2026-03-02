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
 * Extended for tenant customization in Student Profile feature
 */
export const cefrDescriptors = pgTable(
  'cefr_descriptors',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    level: varchar('level', { length: 5 }).notNull(), // A0, A1, A2, B1, B1+, B2, B2+, C1, C2
    category: varchar('category', { length: 100 }).notNull(), // e.g., "Reading", "Speaking"
    subcategory: varchar('subcategory', { length: 100 }), // e.g., "Overall reading comprehension"

    descriptorText: text('descriptor_text').notNull(), // The actual CEFR descriptor

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

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_plans_tenant').on(table.tenantId),
    index('idx_plans_class').on(table.classId),
    index('idx_plans_teacher').on(table.teacherId),
    index('idx_plans_cefr').on(table.cefrLevel),
    index('idx_plans_cache_key').on(table.cacheKey),
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

// Type exports
export type CefrDescriptor = typeof cefrDescriptors.$inferSelect;
export type NewCefrDescriptor = typeof cefrDescriptors.$inferInsert;

export type LessonPlan = typeof lessonPlans.$inferSelect;
export type NewLessonPlan = typeof lessonPlans.$inferInsert;

export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;

export type LessonPlanMaterial = typeof lessonPlanMaterials.$inferSelect;
export type NewLessonPlanMaterial = typeof lessonPlanMaterials.$inferInsert;
