/**
 * Business Schema: Agencies, Courses, Accommodation, Bookings, Payments
 * Aligned with FRESH_0001 database schema
 * Ireland ESL School Business Logic
 * Date: 2026-01-13
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  decimal,
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './core';
import { students } from './core';
import { users } from './core';

/**
 * Agencies Table
 * Sales source tracking (Direct sales vs Agencies)
 */
export const agencies = pgTable(
  'agencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    contactPerson: varchar('contact_person', { length: 255 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('idx_agencies_tenant_name').on(table.tenantId, table.name),
    index('idx_agencies_status').on(table.tenantId, table.status),
  ]
);

/**
 * Courses Table
 * Course catalog (offerings available for booking)
 */
export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }),
    description: varchar('description'),
    level: varchar('level', { length: 10 }),
    hoursPerWeek: integer('hours_per_week'),
    pricePerWeekEur: decimal('price_per_week_eur', { precision: 10, scale: 2 }),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_courses_tenant').on(table.tenantId),
    index('idx_courses_status').on(table.tenantId, table.status),
    index('idx_courses_level').on(table.level),
  ]
);

/**
 * Accommodation Types Table
 * Accommodation options catalog
 */
export const accommodationTypes = pgTable(
  'accommodation_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description'),
    pricePerWeekEur: decimal('price_per_week_eur', { precision: 10, scale: 2 }),
    depositEur: decimal('deposit_eur', { precision: 10, scale: 2 }),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    uniqueIndex('idx_accommodation_types_tenant_name').on(table.tenantId, table.name),
    index('idx_accommodation_types_status').on(table.tenantId, table.status),
  ]
);

/**
 * Bookings Table
 * Core business transaction - student enrollment with financial tracking
 */
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    bookingNumber: varchar('booking_number', { length: 50 }).notNull().unique(),
    saleDate: date('sale_date').notNull(),

    // Student
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),

    // Booked By (proxy booking support)
    bookedByUserId: uuid('booked_by_user_id').references(() => users.id),
    bookedByName: varchar('booked_by_name', { length: 255 }),
    bookedByEmail: varchar('booked_by_email', { length: 255 }),
    bookedByPhone: varchar('booked_by_phone', { length: 50 }),

    // Source
    agencyId: uuid('agency_id').references(() => agencies.id),

    // Course Details
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    weeks: integer('weeks').notNull(),
    courseStartDate: date('course_start_date').notNull(),
    courseEndDate: date('course_end_date').notNull(),
    placementTestScore: varchar('placement_test_score', { length: 50 }),
    assignedLevel: varchar('assigned_level', { length: 10 }),

    // Accommodation Details (optional)
    accommodationTypeId: uuid('accommodation_type_id').references(() => accommodationTypes.id),
    accommodationStartDate: date('accommodation_start_date'),
    accommodationEndDate: date('accommodation_end_date'),

    // Financial Breakdown (all in EUR)
    courseFeeEur: decimal('course_fee_eur', { precision: 10, scale: 2 }).notNull().default('0'),
    accommodationFeeEur: decimal('accommodation_fee_eur', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    transferFeeEur: decimal('transfer_fee_eur', { precision: 10, scale: 2 }).notNull().default('0'),
    examFeeEur: decimal('exam_fee_eur', { precision: 10, scale: 2 }).notNull().default('0'),
    registrationFeeEur: decimal('registration_fee_eur', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    learnerProtectionFeeEur: decimal('learner_protection_fee_eur', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    medicalInsuranceFeeEur: decimal('medical_insurance_fee_eur', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    totalBookingEur: decimal('total_booking_eur', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),

    // Payment Tracking
    depositPaidEur: decimal('deposit_paid_eur', { precision: 10, scale: 2 }).notNull().default('0'),
    totalPaidEur: decimal('total_paid_eur', { precision: 10, scale: 2 }).notNull().default('0'),
    // totalDueEur is a GENERATED column in database

    // Status
    status: varchar('status', { length: 50 }).notNull().default('pending'),

    // Metadata
    notes: varchar('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    cancelledAt: timestamp('cancelled_at'),
    cancelledBy: uuid('cancelled_by').references(() => users.id),
    cancellationReason: varchar('cancellation_reason'),
  },
  table => [
    uniqueIndex('idx_bookings_number').on(table.bookingNumber),
    index('idx_bookings_tenant').on(table.tenantId),
    index('idx_bookings_student').on(table.studentId),
    index('idx_bookings_sale_date').on(table.tenantId, table.saleDate),
    index('idx_bookings_status').on(table.tenantId, table.status),
    index('idx_bookings_dates').on(table.courseStartDate, table.courseEndDate),
  ]
);

/**
 * Payments Table
 * Payment history against bookings
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    paymentDate: date('payment_date').notNull(),
    amountEur: decimal('amount_eur', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
    referenceNumber: varchar('reference_number', { length: 255 }),
    receivedBy: uuid('received_by').references(() => users.id),
    notes: varchar('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    index('idx_payments_booking').on(table.bookingId),
    index('idx_payments_tenant_date').on(table.tenantId, table.paymentDate),
    index('idx_payments_date').on(table.paymentDate),
  ]
);

// Type exports
export type Agency = typeof agencies.$inferSelect;
export type NewAgency = typeof agencies.$inferInsert;

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;

export type AccommodationType = typeof accommodationTypes.$inferSelect;
export type NewAccommodationType = typeof accommodationTypes.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

// Combined types
export type BookingWithDetails = Booking & {
  student?: unknown; // Will be properly typed when needed
  course?: Course;
  accommodationType?: AccommodationType;
  payments?: Payment[];
  agency?: Agency;
};
