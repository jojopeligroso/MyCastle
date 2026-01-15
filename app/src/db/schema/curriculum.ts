/**
 * Curriculum Schema - CEFR Descriptors, Lesson Plans, Materials
 * Ref: DESIGN.md §6, spec/05-teacher-mcp.md
 */

import { pgTable, uuid, varchar, timestamp, text, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants, users } from './core';
import { classes } from './academic';

/**
 * CEFR Descriptors Table
 * Stores Common European Framework of Reference descriptors (A1-C2)
 */
export const cefrDescriptors = pgTable(
  'cefr_descriptors',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    level: varchar('level', { length: 2 }).notNull(), // A1, A2, B1, B2, C1, C2
    category: varchar('category', { length: 100 }).notNull(), // e.g., "Reading", "Speaking"
    subcategory: varchar('subcategory', { length: 100 }), // e.g., "Overall reading comprehension"

    descriptor_text: text('descriptor_text').notNull(), // The actual CEFR descriptor

    metadata: jsonb('metadata').default({}), // Additional context, examples

    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [index('idx_cefr_level').on(table.level), index('idx_cefr_category').on(table.category)]
);

/**
 * Lesson Plans Table
 * AI-generated and teacher-created lesson plans
 */
export const lessonPlans = pgTable(
  'lesson_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),

    // Association
    class_id: uuid('class_id').references(() => classes.id),
    teacher_id: uuid('teacher_id').references(() => users.id),

    // CEFR alignment
    cefr_level: varchar('cefr_level', { length: 2 }).notNull(), // A1, A2, B1, B2, C1, C2
    descriptor_id: uuid('descriptor_id').references(() => cefrDescriptors.id),

    // Content
    title: varchar('title', { length: 255 }).notNull(),
    topic: varchar('topic', { length: 255 }),
    duration_minutes: varchar('duration_minutes', { length: 50 }), // e.g., "60"

    // Structured plan (JSON)
    json_plan: jsonb('json_plan').notNull(), // {objectives, activities, materials, timings, assessment}

    // Generation metadata
    is_ai_generated: varchar('is_ai_generated', { length: 10 }).default('false'),
    generation_prompt: text('generation_prompt'), // For audit/reproducibility
    cache_key: varchar('cache_key', { length: 64 }), // SHA256 for deduplication

    // Status
    status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, published, archived

    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_plans_tenant').on(table.tenant_id),
    index('idx_plans_class').on(table.class_id),
    index('idx_plans_teacher').on(table.teacher_id),
    index('idx_plans_cefr').on(table.cefr_level),
    index('idx_plans_cache_key').on(table.cache_key),
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
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),

    // Content
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(), // document, video, audio, link, image

    // Storage
    file_url: varchar('file_url', { length: 500 }), // Supabase Storage path or external URL
    file_size: varchar('file_size', { length: 50 }), // Bytes
    mime_type: varchar('mime_type', { length: 100 }),

    // Categorization
    cefr_level: varchar('cefr_level', { length: 2 }), // A1, A2, B1, B2, C1, C2 (optional)
    tags: jsonb('tags'), // Array of strings for searchability
    subject: varchar('subject', { length: 100 }),

    // Access
    visibility: varchar('visibility', { length: 50 }).notNull().default('private'), // private, tenant, public
    uploaded_by: uuid('uploaded_by').references(() => users.id),

    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_materials_tenant').on(table.tenant_id),
    index('idx_materials_cefr').on(table.cefr_level),
    index('idx_materials_type').on(table.type),
  ]
);

/**
 * Lesson Plan Materials (Join Table)
 * Many-to-many relationship between lesson plans and materials
 */
export const lessonPlanMaterials = pgTable('lesson_plan_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  lesson_plan_id: uuid('lesson_plan_id')
    .notNull()
    .references(() => lessonPlans.id),
  material_id: uuid('material_id')
    .notNull()
    .references(() => materials.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
