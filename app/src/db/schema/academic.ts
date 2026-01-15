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
  boolean,
} from 'drizzle-orm/pg-core';
import { tenants, users } from './core';
import { courses } from './programmes';

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
  ]
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

    // Flexible duration fields (Migration 0008)
    expected_end_date: date('expected_end_date'), // Booked end date (can differ from class end_date)
    booked_weeks: integer('booked_weeks'), // Number of weeks booked (can differ from course standard)
    original_course_id: uuid('original_course_id'), // Reference to course for standard duration

    status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, dropped

    // Amendment tracking (Migration 0008)
    extensions_count: integer('extensions_count').default(0), // Number of extensions
    is_amended: boolean('is_amended').default(false), // Whether enrollment has been modified

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
  ]
);

/**
 * Enrollment Amendments Table
 * Tracks changes to enrollments (extensions, reductions, transfers)
 * Ref: Migration 0008 - Flexible enrollment durations
 */
export const enrollmentAmendments = pgTable(
  'enrollment_amendments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    enrollment_id: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),

    // Amendment details
    amendment_type: varchar('amendment_type', { length: 50 }).notNull(), // extension, reduction, transfer, level_change, cancellation
    amendment_date: date('amendment_date').notNull().defaultNow(),

    // Previous values (for audit trail)
    previous_end_date: date('previous_end_date'),
    previous_weeks: integer('previous_weeks'),
    previous_class_id: uuid('previous_class_id').references(() => classes.id),

    // New values
    new_end_date: date('new_end_date'),
    new_weeks: integer('new_weeks'),
    new_class_id: uuid('new_class_id').references(() => classes.id),

    // Financial impact
    fee_adjustment: decimal('fee_adjustment', { precision: 10, scale: 2 }), // Positive for fees, negative for refunds

    // Reason and approval
    reason: text('reason'),
    requested_by: uuid('requested_by').references(() => users.id),
    approved_by: uuid('approved_by').references(() => users.id),
    status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, approved, rejected

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),

    // Timestamps
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_enrollment_amendments_enrollment').on(table.enrollment_id),
    index('idx_enrollment_amendments_tenant').on(table.tenant_id),
    index('idx_enrollment_amendments_status').on(table.status),
    index('idx_enrollment_amendments_type').on(table.amendment_type),
    index('idx_enrollment_amendments_date').on(table.amendment_date),
  ]
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
  table => [index('idx_sessions_class_date').on(table.class_id, table.session_date)]
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
  ]
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
