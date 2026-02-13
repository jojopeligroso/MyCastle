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
    tenantId: uuid('tenant_id')
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
    durationWeeks: integer('duration_weeks').notNull().default(12),
    hoursPerWeek: integer('hours_per_week').notNull().default(15),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, archived

    // Metadata (flexible storage for programme-specific data)
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'), // Soft delete
  },
  table => [
    uniqueIndex('uk_programmes_tenant_code').on(table.tenantId, table.code),
    index('idx_programmes_tenant').on(table.tenantId),
    index('idx_programmes_status').on(table.status),
    index('idx_programmes_deleted').on(table.deletedAt),
  ]
);

/**
 * Programme Courses Table
 * Individual courses within programmes (e.g., "General English - B1")
 * NOTE: Renamed from "courses" to "programme_courses" to avoid conflict with booking catalog courses
 */
export const programmeCourses = pgTable(
  'programme_courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    programmeId: uuid('programme_id')
      .notNull()
      .references(() => programmes.id, { onDelete: 'cascade' }),

    // Course Info
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    description: text('description'),

    // CEFR Mapping (single level per course)
    cefrLevel: varchar('cefr_level', { length: 2 }).notNull(), // A1, A2, B1, B2, C1, C2

    // Syllabus
    syllabusUrl: varchar('syllabus_url', { length: 500 }),
    syllabusVersion: varchar('syllabus_version', { length: 20 }),

    // Schedule
    hoursPerWeek: integer('hours_per_week').notNull().default(15),
    durationWeeks: integer('duration_weeks').notNull().default(12),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, archived

    // Metadata (flexible storage for course-specific data)
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'), // Soft delete
  },
  table => [
    uniqueIndex('uk_programme_courses_tenant_code').on(table.tenantId, table.code),
    index('idx_programme_courses_tenant').on(table.tenantId),
    index('idx_programme_courses_programme').on(table.programmeId),
    index('idx_programme_courses_cefr').on(table.cefrLevel),
    index('idx_programme_courses_status').on(table.status),
    index('idx_programme_courses_deleted').on(table.deletedAt),
  ]
);

/**
 * Type exports for use in application code
 */
export type Programme = typeof programmes.$inferSelect;
export type NewProgramme = typeof programmes.$inferInsert;
export type ProgrammeCourse = typeof programmeCourses.$inferSelect;
export type NewProgrammeCourse = typeof programmeCourses.$inferInsert;
