/**
 * Academic Schema - Classes, Enrollments, Sessions, Assignments
 * UPDATED: 2026-01-16 - Converted to camelCase TS properties (DB columns remain snake_case)
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
    tenantId: uuid('tenant_id')
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
    enrolledCount: integer('enrolled_count').notNull().default(0),

    // Teacher assignment
    teacherId: uuid('teacher_id').references(() => users.id),

    // Schedule
    scheduleDescription: varchar('schedule_description', { length: 500 }), // "Mon/Wed 10:00-11:00"
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, cancelled

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  table => [
    index('idx_classes_tenant').on(table.tenantId),
    index('idx_classes_teacher').on(table.teacherId),
    index('idx_classes_status').on(table.status),
    index('idx_classes_dates').on(table.startDate, table.endDate),
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
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),

    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id),

    enrollmentDate: date('enrollment_date').notNull().defaultNow(),
    completionDate: date('completion_date'),

    // Flexible duration fields (Migration 0008)
    expectedEndDate: date('expected_end_date'), // Booked end date (can differ from class end_date)
    bookedWeeks: integer('booked_weeks'), // Number of weeks booked (can differ from course standard)
    originalCourseId: uuid('original_course_id'), // Reference to course for standard duration

    status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, dropped

    // Amendment tracking (Migration 0008)
    extensionsCount: integer('extensions_count').default(0), // Number of extensions
    isAmended: boolean('is_amended').default(false), // Whether enrollment has been modified

    // Performance tracking
    attendanceRate: decimal('attendance_rate', { precision: 5, scale: 2 }), // 0.00 to 100.00
    currentGrade: varchar('current_grade', { length: 10 }), // A+, B, etc.

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    // Unique active enrollment per student per class
    uniqueIndex('idx_enrollments_student_class').on(table.studentId, table.classId),
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
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),

    // Amendment details
    amendmentType: varchar('amendment_type', { length: 50 }).notNull(), // extension, reduction, transfer, level_change, cancellation
    amendmentDate: date('amendment_date').notNull().defaultNow(),

    // Previous values (for audit trail)
    previousEndDate: date('previous_end_date'),
    previousWeeks: integer('previous_weeks'),
    previousClassId: uuid('previous_class_id').references(() => classes.id),

    // New values
    newEndDate: date('new_end_date'),
    newWeeks: integer('new_weeks'),
    newClassId: uuid('new_class_id').references(() => classes.id),

    // Financial impact
    feeAdjustment: decimal('fee_adjustment', { precision: 10, scale: 2 }), // Positive for fees, negative for refunds

    // Reason and approval
    reason: text('reason'),
    requestedBy: uuid('requested_by').references(() => users.id),
    approvedBy: uuid('approved_by').references(() => users.id),
    status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, approved, rejected

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_enrollment_amendments_enrollment').on(table.enrollmentId),
    index('idx_enrollment_amendments_tenant').on(table.tenantId),
    index('idx_enrollment_amendments_status').on(table.status),
    index('idx_enrollment_amendments_type').on(table.amendmentType),
    index('idx_enrollment_amendments_date').on(table.amendmentDate),
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
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id),

    sessionDate: date('session_date').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),

    topic: varchar('topic', { length: 500 }),
    notes: text('notes'),

    status: varchar('status', { length: 50 }).notNull().default('scheduled'), // scheduled, completed, cancelled

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [index('idx_sessions_class_date').on(table.classId, table.sessionDate)]
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
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),

    classSessionId: uuid('class_session_id')
      .notNull()
      .references(() => classSessions.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id),

    status: varchar('status', { length: 50 }).notNull(), // present, absent, late, excused
    notes: text('notes'),

    recordedBy: uuid('recorded_by').references(() => users.id), // Teacher/admin who recorded
    recordedAt: timestamp('recorded_at').defaultNow().notNull(),

    // Hash-chain fields (T-052)
    hash: varchar('hash', { length: 64 }), // SHA256(payload || previous_hash)
    previousHash: varchar('previous_hash', { length: 64 }), // Hash of previous record

    // Edit tracking (T-053)
    editedAt: timestamp('edited_at'),
    editedBy: uuid('edited_by').references(() => users.id),
    editCount: integer('edit_count').default(0),
    isWithinEditWindow: varchar('is_within_edit_window', { length: 10 }).default('true'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('idx_attendance_session_student').on(table.classSessionId, table.studentId),
    index('idx_attendance_hash').on(table.hash),
    index('idx_attendance_session_created').on(table.classSessionId, table.createdAt),
  ]
);

/**
 * Assignments Table
 * Homework, quizzes, projects
 */
export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  classId: uuid('class_id')
    .notNull()
    .references(() => classes.id),

  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // homework, quiz, exam, project

  assignedDate: date('assigned_date').notNull(),
  dueDate: date('due_date').notNull(),

  maxScore: integer('max_score'), // e.g., 100 points

  content: jsonb('content'), // Assignment content (questions, etc.)
  attachments: jsonb('attachments'), // File URLs

  status: varchar('status', { length: 50 }).notNull().default('active'), // active, closed

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Submissions Table
 * Student work submissions
 */
export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),

  assignmentId: uuid('assignment_id')
    .notNull()
    .references(() => assignments.id),
  studentId: uuid('student_id')
    .notNull()
    .references(() => users.id),

  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  content: jsonb('content'), // Answers, text responses
  attachments: jsonb('attachments'), // File URLs

  status: varchar('status', { length: 50 }).notNull().default('submitted'), // submitted, graded

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Grades Table
 * Grades for submitted assignments
 */
export const grades = pgTable('grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),

  submissionId: uuid('submission_id')
    .notNull()
    .references(() => submissions.id)
    .unique(),

  score: decimal('score', { precision: 10, scale: 2 }),
  grade: varchar('grade', { length: 10 }), // A+, B, etc.
  feedback: text('feedback'),

  gradedBy: uuid('graded_by').references(() => users.id),
  gradedAt: timestamp('graded_at').defaultNow().notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;

export type EnrollmentAmendment = typeof enrollmentAmendments.$inferSelect;
export type NewEnrollmentAmendment = typeof enrollmentAmendments.$inferInsert;

export type ClassSession = typeof classSessions.$inferSelect;
export type NewClassSession = typeof classSessions.$inferInsert;

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;

export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;
