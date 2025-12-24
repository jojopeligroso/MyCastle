/**
 * Programmes and Courses Schema
 * Academic programmes and individual courses
 * Ref: DATABASE_SCHEMA_GAPS.md §1, §2
 * Migration: 0004_add_programmes_table.sql, 0005_add_courses_table.sql
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
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './core';

/**
 * Programmes Table
 * Academic programmes offered by the school (e.g., General English, Business English)
 */
export const programmes = pgTable(
  'programmes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Programme Info
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    description: text('description'),

    // CEFR Levels (array of strings stored as JSONB: ["A1", "A2", "B1", ...])
    levels: jsonb('levels')
      .notNull()
      .$type<string[]>()
      .default(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),

    // Duration
    duration_weeks: integer('duration_weeks').notNull().default(12),
    hours_per_week: integer('hours_per_week').notNull().default(15),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, archived

    // Metadata (flexible storage for programme-specific data)
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),

    // Timestamps
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'), // Soft delete
  },
  table => [
    uniqueIndex('uk_programmes_tenant_code').on(table.tenant_id, table.code),
    index('idx_programmes_tenant').on(table.tenant_id),
    index('idx_programmes_status').on(table.status),
    index('idx_programmes_deleted').on(table.deleted_at),
  ],
);

/**
 * Courses Table
 * Individual courses within programmes (e.g., "General English - B1")
 */
export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    programme_id: uuid('programme_id')
      .notNull()
      .references(() => programmes.id, { onDelete: 'cascade' }),

    // Course Info
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    description: text('description'),

    // CEFR Mapping (single level per course)
    cefr_level: varchar('cefr_level', { length: 2 }).notNull(), // A1, A2, B1, B2, C1, C2

    // Syllabus
    syllabus_url: varchar('syllabus_url', { length: 500 }),
    syllabus_version: varchar('syllabus_version', { length: 20 }),

    // Schedule
    hours_per_week: integer('hours_per_week').notNull().default(15),
    duration_weeks: integer('duration_weeks').notNull().default(12),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, archived

    // Metadata (flexible storage for course-specific data)
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),

    // Timestamps
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'), // Soft delete
  },
  table => [
    uniqueIndex('uk_courses_tenant_code').on(table.tenant_id, table.code),
    index('idx_courses_tenant').on(table.tenant_id),
    index('idx_courses_programme').on(table.programme_id),
    index('idx_courses_cefr').on(table.cefr_level),
    index('idx_courses_status').on(table.status),
    index('idx_courses_deleted').on(table.deleted_at),
  ],
);

/**
 * Type exports for use in application code
 */
export type Programme = typeof programmes.$inferSelect;
export type NewProgramme = typeof programmes.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
