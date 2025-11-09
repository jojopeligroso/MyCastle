/**
 * Academic Schema - Classes, Enrollments, Sessions, Assignments
 * Ref: spec/08-database.md §8.3.3 to §8.3.9
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  integer,
  date,
  time,
  decimal,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants, users } from './core';

/**
 * Classes Table
 * Course/class definitions
 */
export const classes = pgTable(
  'classes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),

    // Class info
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }), // e.g., "MATH-101"
    description: text('description'),
    level: varchar('level', { length: 50 }), // Beginner, Intermediate, Advanced
    subject: varchar('subject', { length: 100 }),

    // Capacity
    capacity: integer('capacity').notNull().default(20),
    enrolled_count: integer('enrolled_count').notNull().default(0),

    // Teacher assignment
    teacher_id: uuid('teacher_id').references(() => users.id),

    // Schedule
    schedule_description: varchar('schedule_description', { length: 500 }), // "Mon/Wed 10:00-11:00"
    start_date: date('start_date').notNull(),
    end_date: date('end_date'),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, cancelled

    // Timestamps
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'),
  },
  table => [
    index('idx_classes_tenant').on(table.tenant_id),
    index('idx_classes_teacher').on(table.teacher_id),
    index('idx_classes_status').on(table.status),
    index('idx_classes_dates').on(table.start_date, table.end_date),
    // T-044: Compound index idx_classes_teacher_status added via migration 003
    // Optimizes: WHERE teacher_id = X AND status = 'active'
  ],
);

/**
 * Enrollments Table
 * Student-class relationships (many-to-many)
 */
export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),

    student_id: uuid('student_id')
      .notNull()
      .references(() => users.id),
    class_id: uuid('class_id')
      .notNull()
      .references(() => classes.id),

    enrollment_date: date('enrollment_date').notNull().defaultNow(),
    completion_date: date('completion_date'),

    status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, dropped

    // Performance tracking
    attendance_rate: decimal('attendance_rate', { precision: 5, scale: 2 }), // 0.00 to 100.00
    current_grade: varchar('current_grade', { length: 10 }), // A+, B, etc.

    // Timestamps
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    // Unique active enrollment per student per class
    uniqueIndex('idx_enrollments_student_class').on(table.student_id, table.class_id),
  ],
);

/**
 * Class Sessions Table
 * Individual class meetings/lessons
 */
export const classSessions = pgTable(
  'class_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    class_id: uuid('class_id')
      .notNull()
      .references(() => classes.id),

    session_date: date('session_date').notNull(),
    start_time: time('start_time').notNull(),
    end_time: time('end_time').notNull(),

    topic: varchar('topic', { length: 500 }),
    notes: text('notes'),

    status: varchar('status', { length: 50 }).notNull().default('scheduled'), // scheduled, completed, cancelled

    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    // T-044: Compound index for optimal teacher timetable queries
    // Supports: WHERE class_id IN (...) AND session_date BETWEEN start AND end
    index('idx_sessions_class_date').on(table.class_id, table.session_date),
    // Note: idx_class_sessions_teacher_date added via migration 003
  ],
);

/**
 * Attendance Table
 * Attendance records for class sessions
 * T-052: Includes hash-chain for tamper detection
 */
export const attendance = pgTable(
  'attendance',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),

    class_session_id: uuid('class_session_id')
      .notNull()
      .references(() => classSessions.id),
    student_id: uuid('student_id')
      .notNull()
      .references(() => users.id),

    status: varchar('status', { length: 50 }).notNull(), // present, absent, late, excused
    notes: text('notes'),

    recorded_by: uuid('recorded_by').references(() => users.id), // Teacher/admin who recorded
    recorded_at: timestamp('recorded_at').defaultNow().notNull(),

    // Hash-chain fields (T-052)
    hash: varchar('hash', { length: 64 }), // SHA256(payload || previous_hash)
    previous_hash: varchar('previous_hash', { length: 64 }), // Hash of previous record

    // Edit tracking (T-053)
    edited_at: timestamp('edited_at'),
    edited_by: uuid('edited_by').references(() => users.id),
    edit_count: integer('edit_count').default(0),
    is_within_edit_window: varchar('is_within_edit_window', { length: 10 }).default('true'),

    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('idx_attendance_session_student').on(table.class_session_id, table.student_id),
    index('idx_attendance_hash').on(table.hash),
    index('idx_attendance_session_created').on(table.class_session_id, table.created_at),
  ],
);

/**
 * Assignments Table
 * Homework, quizzes, projects
 */
export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  class_id: uuid('class_id')
    .notNull()
    .references(() => classes.id),

  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // homework, quiz, exam, project

  assigned_date: date('assigned_date').notNull(),
  due_date: date('due_date').notNull(),

  max_score: integer('max_score'), // e.g., 100 points

  content: jsonb('content'), // Assignment content (questions, etc.)
  attachments: jsonb('attachments'), // File URLs

  status: varchar('status', { length: 50 }).notNull().default('active'), // active, closed

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Submissions Table
 * Student work submissions
 */
export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),

  assignment_id: uuid('assignment_id')
    .notNull()
    .references(() => assignments.id),
  student_id: uuid('student_id')
    .notNull()
    .references(() => users.id),

  submitted_at: timestamp('submitted_at').defaultNow().notNull(),
  content: jsonb('content'), // Answers, text responses
  attachments: jsonb('attachments'), // File URLs

  status: varchar('status', { length: 50 }).notNull().default('submitted'), // submitted, graded

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Grades Table
 * Grades for submitted assignments
 */
export const grades = pgTable('grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),

  submission_id: uuid('submission_id')
    .notNull()
    .references(() => submissions.id)
    .unique(),

  score: decimal('score', { precision: 10, scale: 2 }),
  grade: varchar('grade', { length: 10 }), // A+, B, etc.
  feedback: text('feedback'),

  graded_by: uuid('graded_by').references(() => users.id),
  graded_at: timestamp('graded_at').defaultNow().notNull(),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
